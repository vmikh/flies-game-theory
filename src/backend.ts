/** A fly's brain as seen by the game: runs in-thread (LocalFly) or in a Web Worker (RemoteFly). */
import type { Circuit } from './circuit.ts';
import { MBSim, mulberry32, type SimParams } from './sim.ts';

export type DanPop = 'PAM' | 'PPL1';
export type Lesion = 'none' | 'noPPL1' | 'noPAM' | 'noDAN' | 'halfKC' | 'noAPL';
export const LESIONS: { id: Lesion; label: string; hint: string }[] = [
  { id: 'none', label: 'intact', hint: '' },
  { id: 'noPPL1', label: 'no PPL1', hint: 'punishment dopamine silenced: cannot learn to avoid' },
  { id: 'noPAM', label: 'no PAM', hint: 'reward dopamine silenced: cannot learn to approach' },
  { id: 'noDAN', label: 'no dopamine', hint: 'no learning at all' },
  { id: 'halfKC', label: 'half KCs', hint: 'half of the Kenyon cells silenced: coarser odour memory' },
  { id: 'noAPL', label: 'no APL', hint: 'inhibitory APL silenced: dense, overlapping odour codes' },
];
export function lesionIds(c: Circuit, l: Lesion, seed = 0): number[] {
  if (l === 'noPPL1') return c.idsByPrefix('DAN', 'PPL1'); if (l === 'noPAM') return c.idsByPrefix('DAN', 'PAM'); if (l === 'noDAN') return c.ids('DAN');
  if (l === 'noAPL') return c.ids('APL');
  if (l === 'halfKC') { const r = mulberry32(seed + 99); return c.ids('Kenyon_Cell').filter(() => r() < 0.5); }
  return [];
}
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
  constructor(c: Circuit, params: SimParams, seed: number, lesion: Lesion = 'none') { this.sim = new MBSim(c, params, seed); this.PAM = c.idsByPrefix('DAN', 'PAM'); this.PPL1 = c.idsByPrefix('DAN', 'PPL1'); this.sim.silence(lesionIds(c, lesion, seed)); }
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
