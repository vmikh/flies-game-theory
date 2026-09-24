import { loadCircuit, makeGame } from './node_flies.ts';
const c = loadCircuit(); const who = Number(process.argv[2] ?? 9) - 1, rounds = Number(process.argv[3] ?? 24), observeGain = Number(process.argv[4] ?? 0.1);
const g = await makeGame(c, { observeGain });
console.log(`observeGain=${observeGain}. F${who + 1}'s games (its choice / opponent's choice, its payoff, its score toward opp when deciding):`);
for (let r = 0; r < rounds; r++) for (const x of await g.playRound()) {
  const me = x.a === who ? 'a' : x.b === who ? 'b' : null; if (!me) continue;
  const opp = me === 'a' ? x.b : x.a; const myC = me === 'a' ? x.ca : x.cb, oppC = me === 'a' ? x.cb : x.ca; const pay = me === 'a' ? x.pa : x.pb;
  const myS = me === 'a' ? x.scoreA : x.scoreB, oppS = me === 'a' ? x.scoreB : x.scoreA, myP = me === 'a' ? x.pcA : x.pcB;
  console.log(`r${String(r).padStart(2)} vs F${opp + 1}: me ${myC ? 'C' : 'D'} (score ${myS.toFixed(2)} p=${myP.toFixed(2)})  opp ${oppC ? 'C' : 'D'} (score ${oppS.toFixed(2)})  payoff ${pay}`);
}
const s = g.snapshot();
console.log('coop% per fly:', s.flies.map((f) => `${f.name} ${f.games ? Math.round(100 * f.coops / f.games) : 0}%`).join('  '));
console.log(`trust toward F${who + 1} by others:`, s.trust.map((row, i) => i === who ? '  -- ' : row[who].toFixed(2)).join(' '));
console.log(`F${who + 1}'s trust toward others:`, s.trust[who].map((v) => v.toFixed(2)).join(' '));
