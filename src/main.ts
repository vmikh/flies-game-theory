import * as d3 from 'd3';
import { Circuit } from './circuit.ts';
import { Game, DEFAULT_GAME, type Snapshot } from './game.ts';
import { RemoteFly } from './remoteFly.ts';

const app = document.getElementById('app')!;
app.innerHTML = `
<header>
  <h1>Flies · Game Theory</h1>
  <span class="muted" id="status">starting…</span>
  <span class="spacer"></span>
  <label>rounds <input id="rounds" type="number" placeholder="∞" min="1" style="width:5em"></label>
  <label>speed <input id="speed" type="range" min="0" max="100" value="60" style="width:10em"> <span id="speedv" class="muted"></span></label>
  <button id="play">▶ Play</button>
</header>
<main class="grid">
  <section id="board"><h2>Ranking</h2><div id="lb"></div></section>
  <section id="trust"><h2>Trust matrix <span class="muted">row = fly, col = opponent; green = approach, red = avoid, vs naive</span></h2><svg id="tm"></svg></section>
  <section id="timeline"><h2>Cooperation rate (last 200 decisions)</h2><svg id="tl"></svg></section>
  <section id="log"><h2>Last games</h2><pre id="lg"></pre></section>
</main>`;
const status = document.getElementById('status')!;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const roundsIn = document.getElementById('rounds') as HTMLInputElement;
const speedIn = document.getElementById('speed') as HTMLInputElement; const speedV = document.getElementById('speedv')!;
const history: { round: number; coop: number }[] = [];

/** Speed slider → target rounds per second (0.25 … ∞). */
function targetRps(): number { const v = Number(speedIn.value); return v >= 100 ? Infinity : 0.25 * Math.pow(2, v / 12); }
const showSpeed = () => { const r = targetRps(); speedV.textContent = r === Infinity ? 'max' : `${r < 1 ? r.toFixed(2) : r.toFixed(1)} rounds/s`; };
speedIn.oninput = showSpeed; showSpeed();

const circuit = await Circuit.load();
status.textContent = 'spawning 9 brains…';
const game = await Game.create(circuit, DEFAULT_GAME, async (id, seed) => { const f = new RemoteFly(); await f.init(DEFAULT_GAME.sim, seed); return f; }, (m) => (status.textContent = m));
render(game.snapshot()); status.textContent = 'ready';

let playing = false, budget = 0, lastRender = 0;
playBtn.onclick = () => { if (playing) { playing = false; playBtn.textContent = '▶ Play'; return; } budget = roundsIn.value ? Number(roundsIn.value) : Infinity; playing = true; playBtn.textContent = '❚❚ Pause'; void loop(); };
async function loop() {
  while (playing && budget > 0) {
    const t0 = performance.now();
    await game.playRound(); budget--;
    const s = game.snapshot(); history.push({ round: s.round, coop: s.recentCoopRate });
    const now = performance.now();
    if (now - lastRender > 80 || budget === 0 || targetRps() < 12) { render(s); lastRender = now; }
    status.textContent = `round ${s.round} · ${s.games} games · coop ${(100 * s.coopRate).toFixed(0)}% · ${(1000 / (now - t0)).toFixed(1)} rounds/s`;
    const wait = 1000 / targetRps() - (performance.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  playing = false; playBtn.textContent = '▶ Play';
}

const COOP = '#4cc9a4', DEFECT = '#e4572e';
function render(s: Snapshot) {
  const flies = [...s.flies].sort((a, b) => b.money - a.money); const max = Math.max(1, ...flies.map((f) => f.money));
  d3.select('#lb').selectAll('div.row').data(flies, (d: any) => d.id).join('div').attr('class', 'row').html((f) => {
    const cr = f.games ? f.coops / f.games : 0;
    return `<span class="name">${f.name}${f.lineage !== f.id ? `<sub>←F${f.lineage + 1}</sub>` : ''}</span>
      <span class="bar"><i style="width:${(100 * Math.max(0, f.money)) / max}%"></i></span>
      <span class="num">${f.money.toFixed(0)}</span>
      <span class="muted small">${f.games} games · coop ${(100 * cr).toFixed(0)}% · betrayed ${f.betrayed}</span>`;
  });
  const n = s.flies.length, cell = 34, pad = 28; const svg = d3.select('#tm').attr('width', pad + n * cell).attr('height', pad + n * cell);
  const color = d3.scaleDiverging([-1, 0, 1], (t) => d3.interpolateRgbBasis([DEFECT, '#1a1d24', COOP])(t)).clamp(true);
  const cells = s.trust.flatMap((row, i) => row.map((v, j) => ({ i, j, v })));
  svg.selectAll('rect').data(cells).join('rect').attr('x', (d) => pad + d.j * cell).attr('y', (d) => pad + d.i * cell).attr('width', cell - 2).attr('height', cell - 2)
    .attr('fill', (d) => (d.i === d.j ? '#0b0d12' : color(d.v))).select('title').remove();
  svg.selectAll('rect').append('title').text((d: any) => `F${d.i + 1} → F${d.j + 1}: ${d.v.toFixed(2)}`);
  svg.selectAll('text.c').data(s.flies).join('text').attr('class', 'c lbl').attr('x', (_, j) => pad + j * cell + cell / 2 - 1).attr('y', pad - 8).attr('text-anchor', 'middle').text((f) => f.name);
  svg.selectAll('text.r').data(s.flies).join('text').attr('class', 'r lbl').attr('x', pad - 6).attr('y', (_, i) => pad + i * cell + cell / 2 + 4).attr('text-anchor', 'end').text((f) => f.name);
  const W = 520, H = 120, m = { l: 34, r: 8, t: 8, b: 20 }; const tl = d3.select('#tl').attr('width', W).attr('height', H);
  const x = d3.scaleLinear([0, Math.max(10, s.round)], [m.l, W - m.r]), y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  tl.selectAll('path.l').data([history]).join('path').attr('class', 'l').attr('fill', 'none').attr('stroke', COOP).attr('stroke-width', 1.5)
    .attr('d', d3.line<{ round: number; coop: number }>().x((d) => x(d.round)).y((d) => y(d.coop)));
  tl.selectAll('g.ax').data([0]).join('g').attr('class', 'ax').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6) as any);
  tl.selectAll('g.ay').data([0]).join('g').attr('class', 'ay').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')) as any);
  document.getElementById('lg')!.textContent = s.last.slice().reverse().map((g) =>
    `r${String(g.round).padStart(4)}  F${g.a + 1} ${g.ca ? 'C' : 'D'} (${g.pcA.toFixed(2)})  vs  F${g.b + 1} ${g.cb ? 'C' : 'D'} (${g.pcB.toFixed(2)})   → ${g.pa}/${g.pb}`).join('\n');
}
