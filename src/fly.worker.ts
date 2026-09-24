/// <reference lib="webworker" />
import { Circuit } from './circuit.ts';
import { LocalFly } from './backend.ts';
import type { SimParams } from './sim.ts';
import { shuffleCircuit, type ShuffleMode } from './shuffle.ts';

let fly: LocalFly | null = null;
type Req = { id: number; op: string; args: any[] };
self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, op, args } = e.data;
  try {
    let result: unknown = undefined;
    if (op === 'init') { const [params, seed, shuffle, shuffleSeed] = args as [SimParams, number, ShuffleMode, number]; let c = await Circuit.load(); c = shuffleCircuit(c, shuffle, shuffleSeed); fly = new LocalFly(c, params, seed); }
    else if (!fly) throw new Error('not initialised');
    else if (op === 'counts') result = await fly.counts(args[0], args[1], args[2]);
    else if (op === 'teach') await fly.teach(args[0], args[1], args[2], args[3]);
    else if (op === 'forget') await fly.forget(args[0]);
    else if (op === 'getPlastic') result = await fly.getPlastic();
    else if (op === 'setPlastic') await fly.setPlastic(args[0], args[1]);
    else throw new Error(`unknown op ${op}`);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) { (self as unknown as Worker).postMessage({ id, error: String(err) }); }
};
