/**
 * Runs the site's pages under its Content Security Policy (notes U4): a
 * headless Edge loads every route on desktop and on a phone with touch,
 * scrolls each to the bottom so every film, texture and clip loads, and
 * lists policy violations, blocked requests, errors and what loaded.
 *
 *   npm run build:all, then in admin/: npm run dev (wrangler dev on :8787)
 *   node scripts/csp-audit.mjs [base] [--form]
 *
 * --form also sends the enquiry form once (it stores an enquiry). Exits 1
 * if any page had a violation or an error.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:8787';
const FORM = process.argv.includes('--form');
const BROWSER = process.env.BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9571;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vee-csp-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--enable-gpu', '--use-angle=d3d11', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
  } catch {}
  if (!wsUrl) await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((res) => ws.addEventListener('open', res, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else for (const l of listeners) l(m);
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

let events = [];
listeners.push((m) => {
  if (m.method === 'Log.entryAdded' && (m.params.entry.level === 'error' || /Content Security Policy/i.test(m.params.entry.text))) events.push(`log ${m.params.entry.source}: ${m.params.entry.text.slice(0, 220)}`);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) events.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 220)}`);
  if (m.method === 'Runtime.exceptionThrown') events.push(`exception: ${(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 220)}`);
  if (m.method === 'Network.loadingFailed' && m.params.blockedReason) events.push(`blocked (${m.params.blockedReason}): ${m.params.requestId}`);
});

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
// DevTools' own scripts are not under the page's policy: this listener sees every violation.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective+' '+e.blockedURI+' '+(e.sourceFile||'')+':'+e.lineNumber+' '+(e.sample||'')));` });

const devices = {
  desktop: async () => {
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await send('Emulation.setEmulatedMedia', { features: [] });
  },
  phone: async () => {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }, { name: 'any-pointer', value: 'coarse' }, { name: 'any-hover', value: 'none' }] });
  },
};

const routes = ['/', '/modular/', '/capsule/', '/prefab/', '/partnership/', '/nope/'];
const report = [];
for (const [name, setup] of Object.entries(devices)) {
  await setup();
  const list = name === 'desktop' ? ['/?boot', ...routes] : routes;
  for (const r of list) {
    events = [];
    const url = r === '/?boot' ? `${BASE}/` : `${BASE}${r}${r.includes('?') ? '&' : '?'}noboot`;
    const loaded = new Promise((res) => listeners.push(function once(m) { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(once), 1); res(); } }));
    await send('Page.navigate', { url });
    await loaded;
    await sleep(r === '/?boot' ? 9000 : 3000);
    if (r !== '/?boot') {
      await evaluate(`(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const H = document.documentElement.scrollHeight;
        for (let y = 0; y < H; y += Math.round(innerHeight * 0.5)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 220)); }
        scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 3500));
        return 1;
      })()`);
    }
    const seen = await evaluate(`(() => {
      const res = performance.getEntriesByType('resource').map((e) => e.name.replace(location.origin, ''));
      const gl = [...document.querySelectorAll('canvas')].filter((c) => { try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }).length;
      return {
        csp: window.__csp,
        boot: !!document.querySelector('[data-boot]') && getComputedStyle(document.querySelector('[data-boot]')).display,
        jsClass: document.documentElement.classList.contains('js'),
        islandsLeft: document.querySelectorAll('astro-island[ssr]').length,
        canvases: document.querySelectorAll('canvas').length, webgl: gl,
        videos: [...document.querySelectorAll('video')].map((v) => v.readyState).join(','),
        textures: res.filter((n) => n.startsWith('/textures/')).length,
        clips: res.filter((n) => n.startsWith('/video/')).length,
        api: res.filter((n) => n.startsWith('/api/')),
        turnstile: typeof window.turnstile, turnstileFrames: document.querySelectorAll('iframe[src*="challenges.cloudflare.com"]').length,
      };
    })()`);
    report.push({ device: name, route: r, ...seen, events });
    console.log(name.padEnd(8), r.padEnd(14), JSON.stringify({ ...seen, events }).slice(0, 900));
  }
}

// The enquiry form, once, under the policy: Turnstile's token, then the API. It stores an enquiry: --form only.
if (FORM) {
await devices.desktop();
const loaded = new Promise((res) => listeners.push(function once(m) { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(once), 1); res(); } }));
await send('Page.navigate', { url: `${BASE}/prefab/?noboot&still` });
await loaded;
events = [];
const form = await evaluate(`(async () => {
  document.querySelector('form.form').scrollIntoView();
  for (let i = 0; i < 40 && !window.turnstile; i++) await new Promise((r) => setTimeout(r, 250));
  const f = document.querySelector('form.form');
  const set = (el, v) => { const p = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  set(f.querySelector('input[name=name]'), 'CSP Test');
  set(f.querySelector('input[name=email]'), 'csp.test@example.in');
  set(f.querySelector('textarea'), 'Checking the form under the new Content Security Policy.');
  f.querySelector('button[type=submit]').click();
  for (let i = 0; i < 60; i++) { const s = f.querySelector('.form__status').textContent; if (s && !/^Sending/.test(s)) break; await new Promise((r) => setTimeout(r, 250)); }
  return { status: f.querySelector('.form__status').textContent, csp: window.__csp };
})()`);
console.log('form', JSON.stringify({ ...form, events }));
}

browser.kill();
const bad = report.filter((r) => r.csp.length || r.events.some((e) => /^(blocked|exception)|Content Security Policy/.test(e)));
console.log(bad.length ? `${bad.length} page(s) with violations or errors.` : 'No violations, nothing blocked, on every page.');
process.exit(bad.length ? 1 : 0);
