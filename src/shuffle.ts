/**
 * Control circuits. 'class': degree-preserving rewiring within class pairs — every edge keeps its
 * presynaptic neuron, its synapse count and the class of its target, but the target is redrawn
 * within that class with probability ∝ the target's original in-degree from that source class.
 * Tests whether the *specific* wiring matters beyond the class-level architecture.
 * 'full': targets redrawn among all neurons (∝ total in-degree), architecture destroyed.
 */
import { Circuit } from './circuit.ts';
import { mulberry32 } from './sim.ts';

export type ShuffleMode = 'none' | 'class' | 'full';

export function shuffleCircuit(c: Circuit, mode: ShuffleMode, seed = 1): Circuit {
  if (mode === 'none') return c;
  const rng = mulberry32(seed); const n = c.n; const { indptr, indices, weights, cls } = c;
  const nCls = c.meta.classes.length;
  // in-degree (synapse-weighted) of each target from each source class
  const key = (sc: number, tc: number) => sc * nCls + tc;
  const pools = new Map<number, { ids: number[]; cum: Float64Array }>();
  const inDeg = new Float64Array(n * nCls);
  for (let i = 0; i < n; i++) for (let k = indptr[i]; k < indptr[i + 1]; k++) inDeg[indices[k] * nCls + (mode === 'full' ? 0 : cls[i])] += weights[k];
  const pool = (sc: number, tc: number) => {
    const kk = key(sc, tc); let p = pools.get(kk); if (p) return p;
    const ids: number[] = []; const w: number[] = [];
    for (let j = 0; j < n; j++) { if (mode === 'class' && cls[j] !== tc) continue; const d = inDeg[j * nCls + sc]; if (d > 0) { ids.push(j); w.push(d); } }
    const cum = new Float64Array(w.length); let s = 0; for (let a = 0; a < w.length; a++) { s += w[a]; cum[a] = s; }
    p = { ids, cum }; pools.set(kk, p); return p;
  };
  const draw = (p: { ids: number[]; cum: Float64Array }) => { const r = rng() * p.cum[p.cum.length - 1]; let lo = 0, hi = p.cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (p.cum[mid] < r) lo = mid + 1; else hi = mid; } return p.ids[lo]; };
  const newIdx = new Uint32Array(c.m), newW = new Uint16Array(c.m), newPtr = new Uint32Array(n + 1);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const acc = new Map<number, number>();
    for (let k = indptr[i]; k < indptr[i + 1]; k++) {
      const sc = mode === 'full' ? 0 : cls[i], tc = mode === 'full' ? 0 : cls[indices[k]];
      let j = draw(pool(sc, tc)); if (j === i) j = indices[k];
      acc.set(j, (acc.get(j) ?? 0) + weights[k]);
    }
    newPtr[i] = m;
    for (const j of [...acc.keys()].sort((a, b) => a - b)) { newIdx[m] = j; newW[m] = Math.min(65535, acc.get(j)!); m++; }
  }
  newPtr[n] = m;
  // rebuild a Circuit sharing node arrays but with new adjacency
  const meta = { ...c.meta, m };
  const buf = new ArrayBuffer(c.xyz.byteLength + n * 4 + n * 4 + n * 4 + (n + 1) * 4 + m * 4 + m * 2 + 32);
  let off = 0; const put = (arr: ArrayBufferView, k: string, dtype: string) => { while (off % 4) off++; new Uint8Array(buf, off, arr.byteLength).set(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)); (meta.layout as any)[k] = { offset: off, length: (arr as any).length, dtype }; off += arr.byteLength; };
  meta.layout = {}; put(c.xyz, 'xyz', 'float32'); put(c.cls, 'cls', 'uint8'); put(c.typ, 'typ', 'uint16'); put(c.sign, 'sign', 'int8');
  put(newPtr, 'indptr', 'uint32'); put(newIdx.subarray(0, m), 'indices', 'uint32'); put(newW.subarray(0, m), 'weights', 'uint16');
  return new Circuit(meta, buf);
}
