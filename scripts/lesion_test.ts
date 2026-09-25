// Headless: one lesioned fly among intact ones. node ... scripts/lesion_test.ts <lesion> [rounds]
import { loadCircuit, makeGame } from './node_flies.ts';
import type { Lesion } from '../src/backend.ts';
const c = loadCircuit(); const lesion = (process.argv[2] ?? 'noPPL1') as Lesion, rounds = Number(process.argv[3] ?? 28);
const res: string[] = [];
for (const s of [1, 2, 3]) {
  const g = await makeGame(c, { seed: s, lesions: [lesion] }); for (let r = 0; r < rounds; r++) await g.playRound();
  const f = g.snapshot().flies; const L = f[0]; const others = f.slice(1);
  const pct = (v: number | null) => (v === null ? '?' : Math.round(100 * v) + '%');
  res.push(`seed ${s}: F1[${lesion}] $${L.money.toFixed(0)} coop ${Math.round(100 * L.coops / L.games)}% ${L.strategy.label} (afterC ${pct(L.strategy.reciprocity)} afterD ${pct(L.strategy.forgiveness)}) | intact avg $${(others.reduce((a, x) => a + x.money, 0) / others.length).toFixed(0)} coop ${Math.round(100 * others.reduce((a, x) => a + x.coops / x.games, 0) / others.length)}%`);
}
console.log(res.join('\n'));
