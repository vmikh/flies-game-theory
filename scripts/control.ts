// Control experiment: real wiring vs class-preserving shuffle vs full shuffle.
// node --experimental-transform-types scripts/control.ts [seeds] [rounds]
import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME } from '../src/game.ts';
import { shuffleCircuit, type ShuffleMode } from '../src/shuffle.ts';
const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const real = new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const seeds = Number(process.argv[2] ?? 3), rounds = Number(process.argv[3] ?? 30);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length, sd = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const fmt = (a: number[]) => `${mean(a).toFixed(2)}±${sd(a).toFixed(2)}`;

for (const mode of ['none', 'class', 'full'] as ShuffleMode[]) {
  const R = { kcActive: [] as number[], overlap: [] as number[], selfDrop: [] as number[], otherDrop: [] as number[], selfGain: [] as number[], otherGain: [] as number[], coop: [] as number[], trustTrack: [] as number[], trustSpread: [] as number[] };
  for (let s = 1; s <= seeds; s++) {
    const c = shuffleCircuit(real, mode, 100 + s);
    const g = new Game(c, { ...DEFAULT_GAME, seed: s });
    const f = g.flies[0]; const kc = c.range('Kenyon_Cell'); const codes: Uint8Array[] = [];
    // 1. odour coding
    for (let o = 1; o < 9; o++) { const sim = f.sim; sim.resetState(); for (let t = 0; t < 300; t++) sim.step(g.odors[o], null, false);
      const code = new Uint8Array(kc[1] - kc[0]); let a = 0; for (let i = kc[0]; i < kc[1]; i++) if (sim.rateCount[i]) { code[i - kc[0]] = 1; a++; } codes.push(code); R.kcActive.push(100 * a / code.length); }
    const ov: number[] = []; for (let a = 0; a < codes.length; a++) for (let b = a + 1; b < codes.length; b++) { let both = 0, na = 0, nb = 0; for (let i = 0; i < codes[a].length; i++) { both += codes[a][i] & codes[b][i]; na += codes[a][i]; nb += codes[b][i]; } ov.push(both / Math.max(1, Math.min(na, nb))); }
    R.overlap.push(mean(ov));
    // 2. learning selectivity: punish odour 1, reward odour 2; Δscore on self vs others
    const before = [1, 2, 3, 4, 5].map((o) => g.score(f, o));
    for (let r = 0; r < 3; r++) g.teach(f, 1, -1, DEFAULT_GAME.learnMs);
    const afterP = [1, 2, 3, 4, 5].map((o) => g.score(f, o));
    R.selfDrop.push(afterP[0] - before[0]); R.otherDrop.push(mean(afterP.slice(1).map((v, i) => v - before[i + 1])));
    for (let r = 0; r < 3; r++) g.teach(f, 2, 1, DEFAULT_GAME.learnMs);
    const afterR = [1, 2, 3, 4, 5].map((o) => g.score(f, o));
    R.selfGain.push(afterR[1] - afterP[1]); R.otherGain.push(mean([0, 2, 3, 4].map((i) => afterR[i] - afterP[i])));
    // 3. game: does trust track the opponent's actual behaviour toward me?
    const g2 = new Game(c, { ...DEFAULT_GAME, seed: s }); const coopTo: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0)), gamesTo = coopTo.map((r) => r.slice());
    for (let r = 0; r < rounds; r++) for (const x of g2.playRound()) { gamesTo[x.b][x.a]++; gamesTo[x.a][x.b]++; if (x.ca) coopTo[x.b][x.a]++; if (x.cb) coopTo[x.a][x.b]++; }
    const snap = g2.snapshot(); R.coop.push(snap.coopRate);
    const xs: number[] = [], ys: number[] = []; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (i !== j && gamesTo[i][j] >= 2) { xs.push(coopTo[i][j] / gamesTo[i][j]); ys.push(snap.trust[i][j]); }
    const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    R.trustTrack.push(sxy / Math.sqrt(sxx * syy + 1e-9)); R.trustSpread.push(sd(ys));
    process.stderr.write(`${mode} seed ${s} done\n`);
  }
  console.log(`\n=== wiring: ${mode}  (${seeds} seeds, ${rounds} rounds)`);
  console.log(`KC active per odour      ${fmt(R.kcActive)} %      odour code overlap ${fmt(R.overlap)}`);
  console.log(`punish odour: Δ self     ${fmt(R.selfDrop)}   Δ others ${fmt(R.otherDrop)}`);
  console.log(`reward odour: Δ self     ${fmt(R.selfGain)}   Δ others ${fmt(R.otherGain)}`);
  console.log(`game: coop rate          ${fmt(R.coop)}   corr(trust, opponent's coop toward me) ${fmt(R.trustTrack)}   trust spread ${fmt(R.trustSpread)}`);
}
