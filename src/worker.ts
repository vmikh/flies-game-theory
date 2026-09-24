/// <reference lib="webworker" />
import { Circuit } from './circuit.ts';
import { Game, DEFAULT_GAME, type GameParams, type Snapshot } from './game.ts';

type In = { type: 'init'; params?: Partial<GameParams> } | { type: 'run'; rounds: number } | { type: 'pause' };
type Out = { type: 'status'; msg: string } | { type: 'ready'; snap: Snapshot } | { type: 'round'; snap: Snapshot } | { type: 'done'; snap: Snapshot };
const post = (m: Out) => (self as unknown as Worker).postMessage(m);

let game: Game | null = null; let running = false; let budget = 0;
async function init(params?: Partial<GameParams>) {
  post({ type: 'status', msg: 'loading circuit…' });
  const c = await Circuit.load();
  post({ type: 'status', msg: 'building 9 brains and measuring naive baselines…' });
  const p: GameParams = { ...DEFAULT_GAME, ...params, sim: { ...DEFAULT_GAME.sim, ...(params?.sim ?? {}) } };
  game = new Game(c, p);
  post({ type: 'ready', snap: game.snapshot() });
}
function loop() {
  if (!game || !running || budget <= 0) { running = false; if (game) post({ type: 'done', snap: game.snapshot() }); return; }
  game.playRound(); budget--; post({ type: 'round', snap: game.snapshot() });
  setTimeout(loop, 0);
}
self.onmessage = (e: MessageEvent<In>) => {
  const m = e.data;
  if (m.type === 'init') void init(m.params);
  else if (m.type === 'run') { budget = m.rounds; if (!running) { running = true; loop(); } }
  else if (m.type === 'pause') { running = false; budget = 0; }
};
