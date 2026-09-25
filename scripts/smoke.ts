// Headless Chrome smoke test via DevTools protocol: load the app, autoplay N rounds, report status + console errors, screenshot.
// node --experimental-transform-types scripts/smoke.ts [rounds] [waitSeconds]
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const rounds = Number(process.argv[2] ?? 20), waitS = Number(process.argv[3] ?? 25), speed = Number(process.argv[4] ?? 20);
const prof = mkdtempSync(join(tmpdir(), 'chrome-smoke-')); const port = 9333;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', `--user-data-dir=${prof}`, `--crash-dumps-dir=${prof}`, `--remote-debugging-port=${port}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let ws: WebSocket | null = null;
try {
  let targets: any[] = []; for (let i = 0; i < 50 && !targets.length; i++) { await sleep(200); try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {} }
  const page = targets.find((t) => t.type === 'page'); if (!page) throw new Error('no page target');
  ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r, j) => { ws!.onopen = r; ws!.onerror = j; });
  let id = 0; const pending = new Map<number, (v: any) => void>(); const logs: string[] = [];
  ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id && pending.has(m.id)) { pending.get(m.id)!(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') logs.push(`${m.params.type}: ${m.params.args.map((a: any) => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Runtime.exceptionThrown') logs.push(`EXCEPTION: ${m.params.exceptionDetails.text} ${m.params.exceptionDetails.exception?.description ?? ''}`); };
  const send = (method: string, params: any = {}) => new Promise<any>((r) => { const i = ++id; pending.set(i, r); ws!.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: `http://localhost:5173/?autoplay=${rounds}&speed=${speed}${process.env.LANG_UI ? '&lang=' + process.env.LANG_UI : ''}` });
  const t0 = Date.now(); let status = '';
  while (Date.now() - t0 < waitS * 1000) { await sleep(1000); const r = await send('Runtime.evaluate', { expression: "document.getElementById('status')?.textContent ?? ''" }); status = r.result.value; if (/round \d+/.test(status) && /▶/.test((await send('Runtime.evaluate', { expression: "document.getElementById('play')?.textContent" })).result.value) && Number(status.match(/round (\d+)/)![1]) >= rounds) break; }
  console.log(`status after ${((Date.now() - t0) / 1000).toFixed(0)}s: ${status}`);
  if (process.env.FOCUS) { await send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector('#arena canvas'); const r = el.getBoundingClientRect(); const lbl = document.querySelectorAll('.arena-label')[${Number(process.env.FOCUS) - 1}]; const m = /translate\\(([\\d.]+)px, ([\\d.]+)px\\)/.exec(lbl.style.transform); const x = r.left + Number(m[1]), y = r.top + Number(m[2]) - 40; el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true })); el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true })); })()` }); await sleep(2500); console.log('caption:', (await send('Runtime.evaluate', { expression: "document.getElementById('cap-text')?.innerText" })).result.value); }
  if (process.env.ABOUT) { await send('Runtime.evaluate', { expression: "document.getElementById('toggle-about').click()" }); await sleep(300); }
  if (process.env.PANEL) { await send('Runtime.evaluate', { expression: "document.getElementById('toggle-params').click()" }); await sleep(300); }
  const lb = await send('Runtime.evaluate', { expression: "[...document.querySelectorAll('#lb .row')].map(r => r.textContent.replace(/\\s+/g,' ').trim()).join('\\n')" }); console.log(lb.result.value);
  const shot = await send('Page.captureScreenshot', { format: 'png' }); const out = join(process.cwd(), 'smoke.png'); writeFileSync(out, Buffer.from(shot.data, 'base64')); console.log('screenshot', out);
  console.log(logs.length ? 'console:\n' + logs.join('\n') : 'console: clean');
} finally { ws?.close(); chrome.kill('SIGKILL'); }
