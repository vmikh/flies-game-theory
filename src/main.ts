import * as d3 from 'd3';
import { Circuit } from './circuit.ts';
import { Game, DEFAULT_GAME, type Snapshot } from './game.ts';
import { RemoteFly } from './remoteFly.ts';
import type { ShuffleMode } from './shuffle.ts';
import { Arena } from './arena.ts';
import { LESIONS, type Lesion } from './backend.ts';
import { t, getLang, setLang, onLang, strategyLabel, lesionLabel, lesionHint, type Lang } from './i18n.ts';
import { aboutHtml } from './about.ts';

const app = document.getElementById('app')!;
app.innerHTML = `
<header>
  <h1 data-i18n="title"></h1>
  <span class="muted" id="status"></span>
  <span class="spacer"></span>
  <span class="seg" id="lang"><button data-l="en">EN</button><button data-l="ru">RU</button></span>
  <span class="seg" id="speed">${[1, 2, 5, 10, 20].map((x) => `<button data-x="${x}"${x === 1 ? ' class="on"' : ''}>${x}×</button>`).join('')}</span>
  <button id="play"></button>
  <button id="toggle-params" data-i18n="parameters"></button>
  <button id="toggle-about" class="icon">i</button>
</header>
<div id="about" hidden>
  <div class="about-card">
    <div class="about-head"><h2 data-i18n="title"></h2><button id="about-close" class="icon">×</button></div>
    <div id="about-body"></div>
  </div>
</div>
<aside id="params" hidden>
  <h2><span data-i18n="experiment"></span> <span class="muted" data-i18n="restartApplies"></span></h2>
  <div class="prow"><label><span data-i18n="gossip"></span><span class="hint" data-i18n="gossipHint"></span></label><input id="p-observeGain" type="number" step="0.05" min="0" max="2"></div>
  <div class="prow"><label><span data-i18n="forgetting"></span><span class="hint" data-i18n="forgettingHint"></span></label><input id="p-forgetPerRound" type="number" step="0.01" min="0" max="1"></div>
  <div class="prow"><label><span data-i18n="trustBias"></span><span class="hint" data-i18n="trustBiasHint"></span></label><input id="p-trustBias" type="number" step="0.05"></div>
  <div class="prow"><label><span data-i18n="payoffs"></span><span class="hint" data-i18n="payoffsHint"></span></label><select id="p-payoffPreset"><option value="5,3,1,0" data-i18n="presetClassic"></option><option value="5,4,1,0" data-i18n="presetGenerous"></option><option value="8,3,1,0" data-i18n="presetHarsh"></option></select></div>
  <h2 style="margin-top:10px"><span data-i18n="lesions"></span> <span class="muted" data-i18n="perFly"></span></h2>
  <div id="lesions">${Array.from({ length: DEFAULT_GAME.nFlies }, (_, i) => `<div class="prow"><label>F${i + 1}</label><select id="p-lesion-${i}">${LESIONS.map((l) => `<option value="${l.id}"></option>`).join('')}</select></div>`).join('')}</div>
  <div class="legend"><div class="muted" data-i18n="mutationsHint"></div><dl id="lesion-legend"></dl></div>
  <details id="advanced" hidden><summary data-i18n="advanced"></summary>
    <div class="prow"><label>wiring</label><select id="p-shuffle"><option value="none">real connectome</option><option value="class">shuffled (control)</option></select></div>
    <div class="prow"><label>seed</label><span><input id="p-seed" type="number" value="1" class="short" style="width:5.5em"> <label><input id="p-randomSeed" type="checkbox" checked> new each restart</label></span></div>
    <div class="prow"><label>temperature</label><input id="p-temperature" type="number" step="0.05" min="0.05"></div>
    <div class="prow"><label>decision window, ms</label><input id="p-decisionMs" type="number" step="50" min="100"></div>
    <div class="prow"><label>learning window, ms</label><input id="p-learnMs" type="number" step="50" min="50"></div>
    <div class="prow"><label>ante per game</label><input id="p-ante" type="number" step="0.5"></div>
    <div class="prow"><label>start money</label><input id="p-startMoney" type="number"></div>
    <div class="prow"><label>payoff T / R / P / S</label><span><input id="p-T" type="number" class="short"> <input id="p-R" type="number" class="short"> <input id="p-P" type="number" class="short"> <input id="p-S" type="number" class="short"></span></div>
  </details>
  <button id="restart" data-i18n="restart"></button>
</aside>
<main class="layout">
  <section id="arena"><div id="caption" hidden><div id="cap-text"></div><div class="cap-btns"><button id="cap-back"><span data-i18n="back"></span> <span class="muted">Esc</span></button></div></div></section>
  <aside class="side">
    <section id="board"><h2 data-i18n="ranking"></h2><div id="lb"></div></section>
    <section id="trust"><h2 data-i18n="trust"></h2><div class="sub" data-i18n-html="trustSub"></div><svg id="tm"></svg></section>
    <section id="timeline"><h2 data-i18n="cooperation"></h2><div class="sub" data-i18n="cooperationSub"></div><svg id="tl"></svg></section>
    <section id="log"><h2 data-i18n="lastGames"></h2><div id="lg"></div></section>
  </aside>
</main>`;
const status = document.getElementById('status')!;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const history: { round: number; coop: number }[] = [];
let lastSnap: Snapshot | null = null;
let playing = false, budget = Infinity, lastRender = 0;

