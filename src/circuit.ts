/** Loader for the packed mushroom body circuit (see scripts/export_web.py). */
export interface CircuitMeta {
  side: string; min_weight: number; n: number; m: number;
  classes: string[]; types: string[];
  class_ranges: Record<string, [number, number]>;
  bodyIds: number[];
  layout: Record<string, { offset: number; length: number; dtype: string }>;
}

export class Circuit {
  readonly n: number; readonly m: number;
  readonly xyz: Float32Array; readonly cls: Uint8Array; readonly typ: Uint16Array; readonly sign: Int8Array;
  readonly indptr: Uint32Array; readonly indices: Uint32Array; readonly weights: Uint16Array;
  readonly typeName: string[];

  constructor(readonly meta: CircuitMeta, buf: ArrayBuffer) {
    const L = meta.layout;
    const view = <T>(ctor: new (b: ArrayBuffer, o: number, l: number) => T, k: string) => new ctor(buf, L[k].offset, L[k].length);
    this.n = meta.n; this.m = meta.m;
    this.xyz = view(Float32Array, 'xyz'); this.cls = view(Uint8Array, 'cls'); this.typ = view(Uint16Array, 'typ');
    this.sign = view(Int8Array, 'sign'); this.indptr = view(Uint32Array, 'indptr');
    this.indices = view(Uint32Array, 'indices'); this.weights = view(Uint16Array, 'weights');
    this.typeName = Array.from(this.typ, (t) => meta.types[t]);
  }

  static async load(base = '/data/mb_R'): Promise<Circuit> {
    const [meta, bin] = await Promise.all([
      fetch(`${base}.json`).then((r) => r.json() as Promise<CircuitMeta>),
      fetch(`${base}.bin`).then((r) => r.arrayBuffer()),
    ]);
    return new Circuit(meta, bin);
  }

  /** Index range [start, end) of a class, e.g. 'Kenyon_Cell'. */
  range(cls: string): [number, number] { return this.meta.class_ranges[cls]; }
  ids(cls: string): number[] { const [a, b] = this.range(cls); return Array.from({ length: b - a }, (_, i) => a + i); }
  /** Neurons of a class whose type name starts with a prefix, e.g. ('DAN', 'PPL1'). */
  idsByPrefix(cls: string, prefix: string): number[] { return this.ids(cls).filter((i) => this.typeName[i].startsWith(prefix)); }
}
