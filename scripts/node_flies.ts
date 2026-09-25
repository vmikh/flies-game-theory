// Shared helpers for headless scripts: load circuit, build a Game with in-thread brains.
import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME, type GameParams } from '../src/game.ts';
import { LocalFly } from '../src/backend.ts';
export function loadCircuit(): Circuit {
  const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
  const bin = readFileSync('public/data/mb_R.bin'); return new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
}
export function makeGame(c: Circuit, over: Partial<GameParams> = {}) {
  const p: GameParams = { ...DEFAULT_GAME, ...over, sim: { ...DEFAULT_GAME.sim, ...(over.sim ?? {}) } };
  return Game.create(c, p, (id, seed, lesion) => new LocalFly(c, p.sim, seed, lesion));
}
export const localSim = (g: Game, i: number) => (g.flies[i].be as LocalFly).sim;
