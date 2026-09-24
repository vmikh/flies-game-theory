import { loadCircuit, makeGame } from './node_flies.ts';
const c = loadCircuit(); const rounds = Number(process.argv[2] ?? 30); const seeds = Number(process.argv[3] ?? 5);
const rankSum = new Array(9).fill(0);
for (let s = 1; s <= seeds; s++) {
  const g = await makeGame(c, { seed: s }); for (let r = 0; r < rounds; r++) await g.playRound();
  const fl = [...g.snapshot().flies].sort((a, b) => b.money - a.money);
  fl.forEach((f, i) => (rankSum[f.id] += i + 1));
  console.log(`seed ${s}: ` + fl.map((f) => `${f.name} $${f.money.toFixed(0)} (${Math.round(100 * f.coops / Math.max(1, f.games))}%)`).join(' | '));
}
console.log('mean rank per fly: ' + rankSum.map((v, i) => `F${i + 1} ${(v / seeds).toFixed(1)}`).join('  '));
