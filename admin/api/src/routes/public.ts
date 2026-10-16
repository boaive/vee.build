import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { EnquirySubmission, type PublicPricing } from '../../../shared';
import type { AppEnv } from '../env';
import { sha256 } from '../lib/crypto';
import { currentPricing, loadSettings } from '../lib/data';
import { HttpError, clientCountry, clientIp, newId, now, readJson } from '../lib/http';
import { notifyOwner } from '../lib/mail';
import { overLimit, passesTurnstile } from '../lib/security';

/** What anyone may call: the site's enquiry form, and the prices the configurator shows. */
export const publicApi = new Hono<AppEnv>();

const DAY_MS = 24 * 3600_000;
const MAX_PER_DAY = 10;

/**
 * A new enquiry from the website. In order: a burst limit per address,
 * the fields checked, the honeypot, Turnstile, a daily cap per address, and
 * a guard against the same message sent twice. Then it is stored and the
 * owner gets an email.
 */
publicApi.post('/enquiries', bodyLimit({ maxSize: 64 * 1024, onError: () => { throw new HttpError(413, 'That message is too long.'); } }), async (c) => {
  const ip = clientIp(c);
  if (await overLimit(c.env.ENQUIRY_LIMIT, `enquiry:${ip}`)) throw new HttpError(429, 'Too many enquiries at once. Please wait a minute and try again.');
  const b = await readJson(c, EnquirySubmission);

  // A person never fills the hidden field. A bot that does is told it worked, and nothing is kept.
  if (b.company_website) return c.json({ ok: true }, 201);

  if (!(await passesTurnstile(c.env, b.turnstileToken, ip))) {
    throw new HttpError(400, 'The check that you are a person did not pass. If a box has appeared above the button, tick it, then send again.');
  }

  const ipHash = await sha256(`${c.env.IP_SALT ?? ''}|${ip}`);
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const recent = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM enquiries WHERE ip_hash = ?1 AND created_at > ?2').bind(ipHash, since).first<{ n: number }>();
  if ((recent?.n ?? 0) >= MAX_PER_DAY) throw new HttpError(429, 'VEE.BUILD already has several enquiries from you today, and will be in touch.');

  // A double click, or a resend after a slow answer: the first one stands.
  const tenMin = new Date(Date.now() - 10 * 60_000).toISOString();
  const same = await c.env.DB.prepare('SELECT id FROM enquiries WHERE email = ?1 COLLATE NOCASE AND message = ?2 AND created_at > ?3 LIMIT 1').bind(b.email, b.message, tenMin).first();
  if (same) return c.json({ ok: true }, 201);

  const id = newId();
  const t = now();
  const category = (b.form === 'partnership' ? b.partnerType : b.category) ?? (b.form === 'partnership' ? 'Partnership' : 'Not chosen');
  await c.env.DB.prepare(
    `INSERT INTO enquiries (id, created_at, updated_at, form, name, email, phone, organisation, region, category, message, page, build_json, status, ip_hash, country)
     VALUES (?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'new', ?13, ?14)`,
  )
    .bind(id, t, b.form, b.name, b.email, b.phone ?? null, b.organisation ?? null, b.region ?? null, category, b.message, b.page.slice(0, 2000), b.build ? JSON.stringify(b.build) : null, ipHash, clientCountry(c))
    .run();

  const settings = await loadSettings(c.env.DB);
  if (settings.notify.newEnquiry) {
    const origin = new URL(c.req.url).origin;
    const lines = [
      `${b.name} sent an enquiry from the website.`,
      '',
      `Category: ${category}`,
      `Email: ${b.email}`,
      b.phone && `Phone: ${b.phone}`,
      b.organisation && `Organisation: ${b.organisation}`,
      b.region && `Region: ${b.region}`,
      b.build && `Configurator estimate: ₹${Math.round(b.build.total).toLocaleString('en-IN')}`,
      '',
      b.message,
      '',
      `Open it in the panel: ${origin}/admin/enquiries/${id}`,
      'Reply to this email to answer the customer directly.',
    ].filter((l): l is string => typeof l === 'string');
    c.executionCtx.waitUntil(notifyOwner(c.env, `New enquiry: ${b.name} · ${category}`, lines.join('\n'), b.email));
  }

  return c.json({ ok: true }, 201);
});

/**
 * Content Security Policy violations, sent by visitors' browsers (the
 * site's policy names this endpoint; scripts/csp.mjs). Nothing is stored:
 * each report is logged in a line, which Workers Logs keep, so something
 * the policy blocks on a real device shows up there. Both formats: the old
 * `application/csp-report` and the Reporting API's list.
 */
publicApi.post('/csp-report', bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.body(null, 204) }), async (c) => {
  if (await overLimit(c.env.REPORT_LIMIT, `csp:${clientIp(c)}`)) return c.body(null, 204);
  const body = (await c.req.json().catch(() => null)) as unknown;
  const reports: Record<string, unknown>[] = Array.isArray(body)
    ? body.filter((r) => r && typeof r === 'object' && (r as { type?: unknown }).type === 'csp-violation').map((r) => (r as { body?: Record<string, unknown> }).body ?? {})
    : body && typeof body === 'object' && 'csp-report' in body
      ? [(body as { 'csp-report': Record<string, unknown> })['csp-report']]
      : [];
  for (const r of reports.slice(0, 10)) {
    const s = (k: string, k2?: string) => String(r[k] ?? (k2 ? r[k2] : '') ?? '').slice(0, 300);
    console.warn(
      'CSP violation',
      JSON.stringify({
        directive: s('effectiveDirective', 'effective-directive') || s('violatedDirective', 'violated-directive'),
        blocked: s('blockedURL', 'blocked-uri'),
        page: s('documentURL', 'document-uri'),
        source: s('sourceFile', 'source-file'),
        line: r.lineNumber ?? r['line-number'] ?? null,
        sample: s('sample', 'script-sample'),
        disposition: s('disposition'),
      }),
    );
  }
  return c.body(null, 204);
});

/** The published prices, for the configurator. A minute's cache in the browser and at the edge. */
publicApi.get('/pricing', async (c) => {
  const p = await currentPricing(c.env.DB);
  c.header('Cache-Control', 'public, max-age=60');
  return c.json<PublicPricing>({ version: p.version, rates: p.rates, publishedAt: p.publishedAt });
});

/** For uptime checks, and to see at a glance what is set up. Says nothing secret. */
publicApi.get('/health', async (c) => {
  const db = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM pricing_versions').first<{ n: number }>().then(
    (r) => (r?.n ?? 0) > 0,
    () => false,
  );
  return c.json({
    ok: db,
    database: db,
    turnstile: !!c.env.TURNSTILE_SECRET_KEY,
    email: !!(c.env.MAIL && c.env.NOTIFY_FROM && c.env.NOTIFY_TO),
  });
});
