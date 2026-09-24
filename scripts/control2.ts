// Class-shuffled wiring with recalibrated PN->KC gain so KC sparsity matches the real circuit.
import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME } from '../src/game.ts';
import { shuffleCircuit } from '../src/shuffle.ts';
const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const real = new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
for (const pnKc of [1.0, 1.4, 1.8]) for (const mode of ['class'] as const) {
  const kcA: number[] = [], ovs: number[] = [], sd: number[] = [], od: number[] = [], sg: number[] = [], og: number[] = [];
  for (let s = 1; s <= 3; s++) {
    const c = shuffleCircuit(real, mode, 100 + s); const g = new Game(c, { ...DEFAULT_GAME, seed: s, sim: { ...DEFAULT_GAME.sim, gain: { ...DEFAULT_GAME.sim.gain, pnKc } } });
    const f = g.flies[0]; const kc = c.range('Kenyon_Cell'); const codes: Uint8Array[] = [];
    for (let o = 1; o < 9; o++) { const sim = f.sim; sim.resetState(); for (let t = 0; t < 300; t++) sim.step(g.odors[o], null, false);
      const code = new Uint8Array(kc[1] - kc[0]); let a = 0; for (let i = kc[0]; i < kc[1]; i++) if (sim.rateCount[i]) { code[i - kc[0]] = 1; a++; } codes.push(code); kcA.push(100 * a / code.length); }
    for (let a = 0; a < codes.length; a++) for (let b = a + 1; b < codes.length; b++) { let both = 0, na = 0, nb = 0; for (let i = 0; i < codes[a].length; i++) { both += codes[a][i] & codes[b][i]; na += codes[a][i]; nb += codes[b][i]; } ovs.push(both / Math.max(1, Math.min(na, nb))); }
    const before = [1, 2, 3, 4, 5].map((o) => g.score(f, o)); for (let r = 0; r < 3; r++) g.teach(f, 1, -1, DEFAULT_GAME.learnMs);
    const aP = [1, 2, 3, 4, 5].map((o) => g.score(f, o)); sd.push(aP[0] - before[0]); od.push(mean(aP.slice(1).map((v, i) => v - before[i + 1])));
    for (let r = 0; r < 3; r++) g.teach(f, 2, 1, DEFAULT_GAME.learnMs);
    const aR = [1, 2, 3, 4, 5].map((o) => g.score(f, o)); sg.push(aR[1] - aP[1]); og.push(mean([0, 2, 3, 4].map((i) => aR[i] - aP[i])));
  }
  console.log(`${mode} pnKc=${pnKc}: KC active ${mean(kcA).toFixed(1)}%  overlap ${mean(ovs).toFixed(2)}  punish Δself ${mean(sd).toFixed(2)} Δothers ${mean(od).toFixed(2)}  reward Δself ${mean(sg).toFixed(2)} Δothers ${mean(og).toFixed(2)}`);
}
