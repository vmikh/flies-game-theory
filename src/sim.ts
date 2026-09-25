/**
 * Leaky integrate-and-fire simulation of one mushroom body circuit with dopamine-gated
 * depression of Kenyon cell → MBON synapses. 1 ms Euler steps, current-based synapses,
 * CSR adjacency (pre → post). Mirrors scripts/proto_lif.py.
 */
import type { Circuit } from './circuit.ts';

export interface SimParams {
  vRest: number; vTh: number; vReset: number; tauM: number; tauSyn: number; refrac: number;
  wScale: number;            // mV per synapse (Shiu et al. 2024: 0.275)
  gain: { pnKc: number; aplKc: number; kcKc: number; pnPn: number; kcMbon: number; kcMbonAvoid: number };
  avoidTypes: string[];      // MBON types whose KC input gets the extra kcMbonAvoid gain
  normalisePnKc: boolean;    // equalise total PN drive per KC
  normaliseKcMbon: boolean;  // equalise total KC drive per MBON
  odorRate: number; odorKick: number;   // Poisson events/ms and mV per event for driven PNs
  danRate: number; danKick: number;
  eta: number;               // plasticity rate per (KC trace × DAN spike)
  traceTau: number;          // KC eligibility trace (ms)
  plasticMin: number;
}

export const DEFAULT_PARAMS: SimParams = {
  vRest: -52, vTh: -45, vReset: -52, tauM: 20, tauSyn: 5, refrac: 2,
  wScale: 0.275,
  gain: { pnKc: 2.5, aplKc: 1.0, kcKc: 0.0, pnPn: 0.0, kcMbon: 6.0, kcMbonAvoid: 1.0 },
  avoidTypes: ['MBON01', 'MBON02', 'MBON03', 'MBON05', 'MBON06'],
  normalisePnKc: true,
  normaliseKcMbon: true,
  odorRate: 0.10, odorKick: 12, danRate: 0.15, danKick: 12,
  eta: 0.15, traceTau: 200, plasticMin: 0.05,
};

export interface StepStats { spikes: Uint8Array }   // 1 if neuron fired this ms

export class MBSim {
  readonly n: number;
  readonly w: Float32Array;          // effective weight per edge (mV), static part
  readonly plasticIdx: Int32Array;   // per edge: index into `plastic` or -1
  readonly plastic: Float32Array;    // multiplicative factor per KC→MBON edge, in [plasticMin, 1]
  readonly plasticPost: Int32Array;  // MBON index (0..nMbon) per plastic edge
  readonly plasticPre: Int32Array;   // KC index (0..nKc) per plastic edge
  readonly comp: Float32Array;       // nDan × nMbon: normalised DAN→MBON input (compartment map)
  readonly v: Float32Array; readonly I: Float32Array; readonly ref: Float32Array;
  readonly trace: Float32Array;      // KC eligibility trace
  readonly kcRange: [number, number]; readonly mbonRange: [number, number]; readonly danRange: [number, number]; readonly pnRange: [number, number];
  readonly fired: Uint8Array;
  readonly rateCount: Uint32Array;   // spikes accumulated since last reset
  readonly silenced: Uint8Array;     // lesioned neurons: held at rest, never fire
  private rng: () => number;

  constructor(readonly c: Circuit, readonly p: SimParams = DEFAULT_PARAMS, seed = 1) {
    this.n = c.n; this.rng = mulberry32(seed);
    this.kcRange = c.range('Kenyon_Cell'); this.mbonRange = c.range('MBON'); this.danRange = c.range('DAN'); this.pnRange = c.range('ALPN');
    const apl = c.range('APL')[0]; const avoidSet = new Set(p.avoidTypes);
    const inR = (i: number, r: [number, number]) => i >= r[0] && i < r[1];
    const { indptr, indices, weights, sign } = c;
    const m = c.m;
    this.w = new Float32Array(m);
    for (let i = 0; i < this.n; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) this.w[k] = weights[k] * sign[i] * p.wScale;
    if (p.normalisePnKc) {
      const tot = new Float32Array(this.n);
      for (let i = this.pnRange[0]; i < this.pnRange[1]; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) if (inR(indices[k], this.kcRange)) tot[indices[k]] += this.w[k];
      const vals = Array.from(tot.subarray(this.kcRange[0], this.kcRange[1])).filter((x) => x > 0).sort((a, b) => a - b);
      const med = vals[vals.length >> 1] ?? 1;
      for (let i = this.pnRange[0]; i < this.pnRange[1]; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) { const j = indices[k]; if (inR(j, this.kcRange) && tot[j] > 0) this.w[k] *= med / tot[j]; }
    }
    if (p.normaliseKcMbon) {
      const tot = new Float32Array(this.n);
      for (let i = this.kcRange[0]; i < this.kcRange[1]; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) if (inR(indices[k], this.mbonRange)) tot[indices[k]] += this.w[k];
      const vals = Array.from(tot.subarray(this.mbonRange[0], this.mbonRange[1])).filter((x) => x > 0).sort((a, b) => a - b);
      const med = vals[vals.length >> 1] ?? 1;
      for (let i = this.kcRange[0]; i < this.kcRange[1]; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) { const j = indices[k]; if (inR(j, this.mbonRange) && tot[j] > 0) this.w[k] *= med / tot[j]; }
    }
    for (let i = 0; i < this.n; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) {
      const j = indices[k];
      if (inR(i, this.pnRange) && inR(j, this.kcRange)) this.w[k] *= p.gain.pnKc;
      else if (inR(i, this.pnRange) && inR(j, this.pnRange)) this.w[k] *= p.gain.pnPn;
      else if (inR(i, this.kcRange) && inR(j, this.kcRange)) this.w[k] *= p.gain.kcKc;
      else if (i === apl && inR(j, this.kcRange)) this.w[k] *= p.gain.aplKc;
      else if (inR(i, this.kcRange) && inR(j, this.mbonRange)) this.w[k] *= p.gain.kcMbon * (avoidSet.has(c.typeName[j]) ? p.gain.kcMbonAvoid : 1);
    }
    // plastic KC→MBON edges
    this.plasticIdx = new Int32Array(m).fill(-1);
    const pre: number[] = [], post: number[] = [];
    for (let i = this.kcRange[0]; i < this.kcRange[1]; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) if (inR(indices[k], this.mbonRange)) {
      this.plasticIdx[k] = pre.length; pre.push(i - this.kcRange[0]); post.push(indices[k] - this.mbonRange[0]);
    }
    this.plasticPre = Int32Array.from(pre); this.plasticPost = Int32Array.from(post); this.plastic = new Float32Array(pre.length).fill(1);
    // compartment map DAN→MBON, column-normalised
    const nDan = this.danRange[1] - this.danRange[0], nMbon = this.mbonRange[1] - this.mbonRange[0];
    this.comp = new Float32Array(nDan * nMbon);
    for (let i = this.danRange[0]; i < this.danRange[1]; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) if (inR(indices[k], this.mbonRange)) this.comp[(i - this.danRange[0]) * nMbon + indices[k] - this.mbonRange[0]] += weights[k];
    for (let j = 0; j < nMbon; j++) { let s = 0; for (let d = 0; d < nDan; d++) s += this.comp[d * nMbon + j]; if (s > 0) for (let d = 0; d < nDan; d++) this.comp[d * nMbon + j] /= s; }
    this.v = new Float32Array(this.n).fill(p.vRest); this.I = new Float32Array(this.n); this.ref = new Float32Array(this.n);
    this.trace = new Float32Array(this.kcRange[1] - this.kcRange[0]); this.fired = new Uint8Array(this.n); this.rateCount = new Uint32Array(this.n); this.silenced = new Uint8Array(this.n);
  }

