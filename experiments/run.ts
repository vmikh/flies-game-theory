// Sweep runner (appends one JSON line per game). Usage from the repo root: node --experimental-transform-types experiments/run.ts <config> <seedFrom> <seedTo> <rounds> <outFile>
import { appendFileSync } from 'node:fs';
import { loadCircuit } from '../scripts/node_flies.ts';
import { Game, DEFAULT_GAME, type GameParams } from '../src/game.ts';
import { LocalFly, type Lesion } from '../src/backend.ts';
import { shuffleCircuit } from '../src/shuffle.ts';
import { mulberry32 } from '../src/sim.ts';

const [cfgName, sFrom, sTo, rds, out] = process.argv.slice(2);
const rounds = Number(rds);
const real = loadCircuit();

type Cfg = Partial<GameParams> & { shuffle?: boolean; tournament?: boolean; allLesion?: Lesion };
const P = (T: number, R: number, Pp: number, S: number) => ({ T, R, P: Pp, S });
const CFGS: Record<string, Cfg> = {
  default: {},
  gossip0: { observeGain: 0 },
  gossip1: { observeGain: 1 },
  forget0: { forgetPerRound: 0 },
  forget02: { forgetPerRound: 0.2 },
  trustPlus: { trustBias: 0.5 },
  trustMinus: { trustBias: -0.5 },
  generous: { payoff: P(5, 4, 1, 0) },
  harsh: { payoff: P(6, 3, 1, -1) },
  pureMemory: { forgetPerRound: 0, observeGain: 0 },
  friendlyWorld: { payoff: P(5, 4, 1, 0), trustBias: 0.5 },
  hostileWorld: { payoff: P(6, 3, 1, -1), trustBias: -0.5 },
  tournament: { tournament: true },
  nullNoDAN: { allLesion: 'noDAN' },
  shuffled: { shuffle: true },
};
const cfg = CFGS[cfgName]; if (!cfg) throw new Error('unknown config ' + cfgName);

for (let seed = Number(sFrom); seed <= Number(sTo); seed++) {
  const t0 = performance.now();
  let lesions: Lesion[] = [];
  if (cfg.tournament) { // random slot positions per seed so pairing order / odour identity are not confounded with mutation
    const r = mulberry32(seed * 7919 + 13); const L: Lesion[] = ['none', 'none', 'none', 'noPPL1', 'noPAM', 'noDAN', 'halfKC', 'noAPL'];
    lesions = L.map((l) => [l, r()] as const).sort((a, b) => a[1] - b[1]).map(([l]) => l);
  } else if (cfg.allLesion) lesions = Array(8).fill(cfg.allLesion);
  const { shuffle, tournament, allLesion, ...over } = cfg;
  const p: GameParams = { ...DEFAULT_GAME, ...over, lesions, seed, sim: { ...DEFAULT_GAME.sim } };
  // UI parity: Game (odours, MBON valence) always uses the real circuit; only the brains get the shuffled one (seed = game seed)
  const brainCircuit = shuffle ? shuffleCircuit(real, 'class', seed) : real;
  const g = await Game.create(real, p, (_id, s, lesion) => new LocalFly(brainCircuit, p.sim, s, lesion));
  const perRound: { c: number; n: number; alive: number }[] = [];
  const hist: { a: number; b: number; ca: boolean; cb: boolean; round: number; pcA: number; pcB: number; sA: number; sB: number }[] = [];
  while (g.round < rounds && !g.over) {
    const recs = await g.playRound();
    perRound.push({ c: recs.reduce((n, r) => n + Number(r.ca) + Number(r.cb), 0), n: 2 * recs.length, alive: g.aliveCount });
    for (const r of recs) hist.push({ a: r.a, b: r.b, ca: r.ca, cb: r.cb, round: r.round, pcA: r.pcA, pcB: r.pcB, sA: r.scoreA, sB: r.scoreB });
  }
  const s = g.snapshot();
  // directed history: my action vs opponent's previous action toward me (direct reciprocity), and vs gossip-visible reputation
  const coopTo = Array.from({ length: 8 }, () => Array(8).fill(0)), gamesTo = coopTo.map((r) => r.slice());
  for (const h of hist) { gamesTo[h.b][h.a]++; gamesTo[h.a][h.b]++; if (h.ca) coopTo[h.b][h.a]++; if (h.cb) coopTo[h.a][h.b]++; }
  // reputation: opponent's overall cooperation rate in all games BEFORE this one (what gossip could convey)
  const oppCoopSoFar = Array(8).fill(0), oppGamesSoFar = Array(8).fill(0); const repPairs: [number, number][] = [];
  let lastRound = -1; let buf: typeof hist = [];
  const flush = () => { for (const h of buf) { oppGamesSoFar[h.a]++; oppGamesSoFar[h.b]++; if (h.ca) oppCoopSoFar[h.a]++; if (h.cb) oppCoopSoFar[h.b]++; } buf = []; };
  for (const h of hist) {
    if (h.round !== lastRound) { flush(); lastRound = h.round; }
    if (oppGamesSoFar[h.b] >= 3) repPairs.push([oppCoopSoFar[h.b] / oppGamesSoFar[h.b], h.ca ? 1 : 0]);
    if (oppGamesSoFar[h.a] >= 3) repPairs.push([oppCoopSoFar[h.a] / oppGamesSoFar[h.a], h.cb ? 1 : 0]);
    buf.push(h);
  }
  const corr = (xy: [number, number][]) => { if (xy.length < 5) return null; const n = xy.length; const mx = xy.reduce((a, v) => a + v[0], 0) / n, my = xy.reduce((a, v) => a + v[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of xy) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; } return sxx * syy > 0 ? sxy / Math.sqrt(sxx * syy) : null; };
  // trust tracking: final brain score of i toward j vs j's actual coop rate toward i (pairs with >=2 games)
  const tt: [number, number][] = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (i !== j && gamesTo[i][j] >= 2) tt.push([coopTo[i][j] / gamesTo[i][j], s.trust[i][j]]);
  const alivePl = g.flies.filter((f) => f.alive).flatMap((f) => Array.from((f.be as LocalFly).sim.plastic));
  const scores = hist.flatMap((h) => [h.sA, h.sB]);
  const row = {
    cfg: cfgName, seed, rounds: s.round, games: s.games, alive: g.aliveCount, coop: s.coopRate,
    perRound, repCorr: corr(repPairs), trustCorr: corr(tt),
    meanAbsScore: scores.reduce((a, b) => a + Math.abs(b), 0) / Math.max(1, scores.length),
    meanPc: hist.reduce((a, h) => a + h.pcA + h.pcB, 0) / Math.max(1, 2 * hist.length),
    plasticMean: alivePl.length ? alivePl.reduce((a, b) => a + b, 0) / alivePl.length : null,
    plasticFloor: alivePl.length ? alivePl.filter((x) => x <= 0.05001).length / alivePl.length : null,
    wealth: s.flies.reduce((a, f) => a + f.money, 0),
    flies: s.flies.map((f, i) => ({ id: f.id, lesion: f.lesion, money: f.money, alive: f.alive, elim: f.eliminatedRound, games: f.games, coops: f.coops, betrayed: f.betrayed, label: f.strategy.label, st: g.flies[i].strat })),
    sec: (performance.now() - t0) / 1000,
  };
  appendFileSync(out, JSON.stringify(row) + '\n');
  g.dispose();
}
