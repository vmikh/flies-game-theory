// Per-MBON naive spike counts (600 ms) for each identity odour, one fly. node ... scripts/diag_mbon_counts.ts [kcMbonAvoid]
import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME } from '../src/game.ts';
const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const c = new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const kcMbonAvoid = Number(process.argv[2] ?? 1);
const g = new Game(c, { ...DEFAULT_GAME, nFlies: 9, baselineReps: 1, sim: { ...DEFAULT_GAME.sim, gain: { ...DEFAULT_GAME.sim.gain, kcMbonAvoid } } });
const f = g.flies[0]; const ids = [...g.approach, ...g.avoid];
console.log(`kcMbonAvoid=${kcMbonAvoid}   columns: ` + ids.map((i) => c.typeName[i]).join(' '));
for (let o = 1; o < 9; o++) {
  const sim = f.sim; sim.resetState(); for (let t = 0; t < 600; t++) sim.step(g.odors[o], null, false);
  console.log(`odor F${o + 1}: ` + ids.map((i) => String(sim.rateCount[i]).padStart(6)).join(''));
}
