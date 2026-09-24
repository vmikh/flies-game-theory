/** A fly's brain as seen by the game: runs in-thread (LocalFly) or in a Web Worker (RemoteFly). */
import type { Circuit } from './circuit.ts';
import { MBSim, type SimParams } from './sim.ts';

export type DanPop = 'PAM' | 'PPL1';

export interface FlyBackend {
  /** Present odour for `ms`, return spike counts of the given neuron ids. */
  counts(odor: number[], ms: number, ids: number[]): Promise<Float32Array>;
  /** Present odour with dopamine population driven at rate × danRate; learning on. */
  teach(odor: number[], dan: DanPop, rateScale: number, ms: number): Promise<void>;
  forget(rate: number): Promise<void>;
  getPlastic(): Promise<Float32Array>;
  /** Copy plastic factors in, each multiplied by a random factor in [1−jitter, 1+jitter]. */
  setPlastic(p: Float32Array, jitter: number): Promise<void>;
  dispose(): void;
}

export class LocalFly implements FlyBackend {
  readonly sim: MBSim; private PAM: number[]; private PPL1: number[]; private rng = Math.random;
  constructor(c: Circuit, params: SimParams, seed: number) { this.sim = new MBSim(c, params, seed); this.PAM = c.idsByPrefix('DAN', 'PAM'); this.PPL1 = c.idsByPrefix('DAN', 'PPL1'); }
  async counts(odor: number[], ms: number, ids: number[]) { const s = this.sim; s.resetState(); for (let t = 0; t < ms; t++) s.step(odor, null, false); return Float32Array.from(ids, (i) => s.rateCount[i]); }
  async teach(odor: number[], dan: DanPop, rateScale: number, ms: number) {
    const s = this.sim; s.resetState(); const pop = dan === 'PAM' ? this.PAM : this.PPL1; const r0 = s.p.danRate; (s.p as SimParams).danRate = r0 * rateScale;
    for (let t = 0; t < ms; t++) s.step(odor, t > 40 ? pop : null, true);
    (s.p as SimParams).danRate = r0;
  }
  async forget(rate: number) { this.sim.forget(rate); }
  async getPlastic() { return Float32Array.from(this.sim.plastic); }
  async setPlastic(p: Float32Array, jitter: number) { const pl = this.sim.plastic; const mn = this.sim.p.plasticMin; for (let e = 0; e < pl.length; e++) pl[e] = Math.min(1, Math.max(mn, p[e] * (1 + jitter * (2 * this.rng() - 1)))); }
  dispose() {}
}
