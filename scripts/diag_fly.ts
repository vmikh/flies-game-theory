import { readFileSync } from 'node:fs';
import { Circuit, type CircuitMeta } from '../src/circuit.ts';
import { Game, DEFAULT_GAME } from '../src/game.ts';
const meta = JSON.parse(readFileSync('public/data/mb_R.json', 'utf8')) as CircuitMeta;
const bin = readFileSync('public/data/mb_R.bin'); const c = new Circuit(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const who = Number(process.argv[2] ?? 9) - 1, rounds = Number(process.argv[3] ?? 24), observeGain = Number(process.argv[4] ?? 0.4);
const g = new Game(c, { ...DEFAULT_GAME, observeGain });
console.log(`observeGain=${observeGain}. F${who + 1}'s games (its choice / opponent's choice, its payoff, its trust toward opp before deciding):`);
for (let r = 0; r < rounds; r++) {
  const recs = g.playRound();
  for (const x of recs) {
    const me = x.a === who ? 'a' : x.b === who ? 'b' : null; if (!me) continue;
    const opp = me === 'a' ? x.b : x.a; const myC = me === 'a' ? x.ca : x.cb, oppC = me === 'a' ? x.cb : x.ca; const pay = me === 'a' ? x.pa : x.pb;
    const myS = me === 'a' ? x.scoreA : x.scoreB, oppS = me === 'a' ? x.scoreB : x.scoreA, myP = me === 'a' ? x.pcA : x.pcB;
    console.log(`r${String(r).padStart(2)} vs F${opp + 1}: me ${myC ? 'C' : 'D'} (score ${myS.toFixed(2)} p=${myP.toFixed(2)})  opp ${oppC ? 'C' : 'D'} (score ${oppS.toFixed(2)})  payoff ${pay}`);
  }
}
const s = g.snapshot();
console.log('coop% per fly:', s.flies.map((f) => `${f.name} ${f.games ? Math.round(100 * f.coops / f.games) : 0}%`).join('  '));
console.log(`trust toward F${who + 1} by others:`, s.trust.map((row, i) => i === who ? '  -- ' : row[who].toFixed(2)).join(' '));
console.log(`F${who + 1}'s trust toward others:`, s.trust[who].map((v) => v.toFixed(2)).join(' '));
