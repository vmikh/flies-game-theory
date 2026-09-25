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
  if (process.env.OG) await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  if (process.env.VIEWPORT) { const [width, height] = process.env.VIEWPORT.split('x').map(Number); await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); }
  await send('Page.navigate', { url: `${process.env.SMOKE_URL ?? 'http://localhost:5173'}/?${process.env.LESION || process.env.START_MONEY || process.env.ANTE ? '' : `autoplay=${rounds}&`}speed=${speed}${process.env.LANG_UI ? '&lang=' + process.env.LANG_UI : ''}${process.env.ADVANCED ? '&advanced' : ''}` });
  if (process.env.LESION || process.env.START_MONEY || process.env.ANTE) { // wait for the first game to be ready, change settings and restart
    for (let i = 0; i < 60; i++) { await sleep(500); const r = await send('Runtime.evaluate', { expression: "document.getElementById('status')?.textContent ?? ''" }); if (/(round|раунд) 0/.test(r.result.value)) break; }
    await send('Runtime.evaluate', { expression: `document.getElementById('p-lesion-0').value = ${JSON.stringify(process.env.LESION ?? 'none')}; document.getElementById('p-startMoney').value = ${JSON.stringify(process.env.START_MONEY ?? '30')}; document.getElementById('p-ante').value = ${JSON.stringify(process.env.ANTE ?? '2')}; document.getElementById('p-randomSeed').checked = false; document.getElementById('restart').click();` });
    for (let i = 0; i < 60; i++) { await sleep(500); const r = await send('Runtime.evaluate', { expression: "document.getElementById('status')?.textContent ?? ''" }); if (/(round|раунд) 0/.test(r.result.value)) break; }
    await send('Runtime.evaluate', { expression: "document.getElementById('play').click()" });
  }
  const t0 = Date.now(); let status = '';
  while (Date.now() - t0 < waitS * 1000) { await sleep(1000); const r = await send('Runtime.evaluate', { expression: "document.getElementById('status')?.textContent ?? ''" }); status = r.result.value; if (/game over|игра окончена/.test(status) || (/(round|раунд) \d+/.test(status) && /Play|Pause|Играть|Пауза/.test((await send('Runtime.evaluate', { expression: "document.getElementById('play')?.textContent" })).result.value) && Number(status.match(/(?:round|раунд) (\d+)/)![1]) >= rounds)) break; }
  console.log(`status after ${((Date.now() - t0) / 1000).toFixed(0)}s: ${status}`);
  if (process.env.FOCUS) { await send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector('#arena canvas'); const r = el.getBoundingClientRect(); const lbl = document.querySelectorAll('.arena-label')[${Number(process.env.FOCUS) - 1}]; const m = /translate\\(([\\d.]+)px, ([\\d.]+)px\\)/.exec(lbl.style.transform); const x = r.left + Number(m[1]), y = r.top + Number(m[2]) - 40; el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true })); el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true })); })()` }); await sleep(Number(process.env.FOCUS_WAIT ?? 2500)); console.log('caption:', (await send('Runtime.evaluate', { expression: "document.getElementById('cap-text')?.innerText" })).result.value); }
  if (process.env.RECLICK_FOCUS) {
    const result = await send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector('#arena canvas'); const r = el.getBoundingClientRect(); const caption = document.getElementById('caption').getBoundingClientRect(); const x = (caption.right + r.right) / 2, y = (r.top + r.bottom) / 2; const before = document.querySelectorAll('.arena-label')[${Number(process.env.FOCUS ?? 1) - 1}].style.transform; el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true })); el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true })); return before; })()`, returnByValue: true });
    await sleep(1200);
    const after = await send('Runtime.evaluate', { expression: `({ visible: !document.getElementById('caption').hidden, anchor: document.querySelectorAll('.arena-label')[${Number(process.env.FOCUS ?? 1) - 1}].style.transform })`, returnByValue: true });
    console.log('reclick:', { before: result.result.value, ...after.result.value });
  }
  if (process.env.ABOUT) { await send('Runtime.evaluate', { expression: "document.getElementById('toggle-about').click()" }); await sleep(300); }
  if (process.env.PANEL) { await send('Runtime.evaluate', { expression: "document.getElementById('toggle-params').click()" }); await sleep(300); }
  if (process.env.SWITCH_LANG) { await send('Runtime.evaluate', { expression: "document.getElementById('lang').click()" }); await sleep(300); const audit = await send('Runtime.evaluate', { expression: "({ lang: document.documentElement.lang, status: document.getElementById('status').textContent, wiring: document.querySelector('#p-shuffle').parentElement.textContent.trim(), seed: document.querySelector('#p-seed').closest('.field').textContent.trim(), log: document.getElementById('lg').textContent.trim(), label: document.querySelector('.arena-label').textContent })", returnByValue: true }); console.log('language audit:', audit.result.value); }
  const lb = await send('Runtime.evaluate', { expression: "[...document.querySelectorAll('#lb .row-fly')].map(r => r.textContent.replace(/\\s+/g,' ').trim()).join('\\n')" }); console.log(lb.result.value);
  if (process.env.OG) {   // social card: arena only, own frame, title in the corner
    await send('Runtime.evaluate', { expression: `document.querySelector('.side').style.display='none'; document.querySelector('.topbar').style.display='none';
      document.documentElement.style.minWidth='0'; document.documentElement.style.minHeight='0'; document.body.style.minWidth='0'; document.body.style.minHeight='0'; document.getElementById('app').style.minHeight='0';
      const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:40px;top:32px;z-index:9;font-family:Onest,system-ui,sans-serif;color:#F2F4F7';
      d.innerHTML = '<div style="font-size:34px;font-weight:600;letter-spacing:-.01em">Flies and game theory</div><div style="font-size:17px;color:#A0A7B4;margin-top:6px">Eight real fruit-fly brains play an iterated prisoner\\'s dilemma</div>';
      document.getElementById('arena').appendChild(d); dispatchEvent(new Event('resize'));` });
    await sleep(1500);
  }
  if (!process.env.NO_SHOT) { const shot = await send('Page.captureScreenshot', { format: 'png' }); const out = join(process.cwd(), process.env.OG ? 'public/og.png' : 'smoke.png'); writeFileSync(out, Buffer.from(shot.data, 'base64')); console.log('screenshot', out); }
  console.log(logs.length ? 'console:\n' + logs.join('\n') : 'console: clean');
} finally { ws?.close(); chrome.kill('SIGKILL'); }
