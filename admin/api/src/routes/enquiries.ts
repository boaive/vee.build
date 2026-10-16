import { Hono } from 'hono';
import { ENQUIRY_STATUSES, EnquiryPatch, EnquiryQuery, NewNote, toCsv, type EnquiryCounts, type EnquiryDetail, type EnquiryStatus, type Note, type Page, type StoredFile, type EnquiryListItem } from '../../../shared';
import type { AppEnv } from '../env';
import { ENQUIRY_LIST_COLUMNS, QUOTE_LIST_COLUMNS, logActivity, toEnquiry, toEnquiryItem, toQuoteItem, type EnquiryListRow, type EnquiryRow, type QuoteListRow } from '../lib/data';
import { HttpError, clientCountry, clientIp, json, likeTerm, newId, now, readJson } from '../lib/http';

export const enquiries = new Hono<AppEnv>();

const PAGE_SIZE = 25;

/** The WHERE clause for a list or an export: a status (or "open", or everything but spam) and a search. */
function filter(query: { status: string; q?: string }) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (query.status === 'open') where.push("status IN ('new', 'contacted', 'quoted')");
  else if (query.status === 'all') where.push("status != 'spam'");
  else {
    args.push(query.status);
    where.push(`status = ?${args.length}`);
  }
  if (query.q) {
    args.push(likeTerm(query.q));
    const n = args.length;
    where.push(`(name LIKE ?${n} ESCAPE '\\' OR email LIKE ?${n} ESCAPE '\\' OR phone LIKE ?${n} ESCAPE '\\' OR category LIKE ?${n} ESCAPE '\\' OR message LIKE ?${n} ESCAPE '\\' OR organisation LIKE ?${n} ESCAPE '\\')`);
  }
  return { sql: `WHERE ${where.join(' AND ')}`, args };
}

function parseQuery(c: { req: { query: (k: string) => string | undefined } }) {
  const r = EnquiryQuery.safeParse({ status: c.req.query('status') ?? undefined, q: c.req.query('q') || undefined, page: c.req.query('page') ?? undefined });
  if (!r.success) throw new HttpError(400, 'That filter is not recognised.');
  return r.data;
}

enquiries.get('/', async (c) => {
  const q = parseQuery(c);
  const f = filter(q);
  const offset = (q.page - 1) * PAGE_SIZE;
  const [rows, count] = await c.env.DB.batch<unknown>([
    c.env.DB.prepare(`SELECT ${ENQUIRY_LIST_COLUMNS} FROM enquiries ${f.sql} ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`).bind(...f.args),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM enquiries ${f.sql}`).bind(...f.args),
  ]);
  return c.json<Page<EnquiryListItem>>({
    items: (rows!.results as EnquiryListRow[]).map(toEnquiryItem),
    total: (count!.results[0] as { n: number }).n,
    page: q.page,
    pageSize: PAGE_SIZE,
  });
});

enquiries.get('/counts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status').all<{ status: EnquiryStatus; n: number }>();
  const byStatus = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0])) as Record<EnquiryStatus, number>;
  for (const r of results) byStatus[r.status] = r.n;
  return c.json<EnquiryCounts>({ byStatus });
});

/** Every match, not one page, as a spreadsheet. */
enquiries.get('/export.csv', async (c) => {
  const q = parseQuery(c);
  const f = filter(q);
  const { results } = await c.env.DB.prepare(`SELECT * FROM enquiries ${f.sql} ORDER BY created_at DESC LIMIT 20000`).bind(...f.args).all<EnquiryRow>();
  const csv = toCsv(
    ['Received (UTC)', 'Status', 'Name', 'Email', 'Phone', 'Organisation', 'Region', 'Category', 'Message', 'Configurator estimate', 'Build link', 'Country'],
    results.map((r) => {
      const build = json<{ total?: number; link?: string } | null>(r.build_json, null);
      return [r.created_at, r.status, r.name, r.email, r.phone, r.organisation, r.region, r.category, r.message, build?.total ?? '', build?.link ?? '', r.country];
    }),
  );
  await logActivity(c.env, 'Exported enquiries', `${results.length} rows`, { ip: clientIp(c), country: clientCountry(c) });
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="vee-enquiries-${now().slice(0, 10)}.csv"`);
  // A byte-order mark, so spreadsheet apps read ₹ and accents as UTF-8.
  return c.body(`﻿${csv}`);
});

enquiries.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM enquiries WHERE id = ?1').bind(id).first<EnquiryRow>();
  if (!row) throw new HttpError(404, 'That enquiry does not exist, or was deleted.');
  // Opening an enquiry marks it read.
  if (!row.read_at) {
    row.read_at = now();
    await c.env.DB.prepare('UPDATE enquiries SET read_at = ?1 WHERE id = ?2').bind(row.read_at, id).run();
  }
  const [notes, files, quotes, related] = await c.env.DB.batch<unknown>([
    c.env.DB.prepare('SELECT id, body, created_at FROM notes WHERE enquiry_id = ?1 ORDER BY created_at DESC').bind(id),
    c.env.DB.prepare('SELECT id, name, type, size, created_at FROM files WHERE enquiry_id = ?1 ORDER BY created_at DESC').bind(id),
    c.env.DB.prepare(`SELECT ${QUOTE_LIST_COLUMNS} FROM quotes WHERE enquiry_id = ?1 ORDER BY created_at DESC`).bind(id),
    c.env.DB.prepare(`SELECT ${ENQUIRY_LIST_COLUMNS} FROM enquiries WHERE email = ?1 COLLATE NOCASE AND id != ?2 ORDER BY created_at DESC LIMIT 20`).bind(row.email, id),
  ]);
  return c.json<EnquiryDetail>({
    enquiry: toEnquiry(row),
    notes: (notes!.results as { id: string; body: string; created_at: string }[]).map((n): Note => ({ id: n.id, body: n.body, createdAt: n.created_at })),
    files: (files!.results as { id: string; name: string; type: string; size: number; created_at: string }[]).map((f): StoredFile => ({ id: f.id, name: f.name, type: f.type, size: f.size, createdAt: f.created_at })),
    quotes: (quotes!.results as QuoteListRow[]).map(toQuoteItem),
    related: (related!.results as EnquiryListRow[]).map(toEnquiryItem),
  });
});

