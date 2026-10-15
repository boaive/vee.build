// Renders the factory film's clips for compact layouts (film/ClipScene.tsx; FactoryTour.tsx) from its own live
// scene, offline, at a quality no phone could draw live, and encodes them: public/video/factory/<step>.mp4 (H.264,
// which every phone decodes in hardware; a VP9 WebM was tried and would not decode in Edge on Windows), with each clip's last frame as a picture (<step>-last.webp; the first clip's first frame too, -first). It also makes
// the factory's card pictures from the last frames (public/images/cards/factory-<step>.webp).
//
//   npm run dev                                   (in another terminal)
//   node scripts/factory-video.mjs [base] [step]  (base: http://localhost:4321 unless given; step: one clip only)
//
// It starts a headless Edge (or the browser in $BROWSER), emulates a phone with a touch screen (the compact
// layout), opens the page with `?live` (the live scene on a phone) and `?hq` (the recording's quality: the full
// yard, 4096 px shadows, occlusion at full size; post.tsx, Stage.tsx) and a pixel budget that lets the canvas
// have three pixels to the CSS pixel, stands the film's frame alone as a square, pauses its reel, and then sets
// the film's progress frame by frame (the scene is a pure function of it), capturing each. One clip a step: from
// the step before's pose to this step's, eased at both ends; the first from the start of the film, the camera
// coming down onto the bay. ffmpeg (on the PATH, or $FFMPEG) encodes them. Run it again whenever the factory
// scene changes.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'video', 'factory');
const cards = path.join(root, 'public', 'images', 'cards');
const base = process.argv[2] ?? 'http://localhost:4321';
const only = process.argv[3];
const BROWSER = process.env.BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const PORT = 9556;
/** The frame, square, in CSS pixels, at three pixels to the CSS pixel: 1440 px drawn, 900 px kept (supersampled). */
const SIDE = 480;
const DPR = 3;
const KEEP = 900;
const FPS = 24;
/** Seconds a clip: the first is the film's opening, the camera coming down onto the bay as the frame goes up. */
const FIRST_S = 4;
const CLIP_S = 3.2;
/** The film's steps and where each is settled (film/factoryTimeline.ts, FACTORY_STEPS). */
const STEPS = [
  ['frame', 0.18],
  ['panels', 0.32],
  ['formwork', 0.412],
  ['concreting', 0.545],
  ['deshutter', 0.668],
  ['joinery', 0.742],
  ['spray', 0.845],
  ['dispatch', 0.972],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const smooth = (t) => t * t * (3 - 2 * t);

if (spawnSync(FFMPEG, ['-version']).status !== 0) throw new Error('ffmpeg was not found: put it on the PATH, or set FFMPEG');
fs.mkdirSync(out, { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'vee-factory-'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vee-factory-edge-'));
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

const run = (args) => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 900, deviceScaleFactor: DPR, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'pointer', value: 'coarse' },
      { name: 'hover', value: 'none' },
      { name: 'any-pointer', value: 'coarse' },
      { name: 'any-hover', value: 'none' },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ],
  });
  const loaded = new Promise((r) => waiting.set('Page.loadEventFired', r));
  await send('Page.navigate', { url: `${base}/?noboot&live&hq&lite=0&q=0&px=8` });
  await loaded;
  await sleep(4000);
  // To the factory, past its title card, so that its scene is mounted and its frame open.
  await evaluate(`(function () {
    document.documentElement.style.scrollBehavior = 'auto';
    var el = document.getElementById('factory');
    var vh = el.querySelector('.film__sticky').offsetHeight, pre = (parseFloat(el.dataset.pre) || 0) * vh;
    scrollTo(0, el.getBoundingClientRect().top + scrollY + pre + 4);
    return 1;
  })()`);
  await sleep(12000);
  // Its reel paused; the frame alone, square, at the top left; nothing over it.
  await evaluate(`(function () {
    var pause = document.querySelector('#factory .film__arrow--play');
    if (pause) pause.click();
    var s = document.createElement('style');
    s.textContent = [
      '.hdr, .film__hud, .film__prelude, .film__labels, #factory .film__backdrop { visibility: hidden !important; }',
      '#factory .film__stage { inset: 0 auto auto 0 !important;',
      ' width: ${SIDE}px !important; height: ${SIDE}px !important; border-radius: 0 !important; transform: none !important;',
      ' clip-path: none !important; z-index: 1000 !important; opacity: 1 !important; }',
      '#factory .film__stage::after { display: none !important; }',
    ].join('');
    document.head.appendChild(s);
    return 1;
  })()`);
  await sleep(4000);
  const canvas = await evaluate(`(function () { var c = document.querySelector('#factory canvas'); if (!c) return null; var r = c.getBoundingClientRect(); return [c.width, c.height, !!c.__vee, r.left, r.top, r.width, r.height]; })()`);
  if (!canvas || !canvas[2]) throw new Error('no live factory stage: is the dev server running this tree?');
  console.log('canvas', canvas[0], 'x', canvas[1], 'at', canvas.slice(3).map(Math.round).join(' '));
  if (Math.abs(canvas[5] - SIDE) > 1 || Math.abs(canvas[6] - SIDE) > 1) throw new Error('the frame did not take its square');
  const clip = { x: canvas[3], y: canvas[4], width: SIDE, height: SIDE, scale: 1 };

  /** The film at progress p, drawn, and the frame captured. */
  const frame = async (p, file) => {
    await evaluate(`(async function () {
      var v = document.querySelector('#factory canvas').__vee;
      var pr = v.progress;
      pr.pre = 1;
      pr.target = pr.value = ${p};
      pr.listeners.forEach(function (f) { f(${p}); });
      pr.invalidate && pr.invalidate();
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(r, 30); }); }); });
      return 1;
    })()`);
    // The whole view, cropped here: a clipped capture came back as the page's paper in headless Edge.
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 97 });
    await sharp(Buffer.from(shot.data, 'base64'))
      .extract({ left: Math.round(clip.x * DPR), top: Math.round(clip.y * DPR), width: SIDE * DPR, height: SIDE * DPR })
      .jpeg({ quality: 96 })
      .toFile(file);
  };

  for (let i = 0; i < STEPS.length; i++) {
    const [id, to] = STEPS[i];
    if (only && only !== id) continue;
    const from = i === 0 ? 0 : STEPS[i - 1][1];
    const n = Math.round((i === 0 ? FIRST_S : CLIP_S) * FPS);
    const dir = path.join(work, id);
    fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    // Twice at the start: the first draw of a pose can come before its shadow map.
    await frame(from, path.join(dir, 'warm.jpg'));
    for (let k = 0; k < n; k++) await frame(from + (to - from) * smooth(k / (n - 1)), path.join(dir, `${String(k).padStart(4, '0')}.jpg`));
    console.log(id, n, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');

    const frames = path.join(dir, '%04d.jpg');
    const scale = `scale=${KEEP}:${KEEP}:flags=lanczos`;
    run(['-framerate', String(FPS), '-i', frames, '-vf', `${scale},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slower', '-crf', '27', '-profile:v', 'high', '-level', '4.0', '-movflags', '+faststart', '-an', path.join(out, `${id}.mp4`)]);
    const firstJpg = path.join(dir, '0000.jpg');
    const lastJpg = path.join(dir, `${String(n - 1).padStart(4, '0')}.jpg`);
    // A clip's first frame is the last of the one before it: only the first clip's is kept.
    if (i === 0) await sharp(firstJpg).resize(KEEP, KEEP, { kernel: 'lanczos3' }).webp({ quality: 82 }).toFile(path.join(out, `${id}-first.webp`));
    await sharp(lastJpg).resize(KEEP, KEEP, { kernel: 'lanczos3' }).webp({ quality: 82 }).toFile(path.join(out, `${id}-last.webp`));
    // The card's picture: the step as it stands, 8:5 round the middle.
    const meta = await sharp(lastJpg).metadata();
    const ch = Math.round(meta.width / 1.6);
    await sharp(lastJpg)
      .extract({ left: 0, top: Math.round((meta.height - ch) / 2), width: meta.width, height: ch })
      .resize(480, 300, { kernel: 'lanczos3' })
      .webp({ quality: 80 })
      .toFile(path.join(cards, `factory-${id}.webp`));
    for (const f of [`${id}.mp4`, `${id}-last.webp`]) console.log('  ', path.relative(root, path.join(out, f)), fs.statSync(path.join(out, f)).size);
  }
} finally {
  try {
    await send('Browser.close');
  } catch {
    // Gone already.
  }
  browser.kill();
  fs.rmSync(work, { recursive: true, force: true });
}
