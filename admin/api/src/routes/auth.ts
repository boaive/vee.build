import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { PasswordChange, SignIn, type Me } from '../../../shared';
import type { AppEnv, SessionRow } from '../env';
import { DUMMY_HASH, hashPassword, newToken, sha256, verifyPassword } from '../lib/crypto';
import { loadSettings, logActivity } from '../lib/data';
import { HttpError, clientCountry, clientIp, newId, now, readJson } from '../lib/http';
import { notifyOwner } from '../lib/mail';
import { overLimit, passesTurnstile } from '../lib/security';

/**
 * One owner, one password, sessions in a cookie.
 *
 * - The cookie holds 256 random bits; the database keeps only their SHA-256,
 *   so a copy of the database signs no one in.
 * - HttpOnly (no script can read it), Secure, SameSite=Strict (never sent
 *   from another site), and `__Host-` (only this exact host, path /).
 * - A sign-in ends after 24 hours without use, and after 7 days in any case.
 * - Five wrong passwords from one address, or thirty from anywhere, in 15
 *   minutes close the door for 15 minutes. Every attempt is logged.
 */
const IDLE_MS = 24 * 3600_000;
const MAX_MS = 7 * 24 * 3600_000;
const TOUCH_MS = 5 * 60_000;
const WINDOW_MS = 15 * 60_000;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_ALL = 30;

const isHttps = (c: Context) => new URL(c.req.url).protocol === 'https:';
const cookieName = (c: Context) => (isHttps(c) ? '__Host-vee_session' : 'vee_session');

function setSessionCookie(c: Context, token: string) {
  setCookie(c, cookieName(c), token, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Strict',
    path: '/',
    maxAge: MAX_MS / 1000,
  });
}

const clearSessionCookie = (c: Context) => deleteCookie(c, cookieName(c), { path: '/', secure: isHttps(c) });

const endsAt = (s: SessionRow) => new Date(Math.min(Date.parse(s.expires_at), Date.parse(s.last_seen_at) + IDLE_MS)).toISOString();

/** Lets a request through only with a live sign-in; refreshes it as it is used. */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, cookieName(c));
  if (!token || token.length > 100) throw new HttpError(401, 'Please sign in.');
  const hash = await sha256(token);
  const s = await c.env.DB.prepare('SELECT id, created_at, last_seen_at, expires_at FROM sessions WHERE token_hash = ?1').bind(hash).first<SessionRow>();
  const t = Date.now();
  if (!s || Date.parse(s.expires_at) <= t || Date.parse(s.last_seen_at) + IDLE_MS <= t) {
    if (s) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
    clearSessionCookie(c);
    throw new HttpError(401, 'Your sign-in has ended. Please sign in again.');
  }
  if (await overLimit(c.env.ADMIN_LIMIT, `admin:${s.id}`)) throw new HttpError(429, 'Too many requests at once. Wait a moment.');
  if (t - Date.parse(s.last_seen_at) > TOUCH_MS) {
    s.last_seen_at = new Date(t).toISOString();
    await c.env.DB.prepare('UPDATE sessions SET last_seen_at = ?1 WHERE id = ?2').bind(s.last_seen_at, s.id).run();
  }
  c.set('session', s);
  await next();
};

export const auth = new Hono<AppEnv>();

