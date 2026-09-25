// Reproducible behavioural audit. Usage: node --experimental-transform-types scripts/audit_experiment.ts [rounds] [seeds] [scenario-name]
import { loadCircuit, makeGame } from './node_flies.ts';
import { LocalFly } from '../src/backend.ts';
import type { GameParams } from '../src/game.ts';

const circuit = loadCircuit();
const rounds = Number(process.argv[2] ?? 30);
const seeds = Number(process.argv[3] ?? 3);
const scenarios: ({ name: string } & Partial<GameParams>)[] = [
  { name: 'default', forgetPerRound: 0.05, observeGain: 0.1, trustBias: 0 },
  { name: 'permanent-memory + strong-gossip', forgetPerRound: 0, observeGain: 1, trustBias: 0 },
  { name: 'permanent-memory + own-experience', forgetPerRound: 0, observeGain: 0, trustBias: 0 },
  { name: 'permanent-memory + own-experience + wary', forgetPerRound: 0, observeGain: 0, trustBias: -0.5 },
  { name: 'permanent-memory + own-experience + very-wary', forgetPerRound: 0, observeGain: 0, trustBias: -1.5 },
  { name: 'no-learning-control', forgetPerRound: 0, observeGain: 0, trustBias: 0, lesions: Array(8).fill('noDAN') },
].filter((p) => !process.argv[4] || p.name === process.argv[4]);

for (const p of scenarios) {
  const rows = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const g = await makeGame(circuit, { ...p, seed });
    let early = 0, late = 0, earlyN = 0, lateN = 0;
    while (g.round < rounds && !g.over) {
      const recs = await g.playRound();
      const c = recs.reduce((n, r) => n + Number(r.ca) + Number(r.cb), 0);
      if (g.round <= 7) { early += c; earlyN += 2 * recs.length; }
      if (g.round > rounds - 10) { late += c; lateN += 2 * recs.length; }
    }
    const s = g.snapshot();
    const decisions = g.log.flatMap((r) => [r.pcA, r.pcB]);
    const scores = g.log.flatMap((r) => [r.scoreA, r.scoreB]);
    const weights = g.flies.filter((f) => f.alive).map((f) => (f.be as LocalFly).sim.plastic);
    const plastic = weights.flatMap((w) => Array.from(w));
    rows.push({ seed, rounds: s.round, alive: g.aliveCount, games: s.games,
      coop: s.coopRate, recent: s.recentCoopRate,
      early: earlyN ? early / earlyN : null, late: lateN ? late / lateN : null,
      expected: decisions.reduce((a, b) => a + b, 0) / decisions.length,
      meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      meanAbsScore: scores.reduce((a, b) => a + Math.abs(b), 0) / scores.length,
      plastic: plastic.reduce((a, b) => a + b, 0) / plastic.length,
      floor: plastic.filter((x) => x <= 0.05001).length / plastic.length });
    console.log(JSON.stringify({ scenario: p.name, ...rows.at(-1) }));
    g.dispose();
  }
  const mean = (key: keyof typeof rows[number]) => {
    const values = rows.map((row) => row[key]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  console.log(JSON.stringify({ scenario: p.name, meanCoop: mean('coop'), meanRecent: mean('recent'), meanEarly: mean('early'), meanLate: mean('late'), meanAlive: mean('alive'), meanExpected: mean('expected'), meanScore: mean('meanScore'), meanAbsScore: mean('meanAbsScore'), meanPlastic: mean('plastic'), meanFloor: mean('floor') }));
}
