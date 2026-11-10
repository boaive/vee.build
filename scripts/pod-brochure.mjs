// node scripts/pod-brochure.mjs : the capsule home's brochures, one PDF a length, into public/downloads (veedo-pod-<m>m.pdf).
//
// Each is one A4 page, landscape: the logo with "Powered by" and Hemisphere One's (as the site's header has them), the
// length's name and its line, both of its layouts drawn as the POD page's plans draw them (src/build/podPlanSvg.ts, from
// the same plan as the 3D), its size, area and rooms (src/data/pod.ts). Run it again whenever a plan or those words change.
// It bundles what it needs with the repo's esbuild and prints with a headless Edge (or $BROWSER: Chrome works too).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'downloads');
const BROWSER = process.env.BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9566;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'veedo-brochure-'));

// What the page's plans use, bundled for Node.
const bundled = await build({
  stdin: {
    contents: "export { podPlanSvg } from './src/build/podPlanSvg'; export { podAreas, podLayouts, podLengthName, podLengths, podSection, podSteps } from './src/data/pod';",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const lib = path.join(tmp, 'lib.mjs');
fs.writeFileSync(lib, bundled.outputFiles[0].text);
const { podPlanSvg, podAreas, podLayouts, podLengthName, podLengths, podSection, podSteps } = await import(pathToFileURL(lib).href);

const data = (file, type) => `data:${type};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
const archivo = data('node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2', 'font/woff2');
const mono = data('node_modules/@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2', 'font/woff2');
const logo = data('src/assets/brand/veedo-logo.png', 'image/png');
const h1 = data('src/assets/brand/hemisphere-one.png', 'image/png');
const step = podSteps[0];

const page = (m) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>veedo.space capsule home, ${podLengthName(m)}</title>
<style>
@font-face { font-family: Archivo; src: url(${archivo}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'DM Mono'; src: url(${mono}) format('woff2'); font-weight: 500; }
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 297mm; height: 210mm; }
body { background: #f2f0eb; color: #111214; font: 400 10pt/1.4 Archivo, sans-serif; padding: 13mm 15mm 11mm; display: flex; flex-direction: column; gap: 6mm; }
.head { display: flex; justify-content: space-between; align-items: flex-start; }
.brand { display: grid; gap: 1.6mm; }
.brand img.logo { height: 9mm; }
.by { display: flex; align-items: center; gap: 2mm; color: #6b6e74; font-size: 7pt; }
.by img { height: 4.6mm; }
.label { font: 500 7.5pt/1 'DM Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
.accent { color: #b5370f; }
h1 { font-size: 26pt; line-height: 1; letter-spacing: -0.02em; font-weight: 700; margin-top: 2mm; }
.lead { font-size: 11pt; color: #3b3e43; margin-top: 2mm; }
.plans { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; flex: 1; min-height: 0; }
figure { display: flex; flex-direction: column; gap: 2mm; min-height: 0; }
figcaption { display: flex; justify-content: space-between; gap: 4mm; }
figcaption b { font-weight: 600; font-size: 10pt; }
figcaption span { color: #6b6e74; font-size: 8.5pt; }
.sheet { flex: 1; min-height: 0; background: #fbfaf7; border: 0.3mm solid rgba(17,18,20,0.12); border-radius: 3mm; padding: 3mm; display: flex; align-items: center; }
.sheet svg { width: 100%; height: auto; max-height: 100%; }
.plan .pw { fill: #111214; } .plan .pr { fill: #fbfaf7; }
.plan .pg, .plan .pb { fill: none; stroke: #3b3e43; stroke-width: 0.035; } .plan .pb { stroke-dasharray: 0.08 0.06; }
.plan .pg2 { fill: #fbfaf7; stroke: #3b3e43; stroke-width: 0.02; } .plan .pf { fill: #e8e5de; }
.plan .pd { fill: none; stroke: #6b6e74; stroke-width: 0.015; }
.plan .ps { fill: #e8e5de; stroke: rgba(17,18,20,0.26); stroke-width: 0.012; }
.plan .pu { fill: #e8e5de; stroke: #3b3e43; stroke-width: 0.012; } .plan .pl { fill: #fbfaf7; stroke: #3b3e43; stroke-width: 0.012; }
.plan .pm { fill: none; stroke: #6b6e74; stroke-width: 0.012; }
.plan .pt { fill: #3b3e43; font: 500 0.15px 'DM Mono', monospace; text-anchor: middle; text-transform: uppercase; } .plan .pt--dim { fill: #6b6e74; }
.facts { display: flex; gap: 12mm; }
.facts div { display: grid; gap: 1.2mm; }
.facts dd { font-weight: 600; font-size: 10.5pt; }
.foot { display: flex; justify-content: space-between; color: #6b6e74; font-size: 7.5pt; border-top: 0.3mm solid rgba(17,18,20,0.12); padding-top: 3mm; }
</style></head><body>
<div class="head">
  <div class="brand"><img class="logo" src="${logo}" alt="veedo.space"><div class="by">Powered by <img src="${h1}" alt="Hemisphere One"></div></div>
  <p class="label accent">POD · Capsule home</p>
</div>
<div>
  <h1>Capsule home, ${podLengthName(m)}.</h1>
  <p class="lead">${step.body}</p>
</div>
<div class="plans">
  ${['A', 'B']
    .map(
      (k) => `<figure><figcaption><b><span class="label accent">Layout ${k}</span>&nbsp; ${podLayouts[m][k].name}</b><span>${podLayouts[m][k].rooms}</span></figcaption><div class="sheet">${podPlanSvg(m, k, true)}</div></figure>`,
    )
    .join('')}
</div>
<dl class="facts">
  <div><dt class="label">Length</dt><dd>${m} m</dd></div>
  <div><dt class="label">Width</dt><dd>${podSection.width} m</dd></div>
  <div><dt class="label">Height</dt><dd>${podSection.height} m</dd></div>
  <div><dt class="label">Area</dt><dd>${podAreas[m]} m²</dd></div>
</dl>
<div class="foot"><span>veedo.space</span><span>Layouts and sizes are indicative and may change.</span></div>
</body></html>`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'veedo-brochure-edge-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let wsUrl = null;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
  } catch {
    // Not up yet.
  }
  if (!wsUrl) await sleep(250);
}
if (!wsUrl) throw new Error('the browser did not start: set BROWSER to Edge or Chrome');
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) rej(new Error(msg.error.message));
    else res(msg.result);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });

try {
  fs.mkdirSync(out, { recursive: true });
  await send('Page.enable');
  for (const m of podLengths) {
    const file = path.join(tmp, `pod-${m}.html`);
    fs.writeFileSync(file, page(m));
    await send('Page.navigate', { url: pathToFileURL(file).href });
    await sleep(1500);
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true });
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    const dest = path.join(out, `veedo-pod-${m}m.pdf`);
    fs.writeFileSync(dest, Buffer.from(pdf.data, 'base64'));
    console.log(dest, fs.statSync(dest).size);
  }
} finally {
  ws.close();
  browser.kill();
  await sleep(500);
  fs.rmSync(tmp, { recursive: true, force: true });
}
