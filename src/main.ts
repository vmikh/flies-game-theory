import * as d3 from 'd3';
import { Circuit } from './circuit.ts';
import { Game, DEFAULT_GAME, type Snapshot } from './game.ts';
import { RemoteFly } from './remoteFly.ts';
import type { ShuffleMode } from './shuffle.ts';
import { Arena } from './arena.ts';
import { LESIONS, type Lesion } from './backend.ts';
import { t, getLang, setLang, onLang, strategyLabel, lesionLabel, lesionHint, type Key } from './i18n.ts';
import { renderAbout } from './about.ts';
import { initAnalytics, track } from './analytics.ts';

initAnalytics();

const app = document.getElementById('app')!;
app.innerHTML = `
<div class="left">
<header class="topbar">
  <h1 data-i18n="title"></h1>
  <span class="spacer"></span>
  <span class="seg" id="speed">${[1, 2, 5, 10, 20].map((x) => `<button data-x="${x}"${x === 1 ? ' class="on"' : ''}>${x}×</button>`).join('')}</span>
  <button id="play" class="btn btn-primary"></button>
  <button id="toggle-params" class="btn" data-i18n="parameters"></button>
  <button id="toggle-about" class="btn" data-i18n="about"></button>
  <button id="lang" class="btn btn-link"></button>
</header>
<div id="about" class="scrim" hidden>
  <div class="modal">
    <div class="modal-head"><h2 class="t-h3" data-i18n="title"></h2><button id="about-close" class="btn btn-sm" data-i18n="close"></button></div>
    <div id="about-body"></div>
  </div>
</div>
<div id="params-scrim" class="scrim" hidden>
<div id="params" class="modal">
  <div class="modal-head"><h2 class="t-h3" data-i18n="parameters"></h2></div>
  <div class="field"><label class="label"><span data-i18n="gossip"></span><span class="hint" data-i18n-html="gossipHint"></span></label><input class="input" id="p-observeGain" type="number" step="0.05" min="0" max="2"></div>
  <div class="field"><label class="label"><span data-i18n="forgetting"></span><span class="hint" data-i18n-html="forgettingHint"></span></label><input class="input" id="p-forgetPerRound" type="number" step="0.01" min="0" max="1"></div>
  <div class="field"><label class="label"><span data-i18n="trustBias"></span><span class="hint" data-i18n-html="trustBiasHint"></span></label><input class="input" id="p-trustBias" type="number" step="0.05"></div>
  <div class="field"><label class="label"><span data-i18n="payoffs"></span><span class="hint" data-i18n="payoffsHint"></span></label><select class="select" id="p-payoffPreset"><option value="5,3,1,0" data-i18n="presetClassic"></option><option value="5,4,1,0" data-i18n="presetGenerous"></option><option value="5,3,1,-1" data-i18n="presetHarsh"></option></select></div>
  <h2 class="section-h" data-i18n="lesions"></h2>
  <div id="lesions">${Array.from({ length: DEFAULT_GAME.nFlies }, (_, i) => `<div class="field compact"><label class="label">F${i + 1}</label><select class="select select-sm" id="p-lesion-${i}">${LESIONS.map((l) => `<option value="${l.id}"></option>`).join('')}</select></div>`).join('')}</div>
  <div class="legend"><div class="muted" data-i18n="mutationsHint"></div><dl id="lesion-legend"></dl></div>
  <details id="advanced" hidden><summary data-i18n="advanced"></summary>
    <div class="field compact"><label class="label" data-i18n="wiring"></label><select class="select select-sm" id="p-shuffle"><option value="none" data-i18n="realConnectome"></option><option value="class" data-i18n="shuffledControl"></option></select></div>
    <div class="field compact"><label class="label" data-i18n="seed"></label><span class="row"><input class="input input-sm" id="p-seed" type="number" value="1" style="width:6em"> <label class="check"><input id="p-randomSeed" type="checkbox" checked> <span data-i18n="newSeedEachRestart"></span></label></span></div>
    <div class="field compact"><label class="label" data-i18n="temperature"></label><input class="input input-sm" id="p-temperature" type="number" step="0.05" min="0.05"></div>
    <div class="field compact"><label class="label" data-i18n="decisionWindow"></label><input class="input input-sm" id="p-decisionMs" type="number" step="50" min="100"></div>
    <div class="field compact"><label class="label" data-i18n="learningWindow"></label><input class="input input-sm" id="p-learnMs" type="number" step="50" min="50"></div>
    <div class="field compact"><label class="label" data-i18n="antePerGame"></label><input class="input input-sm" id="p-ante" type="number" step="0.5"></div>
    <div class="field compact"><label class="label" data-i18n="startMoney"></label><input class="input input-sm" id="p-startMoney" type="number"></div>
    <div class="field compact"><label class="label" data-i18n="payoffMatrix"></label><span class="row"><input class="input input-sm" id="p-T" type="number" style="width:3.4em"><input class="input input-sm" id="p-R" type="number" style="width:3.4em"><input class="input input-sm" id="p-P" type="number" style="width:3.4em"><input class="input input-sm" id="p-S" type="number" style="width:3.4em"></span></div>
  </details>
  <div class="row modal-actions"><span class="spacer"></span><button id="params-cancel" class="btn" data-i18n="cancel"></button><button id="restart" class="btn btn-primary" data-i18n="apply"></button></div>
</div>
</div>
<main class="layout">
  <section id="arena"><div id="brain-loading" role="status" aria-live="polite" hidden></div><div id="caption" hidden><div id="cap-text"></div><div class="cap-btns"><button id="cap-back" class="btn" data-i18n="back"></button></div></div></section>
</main>
</div>
  <aside class="side island island-pad">
    <div class="side-status" id="status" hidden><div id="status-round"></div><div id="status-cooperative"></div><div class="status-extra" id="status-extra" hidden></div></div>
    <section id="board"><h2 data-i18n="ranking"></h2><div id="lb"></div></section>
    <hr class="divider">
    <section id="trust"><h2 data-i18n="trust"></h2><svg id="tm"></svg></section>
    <hr class="divider">
    <section id="timeline"><h2 data-i18n="cooperation"></h2><svg id="tl"></svg></section>
    <hr class="divider" id="log-divider" hidden>
    <section id="log" hidden><h2 data-i18n="lastGames"></h2><div id="lg"></div></section>
  </aside>`;
