import * as d3 from 'd3';
import { Circuit } from './circuit.ts';
import { Game, DEFAULT_GAME, type Snapshot } from './game.ts';
import { RemoteFly } from './remoteFly.ts';
import type { ShuffleMode } from './shuffle.ts';
import { Arena } from './arena.ts';
import { LESIONS, type Lesion } from './backend.ts';

const app = document.getElementById('app')!;
app.innerHTML = `
<header>
  <h1>Flies · Game Theory</h1>
  <span class="muted" id="status">starting…</span>
  <span class="spacer"></span>
  <span class="seg" id="speed">${[1, 2, 5, 10, 20].map((x) => `<button data-x="${x}"${x === 1 ? ' class="on"' : ''}>${x}×</button>`).join('')}</span>
  <button id="play">▶ Play</button>
  <button id="toggle-params">Parameters</button>
  <button id="toggle-about" class="icon" title="About this experiment">i</button>
</header>
<div id="about" hidden>
  <div class="about-card">
    <div class="about-head"><h2>Flies · Game Theory</h2><button id="about-close" class="icon">×</button></div>
    <p>Eight fruit-fly brains play an iterated prisoner's dilemma against each other. Nothing about the game is programmed into them:
    each fly decides by smelling its opponent and either approaching or avoiding, and learns only the way a real fly learns, through dopamine.</p>

    <h3>The experiment</h3>
    <p>Every fly is an <b>identity odour</b>: a private set of 7 glomeruli of the antennal lobe. Approaching the odour means <b>cooperate</b>, avoiding it means <b>defect</b>.
    The payoff of each game (5 / 3 / 1 / 0) becomes dopamine: a good outcome drives the reward neurons (PAM), a bad one the punishment neurons (PPL1).
    Flies also watch the other games and get a weaker dopamine signal about what each player did (gossip). A fly with no money left is replaced by a mutated clone of the leader.
    Strategies are not written anywhere; they are read off the behaviour afterwards, Axelrod-style: how often a fly cooperates on a first meeting, after the opponent cooperated, after it defected.</p>

    <h3>Under the hood</h3>
    <ul>
      <li><b>Wiring</b>: the mushroom body of the right hemisphere from the <a href="https://male-cns.janelia.org/" target="_blank">Male CNS v1.0 connectome</a> (HHMI Janelia FlyEM, Google Research, Cambridge, MRC LMB; CC-BY 4.0):
        2 609 neurons, 118 773 connections with ≥3 synapses: projection neurons, 2 045 Kenyon cells, 49 MBONs, 170 dopaminergic neurons, APL, DPM. Neurotransmitter signs from the dataset's predictions.
        <a href="https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/" target="_blank">Google Research announcement</a>.</li>
      <li><b>Neurons</b>: leaky integrate-and-fire, 1 ms steps, 0.275 mV per synapse, parameters after <a href="https://www.nature.com/articles/s41586-024-07763-9" target="_blank">Shiu et al., Nature 2024</a> (whole-brain model of the female fly).
        Each fly runs in its own Web Worker; 400 ms of brain time takes ~8 ms.</li>
      <li><b>Odour coding</b>: PN→PN and KC→KC synapses are silenced and PN input per Kenyon cell is normalised; with that, each odour lights up 3–8 % of Kenyon cells and different odours overlap by ~5 %.</li>
      <li><b>Learning</b>: dopamine-gated depression of Kenyon cell → MBON synapses in the compartments the active dopamine neurons innervate. The compartment map comes straight from the connectome
        (PPL1 → MBON11/12/14…, PAM → MBON01–07, 09…), matching <a href="https://elifesciences.org/articles/04577" target="_blank">Aso et al., eLife 2014</a>. Only externally driven dopamine teaches; memories fade slowly.</li>
      <li><b>Decision</b>: MBONs in PPL1 compartments push toward approach, MBONs in PAM compartments toward avoidance. The score is the change of each population relative to the fly's naive response to that odour,
        so a stranger is a coin flip, a fully punished odour is avoided, a fully rewarded one approached.</li>
      <li><b>Control</b>: with the wiring shuffled (same classes, same synapse counts, random targets) odour codes overlap 5× more, learning spills over to the wrong opponents and trust stops tracking behaviour.
        The specific connectome does the work.</li>
      <li><b>Drawing</b>: real EM skeletons of the same neurons (30 % of Kenyon cells), additive HDR rendering in <a href="https://threejs.org/" target="_blank">three.js</a>; panels in <a href="https://d3js.org/" target="_blank">d3</a>. At 1× and 2× the brains replay the actual spikes of each decision and the dopamine that followed.</li>
    </ul>

    <h3>Links</h3>
    <ul>
      <li>Source code: <a href="https://github.com/vmikh/flies-game-theory" target="_blank">github.com/vmikh/flies-game-theory</a></li>
      <li>Data: <a href="https://male-cns.janelia.org/download/" target="_blank">Male CNS downloads</a> · <a href="https://neuprint.janelia.org/?dataset=male-cns%3Av1.0" target="_blank">neuPrint</a> · <a href="https://www.cell.com/cell/fulltext/S0092-8674(26)00815-2" target="_blank">Cell, 2026: sexual dimorphism in the complete male CNS connectome</a></li>
      <li>Female brain for comparison: <a href="https://flywire.ai/" target="_blank">FlyWire</a></li>
      <li>Game theory: R. Axelrod, <i>The Evolution of Cooperation</i> (1984)</li>
    </ul>
    <p class="muted">This is a model constrained by the connectome, not a recording of a fly. Wiring, synapse counts and transmitter signs are data; the learning rule, the decision readout and the mapping of payoffs to dopamine are modelling choices.</p>
  </div>
</div>
<aside id="params" hidden>
  <h2>Experiment <span class="muted">(Restart applies)</span></h2>
  <div class="prow"><label>gossip <span class="hint">how much a fly learns from games it only watches; 0 = own experience only, 1 = as strong as its own</span></label><input id="p-observeGain" type="number" step="0.05" min="0" max="2"></div>
  <div class="prow"><label>forgetting <span class="hint">share of memory that fades each round; 0.05 ≈ grudges last ~20 rounds</span></label><input id="p-forgetPerRound" type="number" step="0.01" min="0" max="1"></div>
  <div class="prow"><label>trust bias <span class="hint">how a fly treats a stranger: 0 coin flip, +0.5 trusting, −0.5 wary</span></label><input id="p-trustBias" type="number" step="0.05"></div>
  <div class="prow"><label>payoffs <span class="hint">temptation / reward / punishment / sucker</span></label><select id="p-payoffPreset"><option value="5,3,1,0">classic 5 / 3 / 1 / 0</option><option value="5,4,1,0">generous 5 / 4 / 1 / 0</option><option value="8,3,1,0">harsh 8 / 3 / 1 / 0</option></select></div>
  <h2 style="margin-top:10px">Lesions <span class="muted">(per fly)</span></h2>
  <div id="lesions">${Array.from({ length: DEFAULT_GAME.nFlies }, (_, i) => `<div class="prow"><label>F${i + 1}</label><select id="p-lesion-${i}">${LESIONS.map((l) => `<option value="${l.id}" title="${l.hint}">${l.label}</option>`).join('')}</select></div>`).join('')}</div>
  <details id="advanced" hidden><summary>Advanced</summary>
    <div class="prow"><label>wiring</label><select id="p-shuffle"><option value="none">real connectome</option><option value="class">shuffled (control)</option></select></div>
    <div class="prow"><label>seed</label><span><input id="p-seed" type="number" value="1" class="short" style="width:5.5em"> <label><input id="p-randomSeed" type="checkbox" checked> new each restart</label></span></div>
    <div class="prow"><label>temperature</label><input id="p-temperature" type="number" step="0.05" min="0.05"></div>
    <div class="prow"><label>decision window, ms</label><input id="p-decisionMs" type="number" step="50" min="100"></div>
    <div class="prow"><label>learning window, ms</label><input id="p-learnMs" type="number" step="50" min="50"></div>
    <div class="prow"><label>ante per game</label><input id="p-ante" type="number" step="0.5"></div>
    <div class="prow"><label>start money</label><input id="p-startMoney" type="number"></div>
    <div class="prow"><label>clone jitter</label><input id="p-cloneJitter" type="number" step="0.05" min="0"></div>
    <div class="prow"><label>payoff T / R / P / S</label><span><input id="p-T" type="number" class="short"> <input id="p-R" type="number" class="short"> <input id="p-P" type="number" class="short"> <input id="p-S" type="number" class="short"></span></div>
  </details>
  <button id="restart">Restart with these parameters</button>
</aside>
<main class="layout">
  <section id="arena"><div id="caption" hidden><div id="cap-text"></div><div class="cap-btns"><button id="cap-back">← Back <span class="muted">Esc</span></button></div></div></section>
  <aside class="side">
    <section id="board"><h2>Ranking</h2><div id="lb"></div></section>
    <section id="trust"><h2>Trust</h2><div class="sub">how the fly feels about each opponent<br>green approach, red avoid</div><svg id="tm"></svg></section>
    <section id="timeline"><h2>Cooperation</h2><div class="sub">share of cooperative choices, last 200 decisions</div><svg id="tl"></svg></section>
    <section id="log"><h2>Last games</h2><div id="lg"></div></section>
  </aside>
</main>`;
const status = document.getElementById('status')!;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const history: { round: number; coop: number }[] = [];
let lastSnap: Snapshot | null = null;
/** Three tiny bars: cooperation on first meeting, after the opponent cooperated, after it defected. */
function stratGlyph(s: Snapshot['flies'][number]['strategy']) {
  const bar = (v: number | null, t: string) => `<i title="${t}: ${v === null ? 'n/a' : Math.round(100 * v) + '%'}" style="height:${v === null ? 2 : 2 + 12 * v}px;opacity:${v === null ? 0.3 : 1}"></i>`;
  return `<span class="bars">${bar(s.trust, 'first meeting')}${bar(s.reciprocity, 'after opponent cooperated')}${bar(s.forgiveness, 'after opponent defected')}</span>`;
}
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
  status.textContent = 'spawning ${DEFAULT_GAME.nFlies} brains…';
  game = await Game.create(circuit, p, async (id, seed, lesion) => { const f = new RemoteFly(); await f.init(p.sim, seed, shuffle, p.seed, lesion); return f; }, (m) => (status.textContent = m));
  arena.setTags(p.lesions.map((l) => LESIONS.find((x) => x.id === l)?.label ?? ''));
  render(game.snapshot()); status.textContent = shuffle === 'none' ? '' : 'shuffled wiring';
}
document.getElementById('restart')!.onclick = () => void startGame();
const capEl = document.getElementById('caption')!, capText = document.getElementById('cap-text')!;
function caption(b: number) {
  const s = lastSnap; if (!s) return; const f = s.flies[b]; const m = s.movies[b]; const st = f.strategy; const les = LESIONS.find((x) => x.id === f.lesion);
  const pct = (v: number | null) => (v === null ? '—' : Math.round(100 * v) + '%');
  const rec = [...s.last].reverse().find((r) => r.a === b || r.b === b);
  let html = `<div class="cap-head"><span class="cap-name">${f.name}${f.lesion !== 'none' ? ` <span class="tag lesion">${les?.label}</span>` : ''}</span><span class="cap-strat">${stratGlyph(st)} ${st.label}</span></div>
    <div class="cap-stats">${f.money.toFixed(0)} money · ${f.games} games · cooperates ${f.games ? Math.round(100 * f.coops / f.games) : 0}%</div>
    <div class="cap-stats muted">first meeting ${pct(st.trust)} · after C ${pct(st.reciprocity)} · after D ${pct(st.forgiveness)}</div>`;
  if (rec) {
    const me = rec.a === b; const opp = me ? rec.b : rec.a; const myC = me ? rec.ca : rec.cb, oppC = me ? rec.cb : rec.ca, pay = me ? rec.pa : rec.pb, sc = me ? rec.scoreA : rec.scoreB, pc = me ? rec.pcA : rec.pcB;
    const row = (k: string, v: string) => `<div class="cap-row"><span class="cap-k">${k}</span><span class="cap-v">${v}</span></div>`;
    html += `<div class="cap-title">Last game · R${rec.round} vs F${opp + 1}</div>
      ${row('smells F' + (opp + 1), `approach − avoid <b>${sc >= 0 ? '+' : ''}${sc.toFixed(2)}</b>`)}
      ${row('decides', `<b class="${myC ? 'c' : 'd'}">${myC ? 'cooperates' : 'defects'}</b> <span class="muted">p = ${pc.toFixed(2)}</span>`)}
      ${row('F' + (opp + 1), `<b class="${oppC ? 'c' : 'd'}">${oppC ? 'cooperates' : 'defects'}</b>`)}
      ${row('payoff', `<b>${pay}</b> → ${pay >= 3 ? '<span class="pam">reward · PAM dopamine</span>' : '<span class="ppl1">punishment · PPL1 dopamine</span>'}`)}`;
  }
  if (m && !m.decision) html += `<div class="cap-note muted">activity replay is recorded at 1× and 2× only</div>`;
  capText.innerHTML = html;
}
arena.onFocus = (b) => { capEl.hidden = b === null; if (b !== null) caption(b); };
document.getElementById('cap-back')!.onclick = () => arena.focus(null);
let playing = false, budget = Infinity, lastRender = 0;
await startGame();
// ?autoplay=N starts N rounds immediately (used for headless smoke tests)
const auto = new URLSearchParams(location.search).get('autoplay');

