import { Hono } from 'hono';
import { z } from 'zod';
import {
  QUOTE_STATUSES,
  QuoteInput,
  QuoteStatusInput,
  SAMPLE_BUILDS,
  canMoveQuote,
  priceBuild,
  quoteNumber,
  type BuildQuantities,
  type Page,
  type Quote,
  type QuoteListItem,
  type SubmittedBuild,
} from '../../../shared';
import type { AppEnv } from '../env';
import { QUOTE_LIST_COLUMNS, currentPricing, loadSettings, logActivity, toQuote, toQuoteItem, type QuoteListRow, type QuoteRow } from '../lib/data';
import { HttpError, json, likeTerm, newId, now, readJson } from '../lib/http';

export const quotes = new Hono<AppEnv>();

const PAGE_SIZE = 25;

/** A start for a quote with no configurator build: one Shell A on the default foundation, no add-ons. */
const ONE_SHELL: BuildQuantities = {
  ...SAMPLE_BUILDS[0]!.quantities,
  deckM2: 0,
  posts: 0,
  spandrelMetres: 0,
  handrailMetres: 0,
  steps: 0,
  shades: 0,
  roof: { A: 0, B: 0 },
  solar: { A: 0, B: 0 },
  galleryM2: 0,
  stairFloors: 0,
};

const today = () => now().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);

async function load(db: D1Database, id: string): Promise<Quote> {
  const row = await db.prepare('SELECT * FROM quotes WHERE id = ?1').bind(id).first<QuoteRow>();
  if (!row) throw new HttpError(404, 'That quote does not exist, or was deleted.');
  return toQuote(row);
}

async function nextNumber(db: D1Database): Promise<string> {
  const year = new Date().getUTCFullYear();
  const last = await db.prepare('SELECT number FROM quotes WHERE number LIKE ?1 ORDER BY number DESC LIMIT 1').bind(`VQ-${year}-%`).first<{ number: string }>();
  const n = last ? Number(last.number.split('-')[2]) + 1 : 1;
  return quoteNumber(year, n);
}

