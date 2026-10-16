import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv, Env } from '../env';
import { HttpError } from './http';

/**
 * Headers on every API answer: never cached, never framed, never indexed,
 * never sniffed into something else.
 */
export const apiHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  const h = c.res.headers;
  h.set('Cache-Control', h.get('Cache-Control') ?? 'no-store');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  h.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
};

export function allowedOrigins(c: Context<AppEnv>): string[] {
  const own = new URL(c.req.url).origin;
  const extra = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [own, ...extra];
}

/**
 * Cross-site request forgery: a change is accepted only from a page of this
 * site. The browser sets `Origin` and `Sec-Fetch-Site` itself; another site
 * cannot fake them in a visitor's browser. With the session cookie's
 * SameSite=Strict and JSON-only bodies, this is the third lock.
 *
 * The one exception is /api/csp-report: the browser sends those reports
 * itself, often without an Origin, and the endpoint only logs.
 */
export const sameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.method !== 'OPTIONS' && c.req.path !== '/api/csp-report') {
    const origin = c.req.header('origin');
    const site = c.req.header('sec-fetch-site');
    if (!origin || !allowedOrigins(c).includes(origin) || (site && site !== 'same-origin' && site !== 'same-site' && site !== 'none')) {
      throw new HttpError(403, 'This request did not come from the site.');
    }
  }
  await next();
};

/** True when the key has used up its allowance. A missing binding (local tests) limits nothing. */
export async function overLimit(limiter: RateLimit | undefined, key: string): Promise<boolean> {
  if (!limiter) return false;
  try {
    return !(await limiter.limit({ key })).success;
  } catch {
    return false;
  }
}

/**
 * Cloudflare Turnstile: proves a person is at the keyboard, usually without
 * a puzzle. Fails closed: with no secret configured nothing passes.
 */
export async function passesTurnstile(env: Env, token: string, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error('TURNSTILE_SECRET_KEY is not set: refusing the request.');
    return false;
  }
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  body.append('remoteip', ip);
  body.append('idempotency_key', crypto.randomUUID());
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error('Turnstile could not be reached', e);
    return false;
  }
}
