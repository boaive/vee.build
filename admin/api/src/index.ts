import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { daily } from './cron';
import type { AppEnv, Env } from './env';
import { HttpError, errorBody } from './lib/http';
import { apiHeaders, sameOrigin } from './lib/security';
import { servePanel } from './panel';
import { auth, requireSession } from './routes/auth';
import { enquiries } from './routes/enquiries';
import { files } from './routes/files';
import { owner } from './routes/owner';
import { pricing } from './routes/pricing';
import { publicApi } from './routes/public';
import { quotes } from './routes/quotes';

/**
 * The one Worker behind vee.build:
 *   /api/*    this API (Hono)
 *   /admin/*  the admin panel (servePanel)
 *   anything else: the static site, straight from the assets.
 */
const api = new Hono<AppEnv>().basePath('/api');

api.use('*', apiHeaders, sameOrigin);

api.route('/', publicApi);
api.route('/auth', auth);

const admin = new Hono<AppEnv>();
admin.use('*', requireSession);
// Every admin request is JSON and small, except an upload, which sets its own limit.
admin.use('*', async (c, next) => (c.req.path.endsWith('/files') && c.req.method === 'POST' ? next() : bodyLimit({ maxSize: 256 * 1024, onError: () => { throw new HttpError(413, 'That is too much to send at once.'); } })(c, next)));
admin.route('/', owner);
admin.route('/', files);
admin.route('/enquiries', enquiries);
admin.route('/quotes', quotes);
admin.route('/pricing', pricing);
api.route('/admin', admin);

api.notFound((c) => c.json({ error: 'Not found.' }, 404));
api.onError((err, c) => {
  if (err instanceof HttpError) return c.json(errorBody(err), err.status);
  console.error(err);
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500);
});

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return api.fetch(request, env, ctx);
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return servePanel(request, env);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(daily(env));
  },
} satisfies ExportedHandler<Env>;