const status = document.getElementById('status')!;
const statusRound = document.getElementById('status-round')!;
const statusCooperative = document.getElementById('status-cooperative')!;
const statusExtra = document.getElementById('status-extra')!;
const brainLoading = document.getElementById('brain-loading')!;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const history: { round: number; coop: number }[] = [];
let lastSnap: Snapshot | null = null;
let playing = false, budget = Infinity, lastRender = 0;
let finishedTracked = false;
let rankingOrder: number[] = [];
const frozenSlots = new Map<number, number>();
let arenaRef: Arena | null = null;
let loadingStatus: { key: Key; vars: Record<string, string | number> } = { key: 'starting', vars: {} };
function showLoading(key: Key, vars: Record<string, string | number> = {}) {
  loadingStatus = { key, vars };
  status.hidden = true;
  brainLoading.textContent = t(key, vars);
  brainLoading.hidden = false;
}
function renderStatus(s: Snapshot) {
  brainLoading.hidden = true;
  statusRound.textContent = t('statusRound', { r: s.round });
  statusCooperative.textContent = t('statusCooperative', { c: (100 * s.coopRate).toFixed(0) });
  const extra = [currentShuffle !== 'none' ? t('shuffledWiring') : '', s.flies.filter((f) => f.alive).length < 2 ? t('gameOver') : ''].filter(Boolean);
  statusExtra.textContent = extra.join(' · ');
  statusExtra.hidden = extra.length === 0;
  status.hidden = false;
}

/** Write every static string for the current language. */
function applyStatic() {
  document.documentElement.lang = getLang();
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n as any)));
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml as any)));
  document.title = t('title');
  document.getElementById('toggle-about')!.title = t('aboutTitle');
  setPlayLabel();
  document.querySelectorAll<HTMLSelectElement>('#lesions select').forEach((sel) => Array.from(sel.options).forEach((o) => { o.textContent = lesionLabel(o.value); o.title = lesionHint(o.value); }));
  document.getElementById('lesion-legend')!.innerHTML = LESIONS.filter((l) => l.id !== 'none').map((l) => `<dt>${lesionLabel(l.id)}</dt><dd>${lesionHint(l.id)}</dd>`).join('');
  renderAbout(document.getElementById('about-body')!, getLang());
  document.getElementById('lang')!.textContent = getLang() === 'ru' ? 'EN' : 'RU';   // the link names the other language
}
function setPlayLabel() { playBtn.textContent = playing ? t('pause') : t('play'); }
document.getElementById('lang')!.onclick = () => { const lang = getLang() === 'ru' ? 'en' : 'ru'; setLang(lang); track('language_changed', { language: lang }); };
onLang(() => {
  applyStatic();
  if (lastSnap) { arenaRef?.setTags(currentParams.lesions.map((l) => (l === 'none' ? '' : lesionLabel(l)))); render(lastSnap); renderStatus(lastSnap); }
  else showLoading(loadingStatus.key, loadingStatus.vars);
});
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
const COOP = '#4CC9A4', DEFECT = '#E4572E', CELL_BG = '#232830';
const targetRps = () => BASE_RPS * speedX;

