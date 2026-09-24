import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME } from '../src/game.ts';
const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const c = new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const g = new Game(c, { ...DEFAULT_GAME, baselineReps: 1 });
// compartment valence from DAN→MBON input: PPL1-dominated → approach (+), PAM-dominated → avoid (−)
const mbon = c.ids('MBON'), dan = c.ids('DAN'); const [m0] = c.range('MBON');
const pam = new Float32Array(mbon.length), ppl1 = new Float32Array(mbon.length);
for (const d of dan) for (let k = c.indptr[d]; k < c.indptr[d + 1]; k++) { const j = c.indices[k] - m0; if (j >= 0 && j < mbon.length) { if (c.typeName[d].startsWith('PAM')) pam[j] += c.weights[k]; else if (c.typeName[d].startsWith('PPL1')) ppl1[j] += c.weights[k]; } }
const val = mbon.map((_, j) => (pam[j] + ppl1[j] < 20 ? 0 : ppl1[j] > pam[j] ? 1 : -1));
console.log('MBON valence (+ PPL1/approach, − PAM/avoid, 0 unassigned):', mbon.map((i, j) => `${c.typeName[i]}${val[j] > 0 ? '+' : val[j] < 0 ? '−' : '0'}`).join(' '));
const f = g.flies[0];
for (let o = 1; o < 9; o++) {
  const sim = f.sim; sim.resetState(); for (let t = 0; t < 600; t++) sim.step(g.odors[o], null, false);
  const resp = mbon.map((i, j) => [c.typeName[i], sim.rateCount[i], val[j]] as const).filter((x) => x[1] >= 3);
  const ap = resp.filter((x) => x[2] > 0), av = resp.filter((x) => x[2] < 0);
  console.log(`odor F${o + 1}: approach-responsive ${ap.length} [${ap.map((x) => `${x[0]}:${x[1]}`).join(' ')}]  avoid-responsive ${av.length} [${av.map((x) => `${x[0]}:${x[1]}`).join(' ')}]`);
}
