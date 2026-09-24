// Node smoke test for src/sim.ts: same protocol as scripts/proto2.py. Run: node scripts/test_sim.ts [pnKc]
import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { MBSim, DEFAULT_PARAMS, mulberry32 } from '../src/sim.ts';

const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const c = new Circuit(meta, buf);
const pnKc = Number(process.argv[2] ?? 2.5); const kcMbon = Number(process.argv[3] ?? 6);
const sim = new MBSim(c, { ...DEFAULT_PARAMS, gain: { ...DEFAULT_PARAMS.gain, pnKc, kcMbon } }, 1);
const rng = mulberry32(7);
const pn = c.ids('ALPN').filter((i) => c.sign[i] > 0 && c.typeName[i].includes('_') && !c.typeName[i].startsWith('M_'));
const glom = new Map<string, number[]>(); for (const i of pn) { const g = c.typeName[i].split('_')[0]; (glom.get(g) ?? glom.set(g, []).get(g)!).push(i); }
const gl = [...glom.keys()].sort();
const makeOdor = () => { const pick = gl.map((g) => [g, rng()] as const).sort((a, b) => a[1] - b[1]).slice(0, Math.floor(0.25 * gl.length)); return pick.flatMap(([g]) => glom.get(g)!).sort((a, b) => a - b); };
const mbon = c.ids('MBON'); const PAM = c.idsByPrefix('DAN', 'PAM'), PPL1 = c.idsByPrefix('DAN', 'PPL1');
const kc = c.range('Kenyon_Cell');
// Canonical valence MBONs (Aso et al. 2014), matching the DAN→MBON compartment map in this connectome.
const APPROACH_T = new Set(['MBON11', 'MBON12', 'MBON14']);                 // PPL1 compartments
const AVOID_T = new Set(['MBON01', 'MBON02', 'MBON03', 'MBON05', 'MBON06']); // PAM compartments
const approach = mbon.filter((i) => APPROACH_T.has(c.typeName[i])), avoid = mbon.filter((i) => AVOID_T.has(c.typeName[i]));
function run(odor: number[], dan: number[] | null, learn: boolean, T = 400) {
  sim.resetState(); const spikes = new Uint32Array(c.n);
  for (let t = 0; t < T; t++) { sim.step(odor, dan && t > 50 ? dan : null, learn); for (let i = 0; i < c.n; i++) spikes[i] += sim.fired[i]; }
  return spikes;
}
const sum = (s: Uint32Array, ids: number[]) => ids.reduce((a, i) => a + s[i], 0);
const readout = (s: Uint32Array) => { const ap = sum(s, approach) / approach.length, av = sum(s, avoid) / avoid.length; return `ap ${ap.toFixed(2)} av ${av.toFixed(2)} score ${(ap - av).toFixed(2)}  ap ${approach.map((i) => s[i])} av ${avoid.map((i) => s[i])}`; };
const odors = [makeOdor(), makeOdor(), makeOdor()]; const codes: Uint8Array[] = [];
const t0 = performance.now();
for (let k = 0; k < 3; k++) { const s = run(odors[k], null, false); const code = new Uint8Array(c.n); let act = 0; for (let i = kc[0]; i < kc[1]; i++) if (s[i]) { code[i] = 1; act++; } codes.push(code);
  console.log(`odor ${k}: KC active ${(100 * act / (kc[1] - kc[0])).toFixed(1)}%  MBON ${sum(s, mbon)}  PAM ${sum(s, PAM)} PPL1 ${sum(s, PPL1)}  readout ${readout(s)}`); }
console.log(`time per 400 ms run: ${((performance.now() - t0) / 3).toFixed(0)} ms`);
console.log('--- punish odor 0'); for (let r = 0; r < 3; r++) run(odors[0], PPL1, true);
for (let k = 0; k < 3; k++) console.log(`  odor ${k}: ${readout(run(odors[k], null, false))}`);
console.log('--- reward odor 1'); for (let r = 0; r < 3; r++) run(odors[1], PAM, true);
for (let k = 0; k < 3; k++) console.log(`  odor ${k}: ${readout(run(odors[k], null, false))}`);
