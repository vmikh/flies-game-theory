/** A fly's brain as seen by the game: runs in-thread (LocalFly) or in a Web Worker (RemoteFly). */
import type { Circuit } from './circuit.ts';
import { MBSim, type SimParams } from './sim.ts';

export type DanPop = 'PAM' | 'PPL1';
/** Spike counts of the readout neurons plus of every neuron in the circuit (for visualisation). */
export interface Counts { c: Float32Array; all: Uint16Array; frames?: Frames }
/** Activity movie: `bins` frames of `n` uint8 spike counts each, `binMs` ms per frame. */
export interface Frames { data: Uint8Array; bins: number; n: number; binMs: number }
export const FRAME_MS = 20;

export interface FlyBackend {
  /** Present odour for `ms`, return spike counts of the given neuron ids. */
  counts(odor: number[], ms: number, ids: number[], frames?: boolean): Promise<Counts>;
  /** Present odour with dopamine population driven at rate × danRate; learning on. Optionally returns an activity movie. */
  teach(odor: number[], dan: DanPop, rateScale: number, ms: number, frames?: boolean): Promise<Frames | null>;
  forget(rate: number): Promise<void>;
  getPlastic(): Promise<Float32Array>;
  /** Copy plastic factors in, each multiplied by a random factor in [1−jitter, 1+jitter]. */
  setPlastic(p: Float32Array, jitter: number): Promise<void>;
  dispose(): void;
}

export class LocalFly implements FlyBackend {
  readonly sim: MBSim; private PAM: number[]; private PPL1: number[]; private rng = Math.random;
  constructor(c: Circuit, params: SimParams, seed: number) { this.sim = new MBSim(c, params, seed); this.PAM = c.idsByPrefix('DAN', 'PAM'); this.PPL1 = c.idsByPrefix('DAN', 'PPL1'); }
  private rec(ms: number, want: boolean | undefined): { fr: Frames | null; tick: (t: number) => void } {
    if (!want) return { fr: null, tick: () => {} };
    const s = this.sim; const bins = Math.ceil(ms / FRAME_MS); const fr: Frames = { data: new Uint8Array(bins * s.n), bins, n: s.n, binMs: FRAME_MS };
    return { fr, tick: (t) => { const b = Math.floor(t / FRAME_MS); const row = b * s.n; for (let i = 0; i < s.n; i++) if (s.fired[i]) fr.data[row + i]++; } };
  }
  async counts(odor: number[], ms: number, ids: number[], frames?: boolean): Promise<Counts> {
    const s = this.sim; s.resetState(); const { fr, tick } = this.rec(ms, frames);
    for (let t = 0; t < ms; t++) { s.step(odor, null, false); tick(t); }
    return { c: Float32Array.from(ids, (i) => s.rateCount[i]), all: Uint16Array.from(s.rateCount), frames: fr ?? undefined };
  }
  async teach(odor: number[], dan: DanPop, rateScale: number, ms: number, frames?: boolean) {
    const s = this.sim; s.resetState(); const pop = dan === 'PAM' ? this.PAM : this.PPL1; const r0 = s.p.danRate; (s.p as SimParams).danRate = r0 * rateScale;
    const { fr, tick } = this.rec(ms, frames);
    for (let t = 0; t < ms; t++) { s.step(odor, t > 40 ? pop : null, true); tick(t); }
    (s.p as SimParams).danRate = r0; return fr;
  }
  async forget(rate: number) { this.sim.forget(rate); }
  async getPlastic() { return Float32Array.from(this.sim.plastic); }
  async setPlastic(p: Float32Array, jitter: number) { const pl = this.sim.plastic; const mn = this.sim.p.plasticMin; for (let e = 0; e < pl.length; e++) pl[e] = Math.min(1, Math.max(mn, p[e] * (1 + jitter * (2 * this.rng() - 1)))); }
  dispose() {}
}