quotes.get('/', async (c) => {
  const q = z
    .object({ status: z.enum(QUOTE_STATUSES).optional(), q: z.string().trim().max(200).optional(), page: z.coerce.number().int().min(1).max(10_000).default(1) })
    .safeParse({ status: c.req.query('status') || undefined, q: c.req.query('q') || undefined, page: c.req.query('page') ?? undefined });
  if (!q.success) throw new HttpError(400, 'That filter is not recognised.');
  const where: string[] = [];
  const args: unknown[] = [];
  if (q.data.status) {
    args.push(q.data.status);
    where.push(`status = ?${args.length}`);
  }
  if (q.data.q) {
    args.push(likeTerm(q.data.q));
    where.push(`(number LIKE ?${args.length} ESCAPE '\\' OR title LIKE ?${args.length} ESCAPE '\\' OR customer_json LIKE ?${args.length} ESCAPE '\\')`);
  }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (q.data.page - 1) * PAGE_SIZE;
  const [rows, count] = await c.env.DB.batch<unknown>([
    c.env.DB.prepare(`SELECT ${QUOTE_LIST_COLUMNS} FROM quotes ${sql} ORDER BY updated_at DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`).bind(...args),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM quotes ${sql}`).bind(...args),
  ]);
  return c.json<Page<QuoteListItem>>({ items: (rows!.results as QuoteListRow[]).map(toQuoteItem), total: (count!.results[0] as { n: number }).n, page: q.data.page, pageSize: PAGE_SIZE });
});

/** What a new quote starts from: the enquiry's customer and configurator build, the default validity and terms. */
quotes.get('/new', async (c) => {
  const enquiryId = c.req.query('enquiryId') || null;
  const settings = await loadSettings(c.env.DB);
  let customer = { name: '', email: '', phone: '', address: '' };
  let quantities = ONE_SHELL;
  let title = 'Modular home';
  if (enquiryId) {
    const e = await c.env.DB.prepare('SELECT name, email, phone, region, category, build_json FROM enquiries WHERE id = ?1')
      .bind(enquiryId)
      .first<{ name: string; email: string; phone: string | null; region: string | null; category: string; build_json: string | null }>();
    if (!e) throw new HttpError(404, 'That enquiry does not exist, or was deleted.');
    customer = { name: e.name, email: e.email, phone: e.phone ?? '', address: e.region ?? '' };
    const build = json<SubmittedBuild | null>(e.build_json, null);
    if (build) quantities = build.quantities;
    title = `${e.category === 'Not chosen' ? 'Modular home' : e.category} for ${e.name}`.slice(0, 160);
  }
  return c.json({ enquiryId, title, customer, quantities, validUntil: addDays(settings.quotes.validityDays), terms: settings.quotes.terms, notes: '' });
});

quotes.get('/:id', async (c) => c.json(await load(c.env.DB, c.req.param('id'))));

quotes.post('/', async (c) => {
  const input = await readJson(c, QuoteInput);
  if (input.enquiryId) {
    const e = await c.env.DB.prepare('SELECT 1 FROM enquiries WHERE id = ?1').bind(input.enquiryId).first();
    if (!e) throw new HttpError(400, 'The enquiry this quote was for no longer exists.');
  }
  const p = await currentPricing(c.env.DB);
  const price = priceBuild(input.quantities, p.rates);
  if (!price.total) throw new HttpError(400, 'A quote needs at least one shell.', { 'quantities.shells.A': 'Add at least one shell.' });
  const id = newId();
  const t = now();
  for (let attempt = 0; ; attempt++) {
    const number = await nextNumber(c.env.DB);
    try {
      await c.env.DB.prepare(
        `INSERT INTO quotes (id, number, enquiry_id, title, customer_json, status, quantities_json, rates_json, pricing_version, lines_json, total, per_sqft, valid_until, terms, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15)`,
      )
        .bind(id, number, input.enquiryId, input.title, JSON.stringify(input.customer), JSON.stringify(input.quantities), JSON.stringify(p.rates), p.version, JSON.stringify(price.lines), price.total, price.perSqft, input.validUntil, input.terms, input.notes, t)
        .run();
      await logActivity(c.env, 'Quote created', `${number} · ${input.title}`);
      break;
    } catch (e) {
      // Two quotes numbered in the same instant: take the next number.
      if (attempt < 2 && String(e).includes('UNIQUE')) continue;
      throw e;
    }
  }
  return c.json(await load(c.env.DB, id), 201);
});

/** Saves a draft. It is priced again at the published rates. */
quotes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const q = await load(c.env.DB, id);
  if (q.status !== 'draft') throw new HttpError(409, 'Only a draft can be changed. Move it back to draft first.');
  const input = await readJson(c, QuoteInput);
  const p = await currentPricing(c.env.DB);
  const price = priceBuild(input.quantities, p.rates);
  if (!price.total) throw new HttpError(400, 'A quote needs at least one shell.', { 'quantities.shells.A': 'Add at least one shell.' });
  await c.env.DB.prepare(
    `UPDATE quotes SET title = ?1, customer_json = ?2, quantities_json = ?3, rates_json = ?4, pricing_version = ?5, lines_json = ?6, total = ?7, per_sqft = ?8, valid_until = ?9, terms = ?10, notes = ?11, updated_at = ?12 WHERE id = ?13`,
  )
    .bind(input.title, JSON.stringify(input.customer), JSON.stringify(input.quantities), JSON.stringify(p.rates), p.version, JSON.stringify(price.lines), price.total, price.perSqft, input.validUntil, input.terms, input.notes, now(), id)
    .run();
  return c.json(await load(c.env.DB, id));
});

/** Internal notes can be written at any stage. */
quotes.put('/:id/notes', async (c) => {
  const id = c.req.param('id');
  await load(c.env.DB, id);
  const { notes } = await readJson(c, z.object({ notes: z.string().trim().max(4000) }));
  await c.env.DB.prepare('UPDATE quotes SET notes = ?1, updated_at = ?2 WHERE id = ?3').bind(notes, now(), id).run();
  return c.json(await load(c.env.DB, id));
});

/**
 * Moves a quote on. Sending it marks its enquiry Quoted (unless the enquiry
 * is further on); an accepted quote marks it Won.
 */
quotes.post('/:id/status', async (c) => {
  const id = c.req.param('id');
  const q = await load(c.env.DB, id);
  const { status } = await readJson(c, QuoteStatusInput);
  if (!canMoveQuote(q.status, status)) throw new HttpError(409, `A ${q.status} quote cannot be marked ${status}.`);
  if (status === 'sent' && q.validUntil < today()) throw new HttpError(400, 'The validity date has passed. Move the date on before sending.');
  const t = now();
  const steps = [c.env.DB.prepare('UPDATE quotes SET status = ?1, updated_at = ?2, sent_at = CASE WHEN ?1 = \'sent\' THEN ?2 ELSE sent_at END WHERE id = ?3').bind(status, t, id)];
  if (q.enquiryId && status === 'sent') {
    steps.push(c.env.DB.prepare("UPDATE enquiries SET status = 'quoted', updated_at = ?1 WHERE id = ?2 AND status IN ('new', 'contacted')").bind(t, q.enquiryId));
  }
  if (q.enquiryId && status === 'accepted') {
    steps.push(c.env.DB.prepare("UPDATE enquiries SET status = 'won', updated_at = ?1 WHERE id = ?2 AND status != 'spam'").bind(t, q.enquiryId));
  }
  await c.env.DB.batch(steps);
  await logActivity(c.env, 'Quote status changed', `${q.number}: ${q.status} → ${status}`);
  return c.json(await load(c.env.DB, id));
});

/** A new draft with the same build and customer: for a second option, or to start again. */
quotes.post('/:id/copy', async (c) => {
  const q = await load(c.env.DB, c.req.param('id'));
  const settings = await loadSettings(c.env.DB);
  const p = await currentPricing(c.env.DB);
  const price = priceBuild(q.quantities, p.rates);
  const id = newId();
  const number = await nextNumber(c.env.DB);
  const t = now();
  await c.env.DB.prepare(
    `INSERT INTO quotes (id, number, enquiry_id, title, customer_json, status, quantities_json, rates_json, pricing_version, lines_json, total, per_sqft, valid_until, terms, notes, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, '', ?14, ?14)`,
  )
    .bind(id, number, q.enquiryId, `${q.title} (copy)`.slice(0, 160), JSON.stringify(q.customer), JSON.stringify(q.quantities), JSON.stringify(p.rates), p.version, JSON.stringify(price.lines), price.total, price.perSqft, addDays(settings.quotes.validityDays), q.terms, t)
    .run();
  await logActivity(c.env, 'Quote copied', `${q.number} → ${number}`);
  return c.json(await load(c.env.DB, id), 201);
});

quotes.delete('/:id', async (c) => {
  const q = await load(c.env.DB, c.req.param('id'));
  if (q.status !== 'draft') throw new HttpError(409, 'Only a draft can be deleted. A sent quote is kept as a record.');
  await c.env.DB.prepare('DELETE FROM quotes WHERE id = ?1').bind(q.id).run();
  await logActivity(c.env, 'Quote deleted', `${q.number} · ${q.title}`);
  return c.json({ ok: true });
});