  /** Lesion: the given neurons are held at rest forever. */
  silence(ids: Iterable<number>) { for (const i of ids) this.silenced[i] = 1; }

  get nMbon() { return this.mbonRange[1] - this.mbonRange[0]; }
  get nDan() { return this.danRange[1] - this.danRange[0]; }

  /** Slow forgetting: plastic factors relax toward 1. */
  forget(rate: number) { const pl = this.plastic; for (let e = 0; e < pl.length; e++) pl[e] += (1 - pl[e]) * rate; }

  /** Reset membrane state (not memory). */
  resetState() { this.v.fill(this.p.vRest); this.I.fill(0); this.ref.fill(0); this.trace.fill(0); this.rateCount.fill(0); }

  /**
   * Advance 1 ms. `drivePn`: PN indices receiving odor; `driveDan`: DAN indices receiving reward/punishment;
   * `learn`: apply plasticity this step. Returns number of spikes.
   */
  step(drivePn: ArrayLike<number>, driveDan: ArrayLike<number> | null, learn: boolean): number {
    const { p, v, I, ref, fired, c } = this; const { indptr, indices } = c; const n = this.n;
    for (let a = 0; a < drivePn.length; a++) if (this.rng() < p.odorRate) I[drivePn[a]] += p.odorKick;
    if (driveDan) for (let a = 0; a < driveDan.length; a++) if (this.rng() < p.danRate) I[driveDan[a]] += p.danKick;
    const decayM = 1 / p.tauM, decayS = 1 / p.tauSyn;
    let nf = 0; fired.fill(0);
    const sil = this.silenced;
    for (let i = 0; i < n; i++) {
      if (sil[i]) { I[i] = 0; continue; }
      if (ref[i] <= 0) v[i] += (p.vRest - v[i]) * decayM + I[i] * decayS;
      I[i] -= I[i] * decayS; ref[i] -= 1;
      if (v[i] >= p.vTh) { v[i] = p.vReset; ref[i] = p.refrac; fired[i] = 1; this.rateCount[i]++; nf++; }
    }
    if (nf === 0) { this.decayTrace(); return 0; }
    // propagate
    const kc0 = this.kcRange[0];
    for (let i = 0; i < n; i++) if (fired[i]) {
      for (let k = indptr[i]; k < indptr[i + 1]; k++) {
        const pi = this.plasticIdx[k];
        I[indices[k]] += pi >= 0 ? this.w[k] * this.plastic[pi] : this.w[k];
      }
      if (i >= kc0 && i < this.kcRange[1]) this.trace[i - kc0] += 1;
    }
    if (learn) {
      // per-MBON dopamine this ms = Σ over fired DANs of comp[d, j]
      const nMbon = this.nMbon; const dope = new Float32Array(nMbon); let any = false;
      // Only externally driven DANs (the reward/punishment signal) teach; spontaneous DAN spikes do not.
      if (driveDan) for (let a = 0; a < driveDan.length; a++) { const d = driveDan[a]; if (fired[d]) { any = true; const row = (d - this.danRange[0]) * nMbon; for (let j = 0; j < nMbon; j++) dope[j] += this.comp[row + j]; } }
      if (any) for (let e = 0; e < this.plastic.length; e++) {
        const tr = this.trace[this.plasticPre[e]]; if (tr === 0) continue;
        const dp = dope[this.plasticPost[e]]; if (dp === 0) continue;
        const f = this.plastic[e] - p.eta * tr * dp * this.plastic[e];
        this.plastic[e] = f < p.plasticMin ? p.plasticMin : f;
      }
    }
    this.decayTrace();
    return nf;
  }
  private decayTrace() { const k = Math.exp(-1 / this.p.traceTau); const t = this.trace; for (let i = 0; i < t.length; i++) t[i] *= k; }
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
