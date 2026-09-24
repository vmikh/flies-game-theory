// Headless game run: node --experimental-transform-types scripts/run_game.ts [rounds] [observeGain]
import { loadCircuit, makeGame } from './node_flies.ts';
const c = loadCircuit(); const rounds = Number(process.argv[2] ?? 30); const observeGain = Number(process.argv[3] ?? 0.1);
let t0 = performance.now(); const g = await makeGame(c, { observeGain });
console.log(`init ${((performance.now() - t0) / 1000).toFixed(1)}s; approach MBONs ${g.approach.length}, avoid MBONs ${g.avoid.length}`);
t0 = performance.now();
for (let r = 0; r < rounds; r++) {
  const recs = await g.playRound(); const s = g.snapshot();
  const line = recs.map((x) => `F${x.a + 1}${x.ca ? 'C' : 'D'}-F${x.b + 1}${x.cb ? 'C' : 'D'}`).join(' ');
  console.log(`r${String(r).padStart(3)} coop ${(100 * s.recentCoopRate).toFixed(0).padStart(3)}%  ${line}  money ${s.flies.map((f) => f.money.toFixed(0)).join(',')}`);
}
console.log(`time/round ${((performance.now() - t0) / rounds / 1000).toFixed(2)}s`);
const s = g.snapshot();
console.log('trust matrix (row fly → col opponent):'); for (const row of s.trust) console.log('  ' + row.map((v) => v.toFixed(2).padStart(6)).join(''));
const pct = (v: number | null) => (v === null ? '?' : Math.round(100 * v) + '%');
console.log('final:'); for (const f of s.flies.sort((a, b) => b.money - a.money)) console.log(`  ${f.name}${f.lineage !== f.id ? '(clone of F' + (f.lineage + 1) + ')' : ''} $${String(f.money.toFixed(0)).padStart(3)} coop ${String(f.games ? (100 * f.coops / f.games).toFixed(0) : 0).padStart(3)}%  ${f.strategy.label.padEnd(22)} first ${pct(f.strategy.trust)} afterC ${pct(f.strategy.reciprocity)} afterD ${pct(f.strategy.forgiveness)}`);
