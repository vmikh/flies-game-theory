import { Circuit } from './circuit';

const app = document.getElementById('app')!;
app.innerHTML = `<header><h1>Flies · Game Theory</h1><span class="muted" id="status">loading circuit…</span></header><main><canvas id="c"></canvas></main>`;
const status = document.getElementById('status')!;

const circuit = await Circuit.load();
const counts = circuit.meta.classes.map((c) => `${c} ${circuit.range(c)[1] - circuit.range(c)[0]}`).join(' · ');
status.textContent = `${circuit.n} neurons, ${circuit.m} edges (w ≥ ${circuit.meta.min_weight}) · ${counts}`;

// Quick sanity view: soma positions projected to XY, coloured by class.
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const palette = ['#5aa9e6', '#e0e0e0', '#f2b134', '#e4572e', '#9b5de5', '#7ae582'];
function draw() {
  const dpr = devicePixelRatio || 1; const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const xyz = circuit.xyz; let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < circuit.n; i++) { const x = xyz[3 * i], y = xyz[3 * i + 1]; if (!isFinite(x)) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const s = 0.9 * Math.min(w / (maxX - minX), h / (maxY - minY));
  for (let i = 0; i < circuit.n; i++) { const x = xyz[3 * i], y = xyz[3 * i + 1]; if (!isFinite(x)) continue;
    ctx.fillStyle = palette[circuit.cls[i]]; ctx.globalAlpha = circuit.cls[i] === 1 ? 0.5 : 0.95;
    const r = circuit.cls[i] === 1 ? 1.2 : 2.5;
    ctx.beginPath(); ctx.arc((x - minX) * s + (w - (maxX - minX) * s) / 2, (y - minY) * s + (h - (maxY - minY) * s) / 2, r, 0, 7); ctx.fill(); }
}
draw(); addEventListener('resize', draw);