enquiries.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const p = await readJson(c, EnquiryPatch);
  const row = await c.env.DB.prepare('SELECT status, name FROM enquiries WHERE id = ?1').bind(id).first<{ status: EnquiryStatus; name: string }>();
  if (!row) throw new HttpError(404, 'That enquiry does not exist, or was deleted.');
  const sets: string[] = ['updated_at = ?1'];
  const args: unknown[] = [now()];
  if (p.status) {
    args.push(p.status);
    sets.push(`status = ?${args.length}`);
  }
  if (p.unread !== undefined) {
    args.push(p.unread ? null : now());
    sets.push(`read_at = ?${args.length}`);
  }
  args.push(id);
  await c.env.DB.prepare(`UPDATE enquiries SET ${sets.join(', ')} WHERE id = ?${args.length}`).bind(...args).run();
  if (p.status && p.status !== row.status) await logActivity(c.env, 'Enquiry status changed', `${row.name}: ${row.status} → ${p.status}`);
  return c.json({ ok: true });
});

enquiries.post('/:id/notes', async (c) => {
  const id = c.req.param('id');
  const { body } = await readJson(c, NewNote);
  const exists = await c.env.DB.prepare('SELECT 1 FROM enquiries WHERE id = ?1').bind(id).first();
  if (!exists) throw new HttpError(404, 'That enquiry does not exist, or was deleted.');
  const note: Note = { id: newId(), body, createdAt: now() };
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO notes (id, enquiry_id, body, created_at) VALUES (?1, ?2, ?3, ?4)').bind(note.id, id, note.body, note.createdAt),
    c.env.DB.prepare('UPDATE enquiries SET updated_at = ?1 WHERE id = ?2').bind(note.createdAt, id),
  ]);
  return c.json(note, 201);
});

enquiries.delete('/:id/notes/:noteId', async (c) => {
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ?1 AND enquiry_id = ?2').bind(c.req.param('noteId'), c.req.param('id')).run();
  return c.json({ ok: true });
});

/**
 * Deletes an enquiry for good: its notes, its files (from R2 too). Its
 * quotes stay, without the link. For a customer who asks to be forgotten,
 * or for spam.
 */
enquiries.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT name, email FROM enquiries WHERE id = ?1').bind(id).first<{ name: string; email: string }>();
  if (!row) throw new HttpError(404, 'That enquiry does not exist, or was deleted.');
  const { results: files } = await c.env.DB.prepare('SELECT r2_key FROM files WHERE enquiry_id = ?1').bind(id).all<{ r2_key: string }>();
  if (files.length) await c.env.FILES.delete(files.map((f) => f.r2_key));
  await c.env.DB.prepare('DELETE FROM enquiries WHERE id = ?1').bind(id).run();
  await logActivity(c.env, 'Enquiry deleted', `${row.name}${files.length ? `, with ${files.length} file(s)` : ''}`, { ip: clientIp(c), country: clientCountry(c) });
  return c.json({ ok: true });
});
