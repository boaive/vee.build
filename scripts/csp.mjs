/**
 * The site's Content Security Policy, written at build time (notes U4).
 *
 * After `astro build`, every page in dist/ is read, and every inline script
 * that can run is hashed. The hashes and the rest of the policy go into
 * dist/_headers as a response header for every path, so the policy applies
 * from the first byte and never drifts from the scripts: change Base.astro
 * or upgrade Astro, build, and the hashes follow. (Astro's own
 * `security.csp` was tried: it leaves the `is:inline` scripts of Base.astro
 * out, and its <meta> comes after the first script.)
 *
 * What the pages load, as inspected on 2026-10-16: scripts, styles, fonts,
 * textures, clips and images from this origin; `fetch` to /api and to the
 * texture files; Cloudflare Turnstile's script and frame on pages with the
 * enquiry form. No workers, eval or WebAssembly, no other host. Styles stay
 * 'unsafe-inline': the pages carry style attributes, and React and
 * Turnstile set more.
 *
 * Used as an Astro integration (astro.config.mjs), or by hand on an
 * existing build: `node scripts/csp.mjs [dist]`. CSP_REPORT_ONLY=1 at build
 * time sends it as Content-Security-Policy-Report-Only instead. Violations
 * are reported to /api/csp-report, which logs them (admin/api).
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TURNSTILE = 'https://challenges.cloudflare.com';
/** `type` values a browser runs. Anything else (application/ld+json) is data. */
const RUNS = /^(?:|text\/javascript|application\/javascript|module)$/i;

export function policy(hashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${[...hashes].sort().join(' ')} ${TURNSTILE}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'report-uri /api/csp-report',
    'report-to csp',
  ].join('; ');
}

async function pages(dir, top = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    // The admin panel has a policy of its own (admin/api/src/panel.ts).
    if (e.isDirectory() && !(dir === top && e.name === 'admin')) out.push(...(await pages(p, top)));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Hashes every inline script that runs, and finds what no hash can allow. */
export async function collect(dist) {
  const hashes = new Set();
  const problems = [];
  for (const file of await pages(dist)) {
    const html = await readFile(file, 'utf8');
    const name = relative(dist, file);
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = m[1];
      const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] ?? '';
      if (!RUNS.test(type) || /\bsrc\s*=/i.test(attrs)) continue;
      // The browser hashes the text after its parser turns CRLF and CR into LF.
      const text = m[2].replace(/\r\n?/g, '\n');
      hashes.add(`'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`);
    }
    if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) problems.push(`${name}: an inline event handler (onclick="…"): move it into a script`);
    if (/\b(?:href|src|action)\s*=\s*["']?\s*javascript:/i.test(html)) problems.push(`${name}: a javascript: URL`);
  }
  return { hashes, problems };
}

/** Adds the policy to the `/*` block of dist/_headers (copied there from public/_headers). */
export async function writeCsp(dist, { reportOnly = process.env.CSP_REPORT_ONLY === '1' } = {}) {
  const { hashes, problems } = await collect(dist);
  if (problems.length) throw new Error(`The Content Security Policy would block:\n- ${problems.join('\n- ')}`);
  const name = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  const lines = [`  ${name}: ${policy(hashes)}`, '  Reporting-Endpoints: csp="/api/csp-report"'];
  // Cloudflare reads at most 2,000 characters a line in _headers.
  if (lines[0].length > 2000) throw new Error(`The policy is ${lines[0].length} characters; _headers allows 2,000 a line.`);

  const path = join(dist, '_headers');
  const text = (await readFile(path, 'utf8').catch(() => '')).replace(/\r\n/g, '\n');
  const rows = text.split('\n').filter((l) => !/^\s+(Content-Security-Policy(-Report-Only)?|Reporting-Endpoints):/i.test(l));
  let at = rows.indexOf('/*');
  if (at === -1) {
    rows.push('', '/*');
    at = rows.length - 1;
  }
  let end = at + 1;
  while (end < rows.length && /^\s+\S/.test(rows[end])) end++;
  rows.splice(end, 0, ...lines);
  await writeFile(path, rows.join('\n'));
  return { hashes: hashes.size, reportOnly, length: lines[0].length };
}

/** The Astro integration: runs once the static build is written. */
export default function csp() {
  return {
    name: 'vee-csp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const r = await writeCsp(fileURLToPath(dir));
        logger.info(`${r.reportOnly ? 'Report-only' : 'Enforced'} Content Security Policy: ${r.hashes} inline script hashes, ${r.length} characters (dist/_headers).`);
      },
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = resolve(process.argv[2] ?? 'dist');
  const r = await writeCsp(dist);
  console.log(`${r.reportOnly ? 'Report-only' : 'Enforced'} Content Security Policy written to ${join(dist, '_headers')}: ${r.hashes} hashes, ${r.length} characters.`);
}