/** Write every static string for the current language. */
function applyStatic() {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n as any)));
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml as any)));
  document.title = t('title');
  document.getElementById('toggle-about')!.title = t('aboutTitle');
  playBtn.textContent = playing ? t('pause') : t('play');
  document.querySelectorAll<HTMLSelectElement>('#lesions select').forEach((sel) => Array.from(sel.options).forEach((o) => { o.textContent = lesionLabel(o.value); o.title = lesionHint(o.value); }));
  document.getElementById('lesion-legend')!.innerHTML = LESIONS.filter((l) => l.id !== 'none').map((l) => `<dt>${lesionLabel(l.id)}</dt><dd>${lesionHint(l.id)}</dd>`).join('');
  document.getElementById('about-body')!.innerHTML = aboutHtml(getLang());
  document.querySelectorAll<HTMLButtonElement>('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.l === getLang()));
}
document.querySelectorAll<HTMLButtonElement>('#lang button').forEach((b) => (b.onclick = () => setLang(b.dataset.l as Lang)));
onLang(() => { applyStatic(); if (lastSnap) render(lastSnap); if (arenaRef && arenaRef.focused !== null) caption(arenaRef.focused); });
applyStatic();

/** Three tiny bars: cooperation on first meeting, after the opponent cooperated, after it defected. */
function stratGlyph(s: Snapshot['flies'][number]['strategy']) {
  const bar = (v: number | null, tt: string) => `<i title="${tt}: ${v === null ? '—' : Math.round(100 * v) + '%'}" style="height:${v === null ? 2 : 2 + 12 * v}px;opacity:${v === null ? 0.3 : 1}"></i>`;
  return `<span class="bars">${bar(s.trust, t('firstMeeting'))}${bar(s.reciprocity, t('afterOppC'))}${bar(s.forgiveness, t('afterOppD'))}</span>`;
}
/** Speed: 1× = one round every 2 s (a game every half second); 20× ≈ as fast as the machine goes. */
let speedX = 1; const BASE_RPS = 0.5;
const speedSeg = document.getElementById('speed')!;
speedSeg.querySelectorAll('button').forEach((b) => (b.onclick = () => { speedX = Number(b.dataset.x); speedSeg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
const COOP = '#4cc9a4', DEFECT = '#e4572e';
const targetRps = () => BASE_RPS * speedX;

status.textContent = t('starting');
const circuit = await Circuit.load();
status.textContent = t('loadingSkeletons');
const arena = await Arena.load(document.getElementById('arena')!, circuit, DEFAULT_GAME.nFlies);
let arenaRef: Arena | null = arena;
const NUM_FIELDS = ['observeGain', 'temperature', 'trustBias', 'forgetPerRound', 'decisionMs', 'learnMs', 'ante', 'startMoney'] as const;
function fillParams(p: typeof DEFAULT_GAME) { for (const k of NUM_FIELDS) $(`p-${k}`).value = String(p[k]); for (const k of ['T', 'R', 'P', 'S'] as const) $(`p-${k}`).value = String(p.payoff[k]); $('p-seed').value = String(p.seed); }
function readParams(): typeof DEFAULT_GAME {
  const p: any = { ...DEFAULT_GAME, payoff: { ...DEFAULT_GAME.payoff } };
  for (const k of NUM_FIELDS) p[k] = Number($(`p-${k}`).value); for (const k of ['T', 'R', 'P', 'S'] as const) p.payoff[k] = Number($(`p-${k}`).value); p.seed = Number($('p-seed').value);
  p.lesions = Array.from({ length: DEFAULT_GAME.nFlies }, (_, i) => $(`p-lesion-${i}`).value as Lesion);
  return p;
}
fillParams(DEFAULT_GAME);
// technical settings stay in the DOM (they feed readParams) but are shown only with ?advanced in the URL
if (new URLSearchParams(location.search).has('advanced')) document.getElementById('advanced')!.hidden = false;
const presetSel = $('p-payoffPreset') as unknown as HTMLSelectElement;
presetSel.onchange = () => { const [T, R, P, S] = presetSel.value.split(',').map(Number); $('p-T').value = String(T); $('p-R').value = String(R); $('p-P').value = String(P); $('p-S').value = String(S); };
document.getElementById('toggle-params')!.onclick = () => { const a = document.getElementById('params')!; a.hidden = !a.hidden; };
const about = document.getElementById('about')!;
document.getElementById('toggle-about')!.onclick = () => (about.hidden = !about.hidden);
document.getElementById('about-close')!.onclick = () => (about.hidden = true);
about.onclick = (e) => { if (e.target === about) about.hidden = true; };
addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') about.hidden = true; });

let game: Game;
async function startGame() {
  playing = false; game?.dispose(); history.length = 0;
  if ($('p-randomSeed').checked) $('p-seed').value = String(1 + Math.floor(Math.random() * 1e6));
  const p = readParams(); const shuffle = $('p-shuffle').value as ShuffleMode;
  status.textContent = t('spawning', { n: p.nFlies });
  game = await Game.create(circuit, p, async (id, seed, lesion) => { const f = new RemoteFly(); await f.init(p.sim, seed, shuffle, p.seed, lesion); return f; }, () => (status.textContent = t('building')));
  arena.setTags(p.lesions.map((l) => (l === 'none' ? '' : lesionLabel(l))));
  render(game.snapshot()); status.textContent = shuffle === 'none' ? '' : t('shuffledWiring');
}
document.getElementById('restart')!.onclick = () => void startGame();
const capEl = document.getElementById('caption')!, capText = document.getElementById('cap-text')!;
function caption(b: number) {
  const s = lastSnap; if (!s) return; const f = s.flies[b]; const m = s.movies[b]; const st = f.strategy;
  const pct = (v: number | null) => (v === null ? '—' : Math.round(100 * v) + '%');
  const rec = [...s.last].reverse().find((r) => r.a === b || r.b === b);
  let html = `<div class="cap-head"><span class="cap-name">${f.name}${f.lesion !== 'none' ? ` <span class="tag lesion">${lesionLabel(f.lesion)}</span>` : ''}</span><span class="cap-strat">${stratGlyph(st)} ${strategyLabel(st.label)}</span></div>
    <div class="cap-stats">${f.money.toFixed(0)} ${t('money')} · ${f.games} ${t('games')} · ${t('cooperates')} ${f.games ? Math.round(100 * f.coops / f.games) : 0}%</div>
    <div class="cap-stats muted">${t('firstMeeting')} ${pct(st.trust)} · ${t('afterC')} ${pct(st.reciprocity)} · ${t('afterD')} ${pct(st.forgiveness)}</div>`;
  if (rec) {
    const me = rec.a === b; const opp = me ? rec.b : rec.a; const myC = me ? rec.ca : rec.cb, oppC = me ? rec.cb : rec.ca, pay = me ? rec.pa : rec.pb, sc = me ? rec.scoreA : rec.scoreB, pc = me ? rec.pcA : rec.pcB;
    const row = (k: string, v: string) => `<div class="cap-row"><span class="cap-k">${k}</span><span class="cap-v">${v}</span></div>`;
    html += `<div class="cap-title">${t('lastGame', { r: rec.round, o: opp + 1 })}</div>
      ${row(t('smells', { o: opp + 1 }), `${t('approachMinusAvoid')} <b>${sc >= 0 ? '+' : ''}${sc.toFixed(2)}</b>`)}
      ${row(t('decides'), `<b class="${myC ? 'c' : 'd'}">${myC ? t('decCoop') : t('decDefect')}</b> <span class="muted">p = ${pc.toFixed(2)}</span>`)}
      ${row('F' + (opp + 1), `<b class="${oppC ? 'c' : 'd'}">${oppC ? t('decCoop') : t('decDefect')}</b>`)}
      ${row(t('payoff'), `<b>${pay}</b> → ${pay >= 3 ? `<span class="pam">${t('reward')}</span>` : `<span class="ppl1">${t('punishment')}</span>`}`)}`;
  }
  if (m && !m.decision) html += `<div class="cap-note muted">${t('movieNote')}</div>`;
  capText.innerHTML = html;
}
arena.onFocus = (b) => { capEl.hidden = b === null; if (b !== null) caption(b); };
document.getElementById('cap-back')!.onclick = () => arena.focus(null);
await startGame();
// ?autoplay=N starts N rounds immediately (used for headless smoke tests)
const auto = new URLSearchParams(location.search).get('autoplay');

playBtn.onclick = () => { if (playing) { playing = false; playBtn.textContent = t('play'); return; } playing = true; playBtn.textContent = t('pause'); void loop(); };
async function loop() {
  while (playing && budget > 0) {
    const t0 = performance.now();
    game.recordFrames = speedX <= 2;   // activity movies only when slow enough to watch
    if (game.over) { playing = false; break; }
    await game.playRound(); budget--;
    const s = game.snapshot(); history.push({ round: s.round, coop: s.recentCoopRate });
    const now = performance.now();
    if (now - lastRender > 80 || budget === 0 || speedX <= 5) { render(s); lastRender = now; }
    status.textContent = t('statusLine', { r: s.round, g: s.games, c: (100 * s.coopRate).toFixed(0) }) + (speedX >= 20 ? ` · ${t('roundsPerSec', { v: (1000 / (now - t0)).toFixed(1) })}` : '') + (game.over ? ` · ${t('gameOver')}` : '');
    const wait = 1000 / targetRps() - (performance.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  playing = false; playBtn.textContent = t('play'); budget = Infinity;
}
if (auto) { $('p-randomSeed').checked = false; budget = Number(auto); speedX = Number(new URLSearchParams(location.search).get('speed') ?? 20); playBtn.click(); }

function render(s: Snapshot) {
  lastSnap = s; arena.update(s); if (arena.focused !== null) caption(arena.focused);
  const flies = [...s.flies].sort((a, b) => b.money - a.money); const max = Math.max(1, ...flies.map((f) => f.money));
  d3.select('#lb').selectAll('div.row').data(flies, (d: any) => d.id).join('div').attr('class', (f) => `row${f.alive ? '' : ' dead'}`).html((f) => {
    const cr = f.games ? f.coops / f.games : 0;
    const tags = `${!f.alive ? `<span class="tag out">${t('out')}</span>` : ''}${f.lesion !== 'none' ? `<span class="tag lesion">${lesionLabel(f.lesion)}</span>` : ''}`;
    return `<div class="r1"><span class="name">${f.name}</span>
        <span class="bar"><i style="width:${(100 * Math.max(0, f.money)) / max}%"></i></span><span class="num">${f.money.toFixed(0)}</span></div>
      <div class="r2"><span class="strat">${stratGlyph(f.strategy)}<span class="strat-label">${strategyLabel(f.strategy.label)}</span>${tags}</span>
        <span class="stats">${t('stats', { g: f.games, c: (100 * cr).toFixed(0), b: f.betrayed })}</span></div>`;
  });
  const n = s.flies.length, cell = 26, pad = 24; const svg = d3.select('#tm').attr('width', pad + n * cell).attr('height', pad + n * cell);
  const color = d3.scaleDiverging([-1, 0, 1], (x) => d3.interpolateRgbBasis([DEFECT, '#1a1d24', COOP])(x)).clamp(true);
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
  const fly = (id: number, c: boolean, p: number) => `<span class="${c ? 'c' : 'd'}" title="${c ? t('cooperated') : t('defected')} · ${t('pCoop')} = ${p.toFixed(2)}">F${id + 1}</span>`;
  document.getElementById('lg')!.innerHTML = s.last.slice().reverse().map((g) =>
    `<div class="lrow"><span class="muted">R${g.round}</span><span>${fly(g.a, g.ca, g.pcA)} vs ${fly(g.b, g.cb, g.pcB)}</span><span class="muted">→</span><span>${g.pa}/${g.pb}</span></div>`).join('');
}
