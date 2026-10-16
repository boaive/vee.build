import { Hono } from 'hono';
import { Settings, type ActivityItem, type Overview, type SecurityState, type SessionItem, type SettingsState } from '../../../shared';
import type { AppEnv } from '../env';
import { ENQUIRY_LIST_COLUMNS, QUOTE_LIST_COLUMNS, loadSettings, logActivity, saveSettings, toEnquiryItem, toQuoteItem, type EnquiryListRow, type QuoteListRow } from '../lib/data';
import { HttpError, clientCountry, clientIp, now, readJson } from '../lib/http';

/** The overview, settings, security, and the owner's copy of everything. */
export const owner = new Hono<AppEnv>();

owner.get('/overview', async (c) => {
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [counts, quoteCounts, needsReply, quotesOut] = await c.env.DB.batch<unknown>([
    c.env.DB.prepare(
      `SELECT
         COALESCE(SUM(status = 'new'), 0) AS n_new,
         COALESCE(SUM(status IN ('new', 'contacted', 'quoted')), 0) AS n_open,
         COALESCE(SUM(status = 'won' AND updated_at > ?1), 0) AS n_won30,
         COALESCE(SUM(status != 'spam' AND created_at > ?1), 0) AS n_received30
       FROM enquiries`,
    ).bind(since30),
    c.env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS value FROM quotes WHERE status = 'sent'"),
    c.env.DB.prepare(`SELECT ${ENQUIRY_LIST_COLUMNS} FROM enquiries WHERE status = 'new' ORDER BY created_at ASC LIMIT 8`),
    c.env.DB.prepare(`SELECT ${QUOTE_LIST_COLUMNS} FROM quotes WHERE status = 'sent' ORDER BY valid_until ASC LIMIT 8`),
  ]);
  const k = counts!.results[0] as { n_new: number; n_open: number; n_won30: number; n_received30: number };
  const qc = quoteCounts!.results[0] as { n: number; value: number };
  return c.json<Overview>({
    counts: { new: k.n_new, open: k.n_open, won30: k.n_won30, received30: k.n_received30, quotesOut: qc.n, quotesOutValue: qc.value },
    needsReply: (needsReply!.results as EnquiryListRow[]).map(toEnquiryItem),
    quotesOut: (quotesOut!.results as QuoteListRow[]).map(toQuoteItem),
  });
});

owner.get('/settings', async (c) => {
  const to = c.env.MAIL && c.env.NOTIFY_FROM && c.env.NOTIFY_TO ? c.env.NOTIFY_TO : null;
  return c.json<SettingsState>({ settings: await loadSettings(c.env.DB), notifyTo: to });
});

owner.put('/settings', async (c) => {
  const s = await readJson(c, Settings);
  await saveSettings(c.env.DB, s);
  await logActivity(c.env, 'Settings saved', null);
  return c.json<SettingsState>({ settings: s, notifyTo: c.env.MAIL && c.env.NOTIFY_FROM && c.env.NOTIFY_TO ? c.env.NOTIFY_TO : null });
});

owner.get('/security', async (c) => {
  const me = c.get('session');
  const [sessions, activity, admin] = await c.env.DB.batch<unknown>([
    c.env.DB.prepare('SELECT id, created_at, last_seen_at, ip, country, user_agent FROM sessions WHERE expires_at > ?1 ORDER BY last_seen_at DESC').bind(now()),
    c.env.DB.prepare('SELECT id, at, action, detail, ip, country FROM activity ORDER BY id DESC LIMIT 100'),
    c.env.DB.prepare('SELECT password_changed_at FROM admin WHERE id = 1'),
  ]);
  return c.json<SecurityState>({
    sessions: (sessions!.results as { id: string; created_at: string; last_seen_at: string; ip: string | null; country: string | null; user_agent: string | null }[]).map(
      (s): SessionItem => ({ id: s.id, createdAt: s.created_at, lastSeenAt: s.last_seen_at, ip: s.ip, country: s.country, userAgent: s.user_agent, current: s.id === me.id }),
    ),
    activity: activity!.results as ActivityItem[],
    passwordChangedAt: (admin!.results[0] as { password_changed_at: string } | undefined)?.password_changed_at ?? '',
  });
});

owner.delete('/sessions/:id', async (c) => {
  const id = c.req.param('id');
  if (id === c.get('session').id) throw new HttpError(400, 'Use Sign out for this device.');
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(id).run();
  await logActivity(c.env, 'Signed out a device', null, { ip: clientIp(c), country: clientCountry(c) });
  return c.json({ ok: true });
});

/** Everything the business owns, as one JSON file. Passwords and sign-in tokens are not in it. */
owner.get('/export', async (c) => {
  const tables = ['enquiries', 'notes', 'files', 'quotes', 'pricing_versions', 'settings', 'activity'] as const;
  const out: Record<string, unknown[]> = {};
  for (const t of tables) {
    const { results } = await c.env.DB.prepare(t === 'enquiries' ? 'SELECT id, created_at, updated_at, form, name, email, phone, organisation, region, category, message, page, build_json, status, read_at, country FROM enquiries' : `SELECT * FROM ${t}`).all();
    out[t] = results;
  }
  await logActivity(c.env, 'Downloaded all data', null, { ip: clientIp(c), country: clientCountry(c) });
  c.header('Content-Disposition', `attachment; filename="vee-build-data-${now().slice(0, 10)}.json"`);
  return c.json({ exportedAt: now(), ...out });
});
