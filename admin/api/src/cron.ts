import type { Env } from './env';
import { logActivity } from './lib/data';
import { now } from './lib/http';

const KEEP_BACKUPS_DAYS = 30;

/**
 * Once a day (wrangler.jsonc, `triggers`):
 * - quotes out past their validity date are marked expired;
 * - ended sign-ins, month-old sign-in attempts and year-old activity go;
 * - a copy of the business data is written to R2 (backups/YYYY-MM-DD.json),
 *   and copies older than 30 days are removed. D1's own Time Travel can
 *   also restore the database to any minute of the last 30 days.
 */
export async function daily(env: Env): Promise<void> {
  const t = now();
  const today = t.slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const yearAgo = new Date(Date.now() - 365 * 86400_000).toISOString();

  const [expired] = await env.DB.batch([
    env.DB.prepare("UPDATE quotes SET status = 'expired', updated_at = ?1 WHERE status = 'sent' AND valid_until < ?2").bind(t, today),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1 OR last_seen_at < ?2').bind(t, new Date(Date.now() - 24 * 3600_000).toISOString()),
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?1').bind(monthAgo),
    env.DB.prepare('DELETE FROM activity WHERE at < ?1').bind(yearAgo),
  ]);
  if (expired?.meta.changes) await logActivity(env, 'Quotes expired', `${expired.meta.changes} past their date`);

  const data: Record<string, unknown> = { backedUpAt: t };
  for (const table of ['enquiries', 'notes', 'files', 'quotes', 'pricing_versions', 'settings', 'activity']) {
    data[table] = (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;
  }
  await env.FILES.put(`backups/${today}.json`, JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } });

  const cutoff = new Date(Date.now() - KEEP_BACKUPS_DAYS * 86400_000).toISOString().slice(0, 10);
  const old = await env.FILES.list({ prefix: 'backups/', limit: 1000 });
  const stale = old.objects.map((o) => o.key).filter((k) => k.slice('backups/'.length, 'backups/'.length + 10) < cutoff);
  if (stale.length) await env.FILES.delete(stale);
}
