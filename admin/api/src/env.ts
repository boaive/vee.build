/** Everything the Worker is given by Cloudflare: bindings from wrangler.jsonc, secrets from `wrangler secret put`. */
export interface Env {
  /** The built site (../dist), with the panel at /admin. */
  ASSETS: Fetcher;
  DB: D1Database;
  /** Files attached to enquiries, and the nightly backups. */
  FILES: R2Bucket;
  /** Email Routing's send binding. Absent until email is set up: nothing is sent then. */
  MAIL?: SendEmail;
  ENQUIRY_LIMIT?: RateLimit;
  LOGIN_LIMIT?: RateLimit;
  ADMIN_LIMIT?: RateLimit;
  /** Content Security Policy reports, per address. */
  REPORT_LIMIT?: RateLimit;

  /** Secret. Turnstile's server key: without it no enquiry or sign-in is accepted. */
  TURNSTILE_SECRET_KEY?: string;
  /** Secret. Salts the hash an enquiry keeps of the sender's IP address. */
  IP_SALT?: string;
  /** The address notifications come from, on a domain with Email Routing (noreply@vee.build). */
  NOTIFY_FROM?: string;
  /** Where they go: an address verified in Email Routing. */
  NOTIFY_TO?: string;
  /** Development only: other origins allowed to call the API (the Vite and Astro dev servers). */
  ALLOWED_ORIGINS?: string;
}

export interface SessionRow {
  id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export type AppEnv = { Bindings: Env; Variables: { session: SessionRow } };
