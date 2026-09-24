import * as d3 from 'd3';
import { Circuit } from './circuit.ts';
import { Game, DEFAULT_GAME, type Snapshot } from './game.ts';
import { RemoteFly } from './remoteFly.ts';
import type { ShuffleMode } from './shuffle.ts';
import { Arena } from './arena.ts';

const app = document.getElementById('app')!;
app.innerHTML = `
<header>
  <h1>Flies · Game Theory</h1>
  <span class="muted" id="status">starting…</span>
  <span class="spacer"></span>
  <span class="seg" id="speed">${[1, 2, 5, 10, 20].map((x) => `<button data-x="${x}"${x === 1 ? ' class="on"' : ''}>${x}×</button>`).join('')}</span>
  <button id="play">▶ Play</button>
  <button id="toggle-params">Parameters</button>
</header>
<aside id="params" hidden>
  <h2>Parameters <span class="muted">(restart applies)</span></h2>
  <div class="prow"><label>wiring</label><select id="p-shuffle"><option value="none">real connectome</option><option value="class">shuffled (class-preserving control)</option></select></div>
  <div class="prow"><label>seed <span class="muted">(same seed = identical replay)</span></label><span><input id="p-seed" type="number" value="1" class="short" style="width:5.5em"> <label><input id="p-randomSeed" type="checkbox" checked> new each restart</label></span></div>
  <div class="prow"><label>observation gain</label><input id="p-observeGain" type="number" step="0.05" min="0" max="2"></div>
  <div class="prow"><label>temperature</label><input id="p-temperature" type="number" step="0.05" min="0.05"></div>
  <div class="prow"><label>trust bias</label><input id="p-trustBias" type="number" step="0.05"></div>
  <div class="prow"><label>forgetting / round</label><input id="p-forgetPerRound" type="number" step="0.01" min="0" max="1"></div>
  <div class="prow"><label>decision window, ms</label><input id="p-decisionMs" type="number" step="50" min="100"></div>
  <div class="prow"><label>learning window, ms</label><input id="p-learnMs" type="number" step="50" min="50"></div>
  <div class="prow"><label>payoff T / R / P / S</label><span><input id="p-T" type="number" class="short"> <input id="p-R" type="number" class="short"> <input id="p-P" type="number" class="short"> <input id="p-S" type="number" class="short"></span></div>
  <div class="prow"><label>ante per game</label><input id="p-ante" type="number" step="0.5"></div>
  <div class="prow"><label>start money</label><input id="p-startMoney" type="number"></div>
  <div class="prow"><label>clone jitter</label><input id="p-cloneJitter" type="number" step="0.05" min="0"></div>
  <button id="restart">Restart with these parameters</button>
</aside>
<main class="layout">
  <section id="arena"></section>
  <aside class="side">
    <section id="board"><h2>Ranking</h2><div id="lb"></div></section>
    <section id="trust"><h2>Trust <span class="muted">row = fly, col = opponent</span></h2><svg id="tm"></svg></section>
    <section id="timeline"><h2>Cooperation <span class="muted">last 200 decisions</span></h2><svg id="tl"></svg></section>
    <section id="log"><h2>Last games</h2><pre id="lg"></pre></section>
  </aside>
</main>`;
const status = document.getElementById('status')!;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const history: { round: number; coop: number }[] = [];
/** Speed: 1× = one round every 2 s (a game every half second); 20× ≈ as fast as the machine goes. */
let speedX = 1; const BASE_RPS = 0.5;
const speedSeg = document.getElementById('speed')!;
speedSeg.querySelectorAll('button').forEach((b) => (b.onclick = () => { speedX = Number(b.dataset.x); speedSeg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
const COOP = '#4cc9a4', DEFECT = '#e4572e';

const targetRps = () => BASE_RPS * speedX;

const circuit = await Circuit.load();
status.textContent = 'loading skeletons…';
const arena = await Arena.load(document.getElementById('arena')!, circuit, DEFAULT_GAME.nFlies);
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const NUM_FIELDS = ['observeGain', 'temperature', 'trustBias', 'forgetPerRound', 'decisionMs', 'learnMs', 'ante', 'startMoney', 'cloneJitter'] as const;
function fillParams(p: typeof DEFAULT_GAME) { for (const k of NUM_FIELDS) $(`p-${k}`).value = String(p[k]); for (const k of ['T', 'R', 'P', 'S'] as const) $(`p-${k}`).value = String(p.payoff[k]); $('p-seed').value = String(p.seed); }
function readParams(): typeof DEFAULT_GAME {
  const p: any = { ...DEFAULT_GAME, payoff: { ...DEFAULT_GAME.payoff } };
  for (const k of NUM_FIELDS) p[k] = Number($(`p-${k}`).value); for (const k of ['T', 'R', 'P', 'S'] as const) p.payoff[k] = Number($(`p-${k}`).value); p.seed = Number($('p-seed').value);
  return p;
}
fillParams(DEFAULT_GAME);
document.getElementById('toggle-params')!.onclick = () => { const a = document.getElementById('params')!; a.hidden = !a.hidden; };

let game: Game;
async function startGame() {
  playing = false; game?.dispose(); history.length = 0;
  if ($('p-randomSeed').checked) $('p-seed').value = String(1 + Math.floor(Math.random() * 1e6));
  const p = readParams(); const shuffle = $('p-shuffle').value as ShuffleMode;
  status.textContent = 'spawning ${DEFAULT_GAME.nFlies} brains…';
  game = await Game.create(circuit, p, async (id, seed) => { const f = new RemoteFly(); await f.init(p.sim, seed, shuffle, p.seed); return f; }, (m) => (status.textContent = m));
  render(game.snapshot()); status.textContent = `ready · seed ${p.seed}${shuffle === 'none' ? '' : ' · shuffled wiring'}`;
}
document.getElementById('restart')!.onclick = () => void startGame();
let playing = false, budget = Infinity, lastRender = 0;
await startGame();
// ?autoplay=N starts N rounds immediately (used for headless smoke tests)
const auto = new URLSearchParams(location.search).get('autoplay');

playBtn.onclick = () => { if (playing) { playing = false; playBtn.textContent = '▶ Play'; return; } playing = true; playBtn.textContent = '❚❚ Pause'; void loop(); };
async function loop() {
  while (playing && budget > 0) {
    const t0 = performance.now();
    await game.playRound(); budget--;
    const s = game.snapshot(); history.push({ round: s.round, coop: s.recentCoopRate });
    const now = performance.now();
    if (now - lastRender > 80 || budget === 0 || speedX <= 5) { render(s); lastRender = now; }
    status.textContent = `round ${s.round} · ${s.games} games · coop ${(100 * s.coopRate).toFixed(0)}%` + (speedX >= 20 ? ` · ${(1000 / (now - t0)).toFixed(1)} rounds/s` : '');
    const wait = 1000 / targetRps() - (performance.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  playing = false; playBtn.textContent = '▶ Play'; budget = Infinity;
}
if (auto) { $('p-randomSeed').checked = false; budget = Number(auto); speedX = 20; playBtn.click(); }

function render(s: Snapshot) {
  arena.update(s);
  const flies = [...s.flies].sort((a, b) => b.money - a.money); const max = Math.max(1, ...flies.map((f) => f.money));
  d3.select('#lb').selectAll('div.row').data(flies, (d: any) => d.id).join('div').attr('class', 'row').html((f) => {
    const cr = f.games ? f.coops / f.games : 0;
    return `<span class="name">${f.name}${f.lineage !== f.id ? `<sub>←F${f.lineage + 1}</sub>` : ''}</span>
      <span class="bar"><i style="width:${(100 * Math.max(0, f.money)) / max}%"></i></span>
      <span class="num">${f.money.toFixed(0)}</span>
      <span class="muted small">${f.games} games · coop ${(100 * cr).toFixed(0)}% · betrayed ${f.betrayed}</span>`;
  });
  const n = s.flies.length, cell = 26, pad = 24; const svg = d3.select('#tm').attr('width', pad + n * cell).attr('height', pad + n * cell);
  const color = d3.scaleDiverging([-1, 0, 1], (t) => d3.interpolateRgbBasis([DEFECT, '#1a1d24', COOP])(t)).clamp(true);
  const cells = s.trust.flatMap((row, i) => row.map((v, j) => ({ i, j, v })));
  svg.selectAll('rect').data(cells).join('rect').attr('x', (d) => pad + d.j * cell).attr('y', (d) => pad + d.i * cell).attr('width', cell - 2).attr('height', cell - 2)
    .attr('fill', (d) => (d.i === d.j ? '#0b0d12' : color(d.v))).select('title').remove();
  svg.selectAll('rect').append('title').text((d: any) => `F${d.i + 1} → F${d.j + 1}: ${d.v.toFixed(2)}`);
  svg.selectAll('text.c').data(s.flies).join('text').attr('class', 'c lbl').attr('x', (_, j) => pad + j * cell + cell / 2 - 1).attr('y', pad - 8).attr('text-anchor', 'middle').text((f) => f.name);
  svg.selectAll('text.r').data(s.flies).join('text').attr('class', 'r lbl').attr('x', pad - 6).attr('y', (_, i) => pad + i * cell + cell / 2 + 4).attr('text-anchor', 'end').text((f) => f.name);
  const W = 300, H = 90, m = { l: 34, r: 8, t: 6, b: 18 }; const tl = d3.select('#tl').attr('width', W).attr('height', H);
  const x = d3.scaleLinear([0, Math.max(10, s.round)], [m.l, W - m.r]), y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  tl.selectAll('path.l').data([history]).join('path').attr('class', 'l').attr('fill', 'none').attr('stroke', COOP).attr('stroke-width', 1.5)
    .attr('d', d3.line<{ round: number; coop: number }>().x((d) => x(d.round)).y((d) => y(d.coop)));
  tl.selectAll('g.ax').data([0]).join('g').attr('class', 'ax').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6) as any);
  tl.selectAll('g.ay').data([0]).join('g').attr('class', 'ay').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')) as any);
  document.getElementById('lg')!.textContent = s.last.slice().reverse().map((g) =>
    `r${String(g.round).padStart(4)}  F${g.a + 1} ${g.ca ? 'C' : 'D'} (${g.pcA.toFixed(2)})  vs  F${g.b + 1} ${g.cb ? 'C' : 'D'} (${g.pcB.toFixed(2)})   → ${g.pa}/${g.pb}`).join('\n');
}
