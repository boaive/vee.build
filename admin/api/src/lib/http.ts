import type { Context } from 'hono';
import type { z } from 'zod';
import type { ApiErrorBody } from '../../../shared';

/** A refusal the visitor or the owner can act on. Anything else becomes a plain 500. */
export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 503,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const errorBody = (e: HttpError): ApiErrorBody => (e.fields ? { error: e.message, fields: e.fields } : { error: e.message });

/** The first message for each field, keyed by its dotted path ("customer.email"). */
export function fieldsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    out[key] ??= issue.message;
  }
  return out;
}

/** Reads a JSON body against a schema. Refuses another content type, broken JSON and invalid fields. */
export async function readJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  if (!(c.req.header('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Send the request as JSON.');
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'The request could not be read.');
  }
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, 'Please check the highlighted fields.', fieldsOf(r.error));
  return r.data;
}

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

/** The visitor's address as Cloudflare saw it. */
export const clientIp = (c: Context) => c.req.header('cf-connecting-ip') ?? '0.0.0.0';
export const clientCountry = (c: Context) => {
  const v = (c.req.raw as Request & { cf?: { country?: string } }).cf?.country;
  return typeof v === 'string' && /^[A-Z]{2}$/.test(v) ? v : null;
};

/** `LIKE` with the user's text taken literally. */
export const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

export const json = <T>(v: string | null, fallback: T): T => {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};
