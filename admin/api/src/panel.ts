import type { Env } from './env';

/**
 * The panel is a single-page app built into dist/admin. Its files are
 * served from the site's assets with stricter headers than the site's own:
 * a content policy that allows only this origin (and Turnstile), never
 * framed, never indexed. Any path that is not a file gets the app's
 * index.html, which then routes itself.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export async function servePanel(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  if (url.pathname === '/admin') return Response.redirect(`${url.origin}/admin/${url.search}`, 308);

  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  const res = isFile ? await env.ASSETS.fetch(request) : await env.ASSETS.fetch(new Request(new URL('/admin/', url), request));

  const out = new Response(res.body, res);
  const h = out.headers;
  h.set('Content-Security-Policy', CSP);
  h.set('X-Frame-Options', 'DENY');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  // Built files carry a hash in their name and never change; the page itself is checked every time.
  h.set('Cache-Control', url.pathname.startsWith('/admin/assets/') && res.ok ? 'public, max-age=31536000, immutable' : 'no-cache');
  return out;
}
