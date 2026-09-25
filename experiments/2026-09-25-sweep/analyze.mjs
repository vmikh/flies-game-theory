// Summary of a sweep. Usage: node experiments/2026-09-25-sweep/analyze.mjs [dataDir]   (default: ./data next to this script)
import { readFileSync, readdirSync } from 'node:fs';
const D = (process.argv[2] ?? new URL('./data/', import.meta.url).pathname).replace(/\/?$/, '/');
const ORDER = ['nullNoDAN', 'default', 'gossip0', 'gossip1', 'forget0', 'forget02', 'trustPlus', 'trustMinus', 'generous', 'harsh', 'pureMemory', 'friendlyWorld', 'hostileWorld', 'tournament'];
const runs = {};
for (const f of readdirSync(D).filter((x) => x.endsWith('.jsonl'))) for (const l of readFileSync(D + f, 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); (runs[r.cfg] ??= []).push(r); }
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const ci = (a) => { a = a.filter((x) => x !== null && Number.isFinite(x)); if (!a.length) return 'n/a'; return `${mean(a).toFixed(3)}±${(1.96 * sd(a) / Math.sqrt(a.length)).toFixed(3)}`; };
const pct = (a) => { a = a.filter((x) => x !== null && Number.isFinite(x)); return a.length ? `${(100 * mean(a)).toFixed(1)}±${(196 * sd(a) / Math.sqrt(a.length)).toFixed(1)}%` : 'n/a'; };
const cyc = (r, k) => { const rs = r.perRound.slice(7 * k, 7 * k + 7); const n = rs.reduce((a, x) => a + x.n, 0); return n ? rs.reduce((a, x) => a + x.c, 0) / n : null; };
const pool = (flies, filt = () => true) => { const s = { nFirst: 0, cFirst: 0, nAfterC: 0, cAfterC: 0, nAfterD: 0, cAfterD: 0 }; for (const f of flies) if (filt(f)) for (const k in s) s[k] += f.st[k]; return s; };
const gap = (s) => (s.nAfterC >= 3 && s.nAfterD >= 3 ? s.cAfterC / s.nAfterC - s.cAfterD / s.nAfterD : null);
const pearson = (xs, ys) => { if (xs.length < 3) return null; const mx = mean(xs), my = mean(ys); let a = 0, b = 0, c = 0; for (let i = 0; i < xs.length; i++) { a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; c += (ys[i] - my) ** 2; } return b * c > 0 ? a / Math.sqrt(b * c) : null; };
const welch = (a, b) => { a = a.filter((x) => x !== null); b = b.filter((x) => x !== null); const t = (mean(a) - mean(b)) / Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length); return t; };

const nullGap = (runs.nullNoDAN ?? []).map((r) => gap(pool(r.flies)));
for (const name of ORDER) {
  const R = runs[name]; if (!R) continue;
  console.log(`\n=== ${name}  (n=${R.length} runs, ${mean(R.map((r) => r.sec)).toFixed(0)}s/run)`);
  console.log(`coop overall ${pct(R.map((r) => r.coop))} | cycle1 ${pct(R.map((r) => cyc(r, 0)))} | cycle3 ${pct(R.map((r) => cyc(r, 2)))} | cycle5 ${pct(R.map((r) => cyc(r, 4)))}`);
  console.log(`alive@end ${ci(R.map((r) => r.alive))} | runs with bankruptcy ${pct(R.map((r) => (r.alive < 8 ? 1 : 0)))} | game over (<2 alive) ${pct(R.map((r) => (r.alive < 2 ? 1 : 0)))} | rounds ${ci(R.map((r) => r.rounds))} | wealth ${ci(R.map((r) => r.wealth))}`);
  const P = pool(R.flatMap((r) => r.flies));
  console.log(`pooled P(C|first) ${(P.cFirst / P.nFirst).toFixed(3)} (n=${P.nFirst}) P(C|oppC) ${(P.cAfterC / P.nAfterC).toFixed(3)} (n=${P.nAfterC}) P(C|oppD) ${(P.cAfterD / P.nAfterD).toFixed(3)} (n=${P.nAfterD})`);
  const g = R.map((r) => gap(pool(r.flies)));
  console.log(`reciprocity gap per run ${ci(g)} (t vs null ${nullGap.length && name !== 'nullNoDAN' ? welch(g, nullGap).toFixed(1) : '-'}) | repCorr ${ci(R.map((r) => r.repCorr))} | trustCorr ${ci(R.map((r) => r.trustCorr))}`);
  console.log(`|score| ${ci(R.map((r) => r.meanAbsScore))} | mean p(C) ${ci(R.map((r) => r.meanPc))} | plastic mean ${ci(R.map((r) => r.plasticMean))} | at floor ${pct(R.map((r) => r.plasticFloor))}`);
  const payCorr = R.map((r) => pearson(r.flies.filter((f) => f.games).map((f) => f.coops / f.games), r.flies.filter((f) => f.games).map((f) => f.money)));
  console.log(`within-run corr(fly coop rate, final money) ${ci(payCorr)}`);
  const labels = {}; let nl = 0; for (const f of R.flatMap((r) => r.flies)) if (f.label !== '…') { labels[f.label] = (labels[f.label] ?? 0) + 1; nl++; }
  console.log(`labels (n=${nl}): ` + Object.entries(labels).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / nl).toFixed(0)}%`).join(', '));
  const byLabel = {}; for (const r of R) { const avg = r.wealth / r.flies.length; for (const f of r.flies) (byLabel[f.label] ??= []).push(f.money - avg); }
  console.log(`money vs run average by label (n>=20): ` + Object.entries(byLabel).filter(([, v]) => v.length >= 20).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `${k} ${mean(v) >= 0 ? '+' : ''}${mean(v).toFixed(1)} (n=${v.length})`).join(', '));
  const best = {}; for (const r of R) { const top = [...r.flies].sort((a, b) => b.money - a.money)[0]; best[top.label] = (best[top.label] ?? 0) + 1; }
  console.log(`label of richest fly: ` + Object.entries(best).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
  if (name === 'tournament') {
    for (const les of ['none', 'noPPL1', 'noPAM', 'noDAN', 'halfKC', 'noAPL']) {
      const F = R.flatMap((r) => { const ranked = [...r.flies].sort((a, b) => b.money - a.money); return r.flies.filter((f) => f.lesion === les).map((f) => ({ ...f, rank: ranked.findIndex((x) => x.id === f.id) + 1 })); });
      const gp = R.map((r) => gap(pool(r.flies, (f) => f.lesion === les)));
      console.log(`  ${les.padEnd(7)} n=${F.length} money ${ci(F.map((f) => f.money))} survive ${pct(F.map((f) => (f.alive ? 1 : 0)))} coop ${pct(F.map((f) => (f.games ? f.coops / f.games : null)))} rank ${ci(F.map((f) => f.rank))} top1 ${pct(F.map((f) => (f.rank === 1 ? 1 : 0)))} recipGap ${ci(gp)} betrayed ${ci(F.map((f) => f.betrayed))}`);
    }
  }
}
