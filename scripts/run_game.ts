// Headless game run: node --experimental-transform-types scripts/run_game.ts [rounds] [observeGain]
import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME } from '../src/game.ts';
const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const c = new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const rounds = Number(process.argv[2] ?? 30); const observeGain = Number(process.argv[3] ?? DEFAULT_GAME.observeGain);
let t0 = performance.now();
const g = new Game(c, { ...DEFAULT_GAME, observeGain });
console.log(`init ${((performance.now() - t0) / 1000).toFixed(1)}s; apRef/avRef:`, g.flies.map((f) => `${f.apRef.toFixed(1)}/${f.avRef.toFixed(1)}`).join(' '));
console.log('baseline rows:', g.flies.map((f) => Array.from(f.baseline).map((v) => v.toFixed(2)).join(' ')).join('\n               '));
t0 = performance.now();
for (let r = 0; r < rounds; r++) {
  const recs = g.playRound(); const s = g.snapshot();
  const line = recs.map((x) => `F${x.a + 1}${x.ca ? 'C' : 'D'}-F${x.b + 1}${x.cb ? 'C' : 'D'}`).join(' ');
  console.log(`r${String(r).padStart(3)} coop ${(100 * s.recentCoopRate).toFixed(0).padStart(3)}%  ${line}  money ${s.flies.map((f) => f.money.toFixed(0)).join(',')}`);
}
console.log(`time/round ${((performance.now() - t0) / rounds / 1000).toFixed(2)}s`);
const s = g.snapshot();
console.log('trust matrix (row fly → col opponent):'); for (const row of s.trust) console.log('  ' + row.map((v) => v.toFixed(2).padStart(6)).join(''));
console.log('final:', s.flies.sort((a, b) => b.money - a.money).map((f) => `${f.name}(${f.lineage !== f.id ? 'clone of F' + (f.lineage + 1) : ''}) $${f.money.toFixed(0)} coop ${f.games ? (100 * f.coops / f.games).toFixed(0) : 0}%`).join(' | '));