playBtn.onclick = () => { if (playing) { playing = false; playBtn.textContent = '▶ Play'; return; } playing = true; playBtn.textContent = '❚❚ Pause'; void loop(); };
async function loop() {
  while (playing && budget > 0) {
    const t0 = performance.now();
    game.recordFrames = speedX <= 2;   // activity movies only when slow enough to watch
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
if (auto) { $('p-randomSeed').checked = false; budget = Number(auto); speedX = Number(new URLSearchParams(location.search).get('speed') ?? 20); playBtn.click(); }

function render(s: Snapshot) {
  lastSnap = s; arena.update(s); if (arena.focused !== null) caption(arena.focused);
  const flies = [...s.flies].sort((a, b) => b.money - a.money); const max = Math.max(1, ...flies.map((f) => f.money));
  d3.select('#lb').selectAll('div.row').data(flies, (d: any) => d.id).join('div').attr('class', (f) => `row${f.alive ? '' : ' dead'}`).html((f) => {
    const cr = f.games ? f.coops / f.games : 0; const les = LESIONS.find((x) => x.id === f.lesion);
    const tags = `${f.lineage !== f.id ? `<span class="tag">clone of F${f.lineage + 1}</span>` : ''}${f.lesion !== 'none' ? `<span class="tag lesion">${les?.label}</span>` : ''}`;
    return `<div class="r1"><span class="name">${f.name}</span>
        <span class="bar"><i style="width:${(100 * Math.max(0, f.money)) / max}%"></i></span><span class="num">${f.money.toFixed(0)}</span></div>
      <div class="r2"><span class="strat">${stratGlyph(f.strategy)}<span class="strat-label">${f.strategy.label}</span>${tags}</span>
        <span class="stats">${f.games} games · coop ${(100 * cr).toFixed(0)}% · betrayed ${f.betrayed}</span></div>`;
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
  const fly = (id: number, c: boolean, p: number) => `<span class="${c ? 'c' : 'd'}" title="${c ? 'cooperated' : 'defected'} · p(cooperate) = ${p.toFixed(2)}">F${id + 1}</span>`;
  document.getElementById('lg')!.innerHTML = s.last.slice().reverse().map((g) =>
    `<div class="lrow"><span class="muted">R${g.round}</span><span>${fly(g.a, g.ca, g.pcA)} vs ${fly(g.b, g.cb, g.pcB)}</span><span class="muted">→</span><span>${g.pa}/${g.pb}</span></div>`).join('');
}
