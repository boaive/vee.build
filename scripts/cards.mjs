// Captures the pictures of the compact layouts' cards (Film, `pick`; the phone hero's three kinds) from the
// real-time scenes themselves, into public/images/cards/*.webp (480 x 300).
//
//   npm run dev                      (in another terminal)
//   node scripts/cards.mjs [base] [film]    (base: http://localhost:4321 unless given; film: overview, factory or installation)
//
// It starts a headless Edge (or the browser in $BROWSER: Chrome works too), emulates an upright tablet with a touch
// screen (the compact layout), settles every film (?still), chooses each card in turn and crops the picture band
// (progress.band, the dev build's canvas.__vee) to 8:5 round its middle, with the labels, the words and the cards
// hidden. Run it again whenever a step's picture changes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'images', 'cards');
const base = process.argv[2] ?? 'http://localhost:4321';
/** One film only (overview, factory, installation), or all of them. */
const only = process.argv[3];
const BROWSER = process.env.BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9555;
const W = 820;
const H = 1180;
const DPR = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vee-cards-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--enable-gpu', '--use-angle=d3d11', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

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
const waiting = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) rej(new Error(m.error.message));
    else res(m.result);
  } else if (waiting.has(m.method)) {
    waiting.get(m.method)();
    waiting.delete(m.method);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'pointer', value: 'coarse' },
      { name: 'hover', value: 'none' },
      { name: 'any-pointer', value: 'coarse' },
      { name: 'any-hover', value: 'none' },
    ],
  });
  const loaded = new Promise((r) => waiting.set('Page.loadEventFired', r));
  await send('Page.navigate', { url: `${base}/?still&noboot` });
  await loaded;
  await sleep(9000);
  await evaluate(`(function () {
    var s = document.createElement('style');
    s.textContent = '.film__labels, .film__labels .lbl, .film__pick, .prelude__pick, .film__hud, .film__prelude, .hdr { visibility: hidden !important; }';
    document.head.appendChild(s);
    document.documentElement.style.scrollBehavior = 'auto';
    return 1;
  })()`);
  fs.mkdirSync(out, { recursive: true });

  /** Each card of a film: chosen (by `choose`), settled, its band captured. `pre`: where in the film to stand (its title card's share, or past it). */
  const film = async (id, names, choose, pre) => {
    await evaluate(`(function () {
      var el = document.getElementById(${JSON.stringify(id)});
      var vh = innerHeight, p = (parseFloat(el.dataset.pre) || 0) * vh;
      scrollTo(0, el.getBoundingClientRect().top + scrollY + ${pre} * p + 2);
      return 1;
    })()`);
    await sleep(4500);
    for (let i = 0; i < names.length; i++) {
      await evaluate(choose(i));
      await sleep(id === 'overview' ? 2600 : 3600);
      const band = await evaluate(`(function () {
        var c = document.querySelector('#${id} canvas');
        var r = c.getBoundingClientRect();
        // The opening card: its room, between the headline and the cards. A film: its band.
        var line = document.querySelector('#${id} .prelude__line'), pick = document.querySelector('#${id} .prelude__pick');
        if (${id === 'overview'} && line && pick) return { l: 0, t: line.getBoundingClientRect().bottom + 12, r: r.width, b: pick.getBoundingClientRect().top - 8 };
        var b = (c.__vee && c.__vee.progress.band) || [0, 0.3, 1, 0.85];
        // A film with cards: the canvas is its frame, set in from the screen's edges (film.css).
        return { l: b[0] * r.width + r.left, t: b[1] * r.height + r.top, r: b[2] * r.width + r.left, b: b[3] * r.height + r.top };
      })()`);
      // JPEG at full quality: headless Edge's PNG encoder has hung for good on some frames (2026-10-11).
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 96, optimizeForSpeed: true });
      const bh = band.b - band.t;
      const ch = Math.min(bh, (band.r - band.l) / 1.6);
      const cw = ch * 1.6;
      const cx = (band.l + band.r) / 2;
      const cy = band.t + bh * 0.52;
      const file = path.join(out, `${names[i]}.webp`);
      await sharp(Buffer.from(shot.data, 'base64'))
        .extract({ left: Math.max(0, Math.round((cx - cw / 2) * DPR)), top: Math.max(0, Math.round((cy - ch / 2) * DPR)), width: Math.round(cw * DPR), height: Math.round(ch * DPR) })
        .resize(480, 300)
        .webp({ quality: 80 })
        .toFile(file);
      console.log(path.relative(root, file), fs.statSync(file).size);
    }
  };

  // The hero's three, on its opening card (its band: the steps' own; the kinds stand in the card's room above it).
  if (!only || only === 'overview') await film('overview', ['kind-mod', 'kind-pod', 'kind-fab'], (i) => `document.querySelectorAll('.prelude__pick .film__card')[${i}] ? (document.querySelectorAll('.prelude__pick .film__card')[${i}].click(), 1) : 0`, 0);
  if (!only || only === 'factory') await film('factory', ['factory-frame', 'factory-panels', 'factory-formwork', 'factory-concreting', 'factory-deshutter', 'factory-joinery', 'factory-spray', 'factory-dispatch'], (i) => `document.querySelectorAll('#factory .film__card')[${i}].click()`, 1);
  if (!only || only === 'installation') await film('installation', ['site-prep', 'site-arrive', 'site-place', 'site-assemble', 'site-home'], (i) => `document.querySelectorAll('#installation .film__card')[${i}].click()`, 1);
} finally {
  try {
    await send('Browser.close');
  } catch {
    // Already gone.
  }
  browser.kill();
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    // The browser may still hold it a moment.
  }
}