showLoading('starting');
const circuit = await Circuit.load();
showLoading('loadingSkeletons');
const arena = await Arena.load(document.getElementById('arena')!, circuit, DEFAULT_GAME.nFlies);
arenaRef = arena;
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
const paramsScrim = document.getElementById('params-scrim')!;
let currentParams: typeof DEFAULT_GAME = DEFAULT_GAME; let currentShuffle: ShuffleMode = 'none';
function openParams() { fillParams(currentParams); for (let i = 0; i < DEFAULT_GAME.nFlies; i++) $(`p-lesion-${i}`).value = currentParams.lesions[i] ?? 'none'; $('p-shuffle').value = currentShuffle; paramsScrim.hidden = false; }
function closeParams() { paramsScrim.hidden = true; }
document.getElementById('toggle-params')!.onclick = () => { if (paramsScrim.hidden) { openParams(); track('parameters_opened'); } else closeParams(); };
document.getElementById('params-cancel')!.onclick = closeParams;
paramsScrim.onclick = (e) => { if (e.target === paramsScrim) closeParams(); };
const about = document.getElementById('about')!;
document.getElementById('toggle-about')!.onclick = () => { about.hidden = !about.hidden; if (!about.hidden) track('about_opened'); };
document.getElementById('about-close')!.onclick = () => (about.hidden = true);
about.onclick = (e) => { if (e.target === about) about.hidden = true; };
addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { about.hidden = true; closeParams(); } });

let game: Game;
let loopTask: Promise<void> | null = null;
let starting = false;
let gameVersion = 0;
async function startGame() {
  if (starting) return;
  starting = true; gameVersion++; playing = false; setPlayLabel();
  try {
    if (loopTask) await loopTask.catch(() => {}); // finish the current round before releasing its workers
    game?.dispose(); lastSnap = null; history.length = 0; rankingOrder = []; frozenSlots.clear(); finishedTracked = false; arena.focus(null);
    if ($('p-randomSeed').checked) $('p-seed').value = String(1 + Math.floor(Math.random() * 1e6));
    const p = readParams(); const shuffle = $('p-shuffle').value as ShuffleMode; currentParams = p; currentShuffle = shuffle;
    showLoading('spawning', { n: p.nFlies });
    game = await Game.create(circuit, p, async (id, seed, lesion) => { const f = new RemoteFly(); await f.init(p.sim, seed, shuffle, p.seed, lesion); return f; }, () => showLoading('building'));
    track('simulation_started', { mutations: p.lesions.filter((l) => l !== 'none').length, shuffled_wiring: shuffle !== 'none' });
    arena.setTags(p.lesions.map((l) => (l === 'none' ? '' : lesionLabel(l))));
    const initial = game.snapshot(); render(initial); renderStatus(initial);
  } finally { starting = false; }
}
document.getElementById('restart')!.onclick = () => { closeParams(); void startGame(); };
const capEl = document.getElementById('caption')!, capText = document.getElementById('cap-text')!;
function caption(b: number) {
  const s = lastSnap; if (!s) return; const f = s.flies[b]; const st = f.strategy;
  const behavior = (label: string, value: number | null, n: number, tone: string) =>
    `<div class="cap-behavior ${tone}"><span class="cap-behavior-label">${label}</span><strong>${value === null ? '—' : Math.round(100 * value) + '%'}</strong><span class="cap-behavior-sample">${value === null ? t('choiceNoData') : t('sampleGames', { n })}</span></div>`;
  const rec = [...s.last].reverse().find((r) => r.a === b || r.b === b);
  let html = `<div class="cap-head"><div class="cap-identity"><span class="cap-name">${f.name}</span>${f.lesion !== 'none' ? `<span class="tag lesion">${lesionLabel(f.lesion)}</span>` : ''}</div>${st.label === '…' ? '' : `<span class="cap-strat">${strategyLabel(st.label)}</span>`}</div>
    <div class="cap-metrics">
      <div><strong>${f.money.toFixed(0)}</strong><span>${t('money')}</span></div>
      <div><strong>${f.games}</strong><span>${t('games')}</span></div>
      <div><strong>${f.games ? Math.round(100 * f.coops / f.games) : 0}%</strong><span>${t('cooperates')}</span></div>
    </div>
    <section class="cap-section"><h3>${t('choiceRates')}</h3>
      <div class="cap-behaviors">${behavior(t('afterC'), st.reciprocity, st.nAfterC, 'coop')}${behavior(t('afterD'), st.forgiveness, st.nAfterD, 'defect')}</div>
    </section>`;
  if (rec) {
    const me = rec.a === b; const opp = me ? rec.b : rec.a; const myC = me ? rec.ca : rec.cb, oppC = me ? rec.cb : rec.ca, pay = me ? rec.pa : rec.pb, sc = me ? rec.scoreA : rec.scoreB, pc = me ? rec.pcA : rec.pcB;
    html += `<section class="cap-section cap-last"><div class="cap-section-head"><h3>${t('lastGame')}</h3><span>${t('roundAgainst', { r: rec.round, o: opp + 1 })}</span></div>
      <div class="cap-actions">
        <div><span>${f.name}</span><strong class="${myC ? 'coop' : 'defect'}">${myC ? t('cooperated') : t('defected')}</strong></div>
        <div><span>F${opp + 1}</span><strong class="${oppC ? 'coop' : 'defect'}">${oppC ? t('cooperated') : t('defected')}</strong></div>
      </div>
      <div class="cap-result"><span>${t('payoff')} <strong>${pay > 0 ? '+' : ''}${pay}</strong></span><span class="${game.payoffValence(pay) > 0 ? 'pam' : 'ppl1'}">${game.payoffValence(pay) > 0 ? t('reward') : t('punishment')}</span></div>
      <div class="cap-brain"><span>${t('approachMinusAvoid')} <b>${sc >= 0 ? '+' : ''}${sc.toFixed(2)}</b></span><span>${t('coopChance')} <b>${Math.round(pc * 100)}%</b></span></div>
    </section>`;
  }
  capText.innerHTML = html;
}
arena.onFocus = (b) => { capEl.hidden = b === null; if (b !== null) { caption(b); track('fly_focused', { fly: b + 1 }); } else track('fly_unfocused'); };
document.getElementById('cap-back')!.onclick = () => arena.focus(null);
await startGame();
// ?autoplay=N starts N rounds immediately (used for headless smoke tests)
const auto = new URLSearchParams(location.search).get('autoplay');

