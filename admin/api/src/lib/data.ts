import {
  DEFAULT_SETTINGS,
  PricingSet,
  Settings,
  type Enquiry,
  type EnquiryListItem,
  type PricingVersion,
  type Quote,
  type QuoteCustomer,
  type QuoteListItem,
} from '../../../shared';
import type { Env } from '../env';
import { json, now } from './http';

/* ---------- Rows as D1 returns them ---------- */

export interface EnquiryRow {
  id: string;
  created_at: string;
  updated_at: string;
  form: 'contact' | 'partnership';
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  region: string | null;
  category: string;
  message: string;
  page: string;
  build_json: string | null;
  status: Enquiry['status'];
  read_at: string | null;
  country: string | null;
}

export const ENQUIRY_LIST_COLUMNS = 'id, created_at, name, email, category, form, status, read_at, build_json IS NOT NULL AS has_build';

export interface EnquiryListRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  category: string;
  form: 'contact' | 'partnership';
  status: Enquiry['status'];
  read_at: string | null;
  has_build: number;
}

export const toEnquiry = (r: EnquiryRow): Enquiry => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  form: r.form,
  name: r.name,
  email: r.email,
  phone: r.phone,
  organisation: r.organisation,
  region: r.region,
  category: r.category,
  message: r.message,
  page: r.page,
  build: json(r.build_json, null),
  status: r.status,
  readAt: r.read_at,
  country: r.country,
});

export const toEnquiryItem = (r: EnquiryListRow): EnquiryListItem => ({
  id: r.id,
  createdAt: r.created_at,
  name: r.name,
  email: r.email,
  category: r.category,
  form: r.form,
  status: r.status,
  unread: !r.read_at,
  hasBuild: !!r.has_build,
});

export interface QuoteRow {
  id: string;
  number: string;
  enquiry_id: string | null;
  title: string;
  customer_json: string;
  status: Quote['status'];
  quantities_json: string;
  rates_json: string;
  pricing_version: number;
  lines_json: string;
  total: number;
  per_sqft: number;
  valid_until: string;
  terms: string;
  notes: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

const blankCustomer: QuoteCustomer = { name: '', email: '', phone: '', address: '' };

export const toQuote = (r: QuoteRow): Quote => ({
  id: r.id,
  number: r.number,
  enquiryId: r.enquiry_id,
  title: r.title,
  customer: json(r.customer_json, blankCustomer),
  status: r.status,
  quantities: JSON.parse(r.quantities_json),
  rates: JSON.parse(r.rates_json),
  pricingVersion: r.pricing_version,
  lines: json(r.lines_json, []),
  total: r.total,
  perSqft: r.per_sqft,
  validUntil: r.valid_until,
  terms: r.terms,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  sentAt: r.sent_at,
});

export const QUOTE_LIST_COLUMNS = "id, number, title, json_extract(customer_json, '$.name') AS customer_name, enquiry_id, status, total, valid_until, updated_at";

export interface QuoteListRow {
  id: string;
  number: string;
  title: string;
  customer_name: string | null;
  enquiry_id: string | null;
  status: Quote['status'];
  total: number;
  valid_until: string;
  updated_at: string;
}

export const toQuoteItem = (r: QuoteListRow): QuoteListItem => ({
  id: r.id,
  number: r.number,
  title: r.title,
  customerName: r.customer_name ?? '',
  enquiryId: r.enquiry_id,
  status: r.status,
  total: r.total,
  validUntil: r.valid_until,
  updatedAt: r.updated_at,
});

/* ---------- Prices ---------- */

export async function currentPricing(db: D1Database): Promise<PricingVersion> {
  const r = await db
    .prepare('SELECT version, rates_json, note, published_at FROM pricing_versions ORDER BY version DESC LIMIT 1')
    .first<{ version: number; rates_json: string; note: string; published_at: string }>();
  if (!r) throw new Error('No price list: run the database migrations.');
  return { version: r.version, rates: PricingSet.parse(JSON.parse(r.rates_json)), note: r.note, publishedAt: r.published_at };
}

/* ---------- Settings ---------- */

/** The saved settings over the defaults: a setting added later still has a value. */
export async function loadSettings(db: D1Database): Promise<Settings> {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'settings'").first<{ value: string }>();
  const saved = json<Partial<Settings>>(r?.value ?? null, {});
  const merged = {
    business: { ...DEFAULT_SETTINGS.business, ...saved.business },
    quotes: { ...DEFAULT_SETTINGS.quotes, ...saved.quotes },
    notify: { ...DEFAULT_SETTINGS.notify, ...saved.notify },
  };
  const parsed = Settings.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(db: D1Database, s: Settings) {
  await db.prepare("INSERT INTO settings (key, value) VALUES ('settings', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(s)).run();
}

/* ---------- Activity ---------- */

export function logActivity(env: Env, action: string, detail: string | null, where?: { ip?: string | null; country?: string | null }) {
  return env.DB.prepare('INSERT INTO activity (at, action, detail, ip, country) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(now(), action, detail ? detail.slice(0, 500) : null, where?.ip ?? null, where?.country ?? null)
    .run();
}