auth.post('/login', async (c) => {
  const ip = clientIp(c);
  const where = { ip, country: clientCountry(c) };
  if (await overLimit(c.env.LOGIN_LIMIT, `login:${ip}`)) throw new HttpError(429, 'Too many attempts. Wait a minute and try again.');
  const body = await readJson(c, SignIn);

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const fails = await c.env.DB.prepare('SELECT COALESCE(SUM(ip = ?1), 0) AS from_ip, COUNT(*) AS total FROM login_attempts WHERE ok = 0 AND at > ?2')
    .bind(ip, since)
    .first<{ from_ip: number; total: number }>();
  if ((fails?.from_ip ?? 0) >= MAX_FAILS_PER_IP || (fails?.total ?? 0) >= MAX_FAILS_ALL) {
    await logActivity(c.env, 'Sign-in blocked', 'Too many failed attempts', where);
    throw new HttpError(429, 'Too many failed sign-ins. Try again in 15 minutes.');
  }

  if (!(await passesTurnstile(c.env, body.turnstileToken, ip))) {
    throw new HttpError(400, 'The check that you are a person did not pass. Please try again.');
  }

  const admin = await c.env.DB.prepare('SELECT email, password_hash FROM admin WHERE id = 1').first<{ email: string; password_hash: string }>();
  // Always run the hash, so a wrong email takes as long as a wrong password.
  const passwordOk = await verifyPassword(body.password, admin?.password_hash ?? DUMMY_HASH);
  const ok = !!admin && passwordOk && admin.email.toLowerCase() === body.email.trim().toLowerCase();
  await c.env.DB.prepare('INSERT INTO login_attempts (at, ip, ok) VALUES (?1, ?2, ?3)').bind(now(), ip, ok ? 1 : 0).run();

  if (!admin) throw new HttpError(503, 'The panel has no owner yet. Set the password first (admin/README.md).');
  if (!ok) {
    await logActivity(c.env, 'Sign-in failed', `Email tried: ${body.email.slice(0, 120)}`, where);
    throw new HttpError(401, 'Email or password is wrong.');
  }

  const token = newToken();
  const t = Date.now();
  const s: SessionRow = { id: newId(), created_at: new Date(t).toISOString(), last_seen_at: new Date(t).toISOString(), expires_at: new Date(t + MAX_MS).toISOString() };
  const ua = (c.req.header('user-agent') ?? '').slice(0, 300);
  await c.env.DB.prepare('INSERT INTO sessions (id, token_hash, created_at, last_seen_at, expires_at, ip, country, user_agent) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
    .bind(s.id, await sha256(token), s.created_at, s.last_seen_at, s.expires_at, ip, where.country, ua)
    .run();
  setSessionCookie(c, token);
  await logActivity(c.env, 'Signed in', null, where);

  const settings = await loadSettings(c.env.DB);
  if (settings.notify.signIn) {
    c.executionCtx.waitUntil(
      notifyOwner(
        c.env,
        'New sign-in to the VEE.BUILD panel',
        `Someone signed in to the admin panel.\n\nWhen: ${new Date(t).toUTCString()}\nAddress: ${ip}${where.country ? ` (${where.country})` : ''}\nBrowser: ${ua || 'unknown'}\n\nIf this was not you, change the password at once (Settings, Security) and sign out every other device.\n`,
      ),
    );
  }
  return c.json<Me>({ email: admin.email, expiresAt: endsAt(s) });
});

auth.post('/logout', async (c) => {
  const token = getCookie(c, cookieName(c));
  if (token && token.length <= 100) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(token)).run();
    await logActivity(c.env, 'Signed out', null, { ip: clientIp(c), country: clientCountry(c) });
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get('/me', requireSession, async (c) => {
  const admin = await c.env.DB.prepare('SELECT email FROM admin WHERE id = 1').first<{ email: string }>();
  return c.json<Me>({ email: admin?.email ?? '', expiresAt: endsAt(c.get('session')) });
});

auth.post('/password', requireSession, async (c) => {
  const body = await readJson(c, PasswordChange);
  const admin = await c.env.DB.prepare('SELECT password_hash FROM admin WHERE id = 1').first<{ password_hash: string }>();
  if (!admin || !(await verifyPassword(body.current, admin.password_hash))) {
    throw new HttpError(400, 'The current password is wrong.', { current: 'The current password is wrong.' });
  }
  if (body.current === body.next) throw new HttpError(400, 'Choose a password you have not used here.', { next: 'Choose a different password.' });
  const s = c.get('session');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE admin SET password_hash = ?1, password_changed_at = ?2 WHERE id = 1').bind(await hashPassword(body.next), now()),
    // Every other device has to sign in again with the new password.
    c.env.DB.prepare('DELETE FROM sessions WHERE id != ?1').bind(s.id),
  ]);
  await logActivity(c.env, 'Password changed', 'Other devices signed out', { ip: clientIp(c), country: clientCountry(c) });
  c.executionCtx.waitUntil(notifyOwner(c.env, 'Your VEE.BUILD panel password was changed', `The admin panel's password was changed on ${new Date().toUTCString()} from ${clientIp(c)}.\n\nIf this was not you, contact your developer at once.\n`));
  return c.json({ ok: true });
});

auth.post('/sessions/sign-out-others', requireSession, async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM sessions WHERE id != ?1').bind(c.get('session').id).run();
  await logActivity(c.env, 'Signed out other devices', `${r.meta.changes ?? 0} signed out`, { ip: clientIp(c), country: clientCountry(c) });
  return c.json({ ok: true });
});
