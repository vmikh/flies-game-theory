import * as d3 from 'd3';
import type { Snapshot } from './game.ts';

const app = document.getElementById('app')!;
app.innerHTML = `
<header>
  <h1>Flies · Game Theory</h1>
  <span class="muted" id="status">starting…</span>
  <span class="spacer"></span>
  <label>rounds <input id="rounds" type="number" value="50" min="1" style="width:5em"></label>
  <button id="run">Run</button><button id="inf">Run ∞</button><button id="pause">Pause</button>
</header>
<main class="grid">
  <section id="board"><h2>Ranking</h2><div id="lb"></div></section>
  <section id="trust"><h2>Trust matrix <span class="muted">row = fly, col = opponent, colour = approach − avoid vs naive</span></h2><svg id="tm"></svg></section>
  <section id="timeline"><h2>Cooperation rate</h2><svg id="tl"></svg></section>
  <section id="log"><h2>Last games</h2><pre id="lg"></pre></section>
</main>`;
const status = document.getElementById('status')!;
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const history: { round: number; coop: number }[] = [];

worker.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'status') status.textContent = m.msg;
  else if (m.type === 'ready') { status.textContent = 'ready'; render(m.snap); }
  else if (m.type === 'round') { history.push({ round: m.snap.round, coop: m.snap.recentCoopRate }); status.textContent = `round ${m.snap.round} · ${m.snap.games} games · coop ${(100 * m.snap.coopRate).toFixed(0)}%`; render(m.snap); }
  else if (m.type === 'done') status.textContent += ' · paused';
};
worker.postMessage({ type: 'init' });
document.getElementById('run')!.onclick = () => worker.postMessage({ type: 'run', rounds: Number((document.getElementById('rounds') as HTMLInputElement).value) });
document.getElementById('inf')!.onclick = () => worker.postMessage({ type: 'run', rounds: 1e9 });
document.getElementById('pause')!.onclick = () => worker.postMessage({ type: 'pause' });

const COOP = '#4cc9a4', DEFECT = '#e4572e';
function render(s: Snapshot) {
  // leaderboard
  const flies = [...s.flies].sort((a, b) => b.money - a.money); const max = Math.max(1, ...flies.map((f) => f.money));
  d3.select('#lb').selectAll('div.row').data(flies, (d: any) => d.id).join('div').attr('class', 'row').html((f) => {
    const cr = f.games ? f.coops / f.games : 0;
    return `<span class="name">${f.name}${f.lineage !== f.id ? `<sub>←F${f.lineage + 1}</sub>` : ''}</span>
      <span class="bar"><i style="width:${(100 * Math.max(0, f.money)) / max}%"></i></span>
      <span class="num">${f.money.toFixed(0)}</span>
      <span class="muted small">${f.games} games · coop ${(100 * cr).toFixed(0)}% · betrayed ${f.betrayed}</span>`;
  });
  // trust matrix
  const n = s.flies.length, cell = 34, pad = 28; const svg = d3.select('#tm').attr('width', pad + n * cell).attr('height', pad + n * cell);
  const ext = Math.max(2, d3.max(s.trust.flat(), (v) => Math.abs(v)) ?? 2);
  const color = d3.scaleDiverging([-ext, 0, ext], (t) => d3.interpolateRgbBasis([DEFECT, '#1a1d24', COOP])(t));
  const cells = s.trust.flatMap((row, i) => row.map((v, j) => ({ i, j, v })));
  svg.selectAll('rect').data(cells).join('rect').attr('x', (d) => pad + d.j * cell).attr('y', (d) => pad + d.i * cell).attr('width', cell - 2).attr('height', cell - 2)
    .attr('fill', (d) => (d.i === d.j ? '#0b0d12' : color(d.v))).append('title').text((d) => `F${d.i + 1} → F${d.j + 1}: ${d.v.toFixed(2)}`);
  svg.selectAll('text.c').data(s.flies).join('text').attr('class', 'c lbl').attr('x', (_, j) => pad + j * cell + cell / 2 - 1).attr('y', pad - 8).attr('text-anchor', 'middle').text((f) => f.name);
  svg.selectAll('text.r').data(s.flies).join('text').attr('class', 'r lbl').attr('x', pad - 6).attr('y', (_, i) => pad + i * cell + cell / 2 + 4).attr('text-anchor', 'end').text((f) => f.name);
  // timeline
  const W = 520, H = 120, m = { l: 34, r: 8, t: 8, b: 20 }; const tl = d3.select('#tl').attr('width', W).attr('height', H);
  const x = d3.scaleLinear([0, Math.max(10, s.round)], [m.l, W - m.r]), y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  tl.selectAll('path.l').data([history]).join('path').attr('class', 'l').attr('fill', 'none').attr('stroke', COOP).attr('stroke-width', 1.5)
    .attr('d', d3.line<{ round: number; coop: number }>().x((d) => x(d.round)).y((d) => y(d.coop)));
  tl.selectAll('g.ax').data([0]).join('g').attr('class', 'ax').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6) as any);
  tl.selectAll('g.ay').data([0]).join('g').attr('class', 'ay').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')) as any);
  // log
  document.getElementById('lg')!.textContent = s.last.slice().reverse().map((g) =>
    `r${String(g.round).padStart(4)}  F${g.a + 1} ${g.ca ? 'C' : 'D'} (${g.pcA.toFixed(2)})  vs  F${g.b + 1} ${g.cb ? 'C' : 'D'} (${g.pcB.toFixed(2)})   → ${g.pa}/${g.pb}`).join('\n');
}
