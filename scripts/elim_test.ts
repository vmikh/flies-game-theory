import { loadCircuit, makeGame } from './node_flies.ts';
const c = loadCircuit(); const g = await makeGame(c, { seed: 3, ante: 3.5, startMoney: 12 });
for (let r = 0; r < 200 && !g.over; r++) { await g.playRound(); const s = g.snapshot(); const dead = s.flies.filter((f) => !f.alive).map((f) => `${f.name}(${f.money})`); if (r % 10 === 0 || g.over) console.log(`r${r} alive ${g.aliveCount} out: ${dead.join(' ') || '-'}`); }
console.log('over:', g.over, 'round', g.round); const s = g.snapshot();
for (const f of s.flies) console.log(`${f.name} ${f.alive ? 'alive' : 'OUT'} $${f.money.toFixed(0)} ${f.strategy.label}`);
