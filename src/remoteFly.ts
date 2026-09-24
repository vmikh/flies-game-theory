import type { FlyBackend, DanPop } from './backend.ts';
import type { SimParams } from './sim.ts';
import type { ShuffleMode } from './shuffle.ts';

/** Proxy to a fly living in its own Web Worker; calls are serialised per worker, workers run in parallel. */
export class RemoteFly implements FlyBackend {
  private w: Worker; private next = 1; private pending = new Map<number, { res: (v: any) => void; rej: (e: any) => void }>();
  constructor() {
    this.w = new Worker(new URL('./fly.worker.ts', import.meta.url), { type: 'module' });
    this.w.onmessage = (e: MessageEvent) => { const p = this.pending.get(e.data.id); if (!p) return; this.pending.delete(e.data.id); e.data.error ? p.rej(new Error(e.data.error)) : p.res(e.data.result); };
  }
  private call<T>(op: string, ...args: any[]): Promise<T> { const id = this.next++; return new Promise<T>((res, rej) => { this.pending.set(id, { res, rej }); this.w.postMessage({ id, op, args }); }); }
  init(params: SimParams, seed: number, shuffle: ShuffleMode = 'none', shuffleSeed = 1) { return this.call<void>('init', params, seed, shuffle, shuffleSeed); }
  counts(odor: number[], ms: number, ids: number[]) { return this.call<Float32Array>('counts', odor, ms, ids); }
  teach(odor: number[], dan: DanPop, rateScale: number, ms: number) { return this.call<void>('teach', odor, dan, rateScale, ms); }
  forget(rate: number) { return this.call<void>('forget', rate); }
  getPlastic() { return this.call<Float32Array>('getPlastic'); }
  setPlastic(p: Float32Array, jitter: number) { return this.call<void>('setPlastic', p, jitter); }
  dispose() { this.w.terminate(); }
}
