// Fast regression check for reproducibility when asynchronous fly brains finish in a different order.
import assert from 'node:assert/strict';
import { Game, DEFAULT_GAME } from '../src/game.ts';
import type { Circuit } from '../src/circuit.ts';
import type { FlyBackend } from '../src/backend.ts';

const names = ['G0_a', 'G1_a', 'G2_a', 'G3_a', 'MBON0', 'MBON1', 'PPL1_a', 'PAM_a'];
const circuit = {
  n: 8, sign: new Int8Array(8).fill(1), typeName: names,
  indptr: new Uint32Array([0, 0, 0, 0, 0, 0, 0, 1, 2]),
  indices: new Uint32Array([4, 5]), weights: new Uint16Array([30, 30]),
  ids: (kind: string) => kind === 'ALPN' ? [0, 1, 2, 3] : kind === 'MBON' ? [4, 5] : [6, 7],
  range: (kind: string) => kind === 'MBON' ? [4, 6] : [0, 0],
} as unknown as Circuit;

const backend = (id: number, delays: number[]): FlyBackend => ({
    counts: async () => {
      await new Promise((resolve) => setTimeout(resolve, delays[id]));
      return { c: new Float32Array([10, 10]), all: new Uint16Array(8) };
    },
    teach: async () => null, forget: async () => {}, getPlastic: async () => new Float32Array(),
    setPlastic: async () => {}, dispose: () => {},
  });

async function run(delays: number[]) {
  const g = await Game.create(circuit, {
    ...DEFAULT_GAME, nFlies: 4, glomPerOdor: 1, baselineReps: 1,
    decisionMs: 1, learnMs: 1, observeGain: 0, ante: 0, seed: 23,
  }, (id) => backend(id, delays));
  for (let i = 0; i < 8; i++) await g.playRound();
  const result = g.log.map(({ a, b, ca, cb, pcA, pcB }) => ({ a, b, ca, cb, pcA, pcB }));
  g.dispose();
  return result;
}

assert.deepEqual(await run([0, 5, 0, 5]), await run([5, 0, 5, 0]));
console.log('Seeded decisions are independent of backend completion order.');