playBtn.onclick = async () => {
  if (playing) { playing = false; track('simulation_paused', { round: game.round }); setPlayLabel(); return; }
  const version = gameVersion;
  if (loopTask) await loopTask.catch(() => {});
  if (starting || version !== gameVersion) return;
  playing = true; track('simulation_played', { round: game.round, speed: speedX }); setPlayLabel();
  const task = loop(); loopTask = task;
  void task.then(() => { if (loopTask === task) loopTask = null; }, (err) => { if (loopTask === task) loopTask = null; playing = false; setPlayLabel(); console.error(err); });
};
async function loop() {
  while (playing && budget > 0) {
    const t0 = performance.now();
    game.recordFrames = speedX <= 2;   // activity movies only when slow enough to watch
    if (game.over) { playing = false; break; }
    await game.playRound(); budget--;
    const s = game.snapshot(); history.push({ round: s.round, coop: s.recentCoopRate });
    const now = performance.now();
    if (now - lastRender > 80 || budget === 0 || speedX <= 5 || game.over) { render(s); lastRender = now; }
    renderStatus(s);
    const wait = 1000 / targetRps() - (performance.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  if (game.over && !finishedTracked) { track('simulation_finished', { rounds: game.round, games: game.gamesPlayed }); finishedTracked = true; }
  playing = false; setPlayLabel(); budget = Infinity;
}
if (auto) { $('p-randomSeed').checked = false; budget = Number(auto); speedX = Number(new URLSearchParams(location.search).get('speed') ?? 20); playBtn.click(); }

function render(s: Snapshot) {
  lastSnap = s; arena.update(s); if (arena.focused !== null) caption(arena.focused);
  if (!rankingOrder.length) rankingOrder = [...s.flies].sort((a, b) => b.money - a.money || a.id - b.id).map((f) => f.id);
  for (const f of s.flies) if (!f.alive && !frozenSlots.has(f.id)) frozenSlots.set(f.id, rankingOrder.indexOf(f.id));
  const open = s.flies.filter((f) => f.alive).sort((a, b) => b.money - a.money || a.id - b.id);
  const ordered: typeof s.flies = []; let next = 0;
  for (let slot = 0; slot < s.flies.length; slot++) {
    const fixed = [...frozenSlots].find(([, pos]) => pos === slot);
    ordered.push(fixed ? s.flies[fixed[0]] : open[next++]);
  }
  rankingOrder = ordered.map((f) => f.id);
  const flies = ordered; const max = Math.max(1, ...flies.map((f) => f.money));
  d3.select('#lb').selectAll('div.row-fly').data(flies, (d: any) => d.id).join('div').attr('class', (f) => `row-fly${f.alive ? '' : ' dead'}`).html((f) => {
    const cr = f.games ? f.coops / f.games : 0;
    const tags = f.lesion !== 'none' ? `<span class="tag lesion">${lesionLabel(f.lesion)}</span>` : '';
    const stats = [!f.alive ? t('roundsStat', { n: f.eliminatedRound ?? s.round }) : '', f.games ? t('stats', { c: (100 * cr).toFixed(0), b: f.betrayed }) : ''].filter(Boolean).join(' · ');
    const top = stats || tags ? `<div class="r0"><span class="stats">${stats}</span><span class="tags">${tags}</span></div>` : '';
    const bottom = f.games ? `<div class="r2"><span class="strat">${stratGlyph(f.strategy)}<span class="strat-label">${strategyLabel(f.strategy.label)}</span></span></div>` : '';
    return `${top}<div class="r1"><span class="name">${f.name}</span>
        <span class="meter meter-ok"><i style="width:${(100 * Math.max(0, f.money)) / max}%"></i></span><span class="num">${f.money.toFixed(0)}</span></div>${bottom}`;
  });
  const n = s.flies.length, cell = 26, pad = 24; const svg = d3.select('#tm').attr('width', pad + n * cell).attr('height', pad + n * cell);
  const color = d3.scaleDiverging([-1, 0, 1], (x) => d3.interpolateRgbBasis([DEFECT, CELL_BG, COOP])(x)).clamp(true);
  const cells = s.trust.flatMap((row, i) => row.map((v, j) => ({ i, j, v })));
  svg.selectAll('rect').data(cells).join('rect').attr('x', (d) => pad + d.j * cell).attr('y', (d) => pad + d.i * cell).attr('width', cell - 2).attr('height', cell - 2)
    .attr('fill', (d) => (d.i === d.j ? '#171A21' : color(d.v))).select('title').remove();
  svg.selectAll('rect').append('title').text((d: any) => `F${d.i + 1} → F${d.j + 1}: ${d.v.toFixed(2)}`);
  svg.selectAll('text.c').data(s.flies).join('text').attr('class', 'c lbl').attr('x', (_, j) => pad + j * cell + cell / 2 - 1).attr('y', pad - 8).attr('text-anchor', 'middle').text((f) => f.name);
  svg.selectAll('text.r').data(s.flies).join('text').attr('class', 'r lbl').attr('x', pad - 6).attr('y', (_, i) => pad + i * cell + cell / 2 + 4).attr('text-anchor', 'end').text((f) => f.name);
  const W = 300, H = 90, m = { l: 40, r: 8, t: 6, b: 18 }; const tl = d3.select('#tl').attr('width', W).attr('height', H);
  const x = d3.scaleLinear([0, Math.max(10, s.round)], [m.l, W - m.r]), y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  tl.selectAll('path.l').data([history]).join('path').attr('class', 'l').attr('fill', 'none').attr('stroke', COOP).attr('stroke-width', 1.5)
    .attr('d', d3.line<{ round: number; coop: number }>().x((d) => x(d.round)).y((d) => y(d.coop)));
  tl.selectAll('g.ax').data([0]).join('g').attr('class', 'ax').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6) as any);
  tl.selectAll('g.ay').data([0]).join('g').attr('class', 'ay').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')) as any);
  const fly = (id: number, c: boolean, p: number) => `<span class="${c ? 'c' : 'd'}" title="${c ? t('cooperated') : t('defected')} · ${t('pCoop')} = ${p.toFixed(2)}">F${id + 1}</span>`;
  const hasLog = s.games > 0; document.getElementById('log')!.hidden = !hasLog; document.getElementById('log-divider')!.hidden = !hasLog;
  document.getElementById('lg')!.innerHTML = s.last.slice().reverse().map((g) =>
    `<div class="lrow"><span class="muted">${t('roundShort', { r: g.round })}</span><span>${fly(g.a, g.ca, g.pcA)} ${t('versus')} ${fly(g.b, g.cb, g.pcB)}</span><span class="muted">→</span><span>${g.pa}/${g.pb}</span></div>`).join('');
}
