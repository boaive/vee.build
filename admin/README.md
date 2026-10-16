# VEE.BUILD: admin panel and backend

Everything here runs on Cloudflare, as one Worker:

| Address | What it is |
| --- | --- |
| `vee.build/` | the website (the Astro build in `../dist`) |
| `vee.build/admin` | the admin panel (this folder's `panel/`) |
| `vee.build/api` | the backend (this folder's `api/`, Hono) |

Data lives in **D1** (the database) and **R2** (files and nightly backups).
There is **one login**, the owner's. There is no sign-up page and no roles.

## What the panel does

| Section | For |
| --- | --- |
| **Overview** | Who is waiting for a reply, which quotes are out. |
| **Enquiries** | Everything from the website's forms and the configurator. Reply (email, call, WhatsApp), status, notes, files, export to a spreadsheet. |
| **Quotes** | Made from an enquiry (the configurator's build arrives filled in), priced at the published prices, printed or saved as a PDF. |
| **Prices** | The configurator's rates. Publish, and the website shows them within a minute. Every version is kept. |
| **Settings** | Business details for quotes, email notifications, password, signed-in devices, activity, download everything. |

Left out on purpose (they were in the first draft of the panel): customer
directory, pipeline board, email templates and sending from the panel,
in-panel notifications, website content editing, follow-up tasks, the audit
log screen. Replies go from your own mail app or WhatsApp; the activity list
in Settings covers what the audit log did.

## Security, in short

- **Sign-in:** a password hashed with PBKDF2-SHA256 (100,000 rounds). Five
  wrong passwords from one address, or thirty from anywhere, in 15 minutes
  lock sign-in for 15 minutes. Every attempt is logged, and you get an email
  at each sign-in.
- **Sessions:** a random 256-bit token in an `HttpOnly`, `Secure`,
  `SameSite=Strict`, `__Host-` cookie. Only its hash is stored. A session ends
  after 24 hours unused, 7 days at most. Changing the password signs out
  every other device.
- **Bots:** Cloudflare Turnstile on the enquiry form and the sign-in. A hidden
  honeypot field. Rate limits at Cloudflare's edge (5 enquiries a minute,
  10 sign-ins a minute, per address). A daily cap of 10 enquiries per
  address. The same message twice in 10 minutes is kept once.
- **Requests:** every change must come from a page of this site (`Origin`
  and `Sec-Fetch-Site` checked), as JSON, and small. Every input is checked
  with a schema. Every query is parameterised.
- **Headers:** the panel has a strict Content Security Policy, and can never
  be framed or indexed. The API's answers are never cached. The site has
  its own Content Security Policy, built with a hash for each of its inline
  scripts (`scripts/csp.mjs`, at the repo root), plus HSTS, `nosniff`, a
  referrer policy and a permissions policy (`public/_headers`). Browsers
  report anything the policy blocks to `/api/csp-report`, which writes it
  to the Worker's logs (dashboard → Workers → vee-build → Logs).
- **Files:** a list of allowed types, checked against the file's first
  bytes, 10 MB at most. Always downloaded as attachments, never shown inside
  the panel.
- **Data:** a nightly copy to R2, kept for 30 days. D1's Time Travel can also
  rewind the database to any minute of the last 30 days. CSV exports are
  protected against spreadsheet formulas.

## Set it up (once)

You need a Cloudflare account on the **Workers Paid plan** ($5 a month).
Hashing a password takes more CPU time than the free plan allows per request.
Turn on two-factor authentication for the Cloudflare account first: it is the
key to everything below.

Run these from this folder (`admin/`), after `npm install` here and in the repo root.

1. **Sign in to Cloudflare**
   ```bash
   npx wrangler login
   ```
2. **Create the database** and copy the `database_id` it prints into
   `wrangler.jsonc` (`d1_databases`).
   ```bash
   npx wrangler d1 create vee
   npm run db:migrate:remote
   ```
3. **Create the file storage**
   ```bash
   npx wrangler r2 bucket create vee-build-files
   ```
4. **Turnstile:** Cloudflare dashboard → Turnstile → Add widget. Use the
   hostnames `vee.build` and `www.vee.build`, mode *Managed*. Put the
   **site key** in the repo root's `.env` as `PUBLIC_TURNSTILE_SITE_KEY=...`.
   Then store the **secret key**:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put IP_SALT
   ```
   For `IP_SALT`, type any long random string. It is never needed again.
5. **Build and deploy** (from the repo root):
   ```bash
   npm run deploy
   ```
6. **The domain:** add `vee.build` to Cloudflare (Websites → Add a site, and
   point the registrar's nameservers at Cloudflare). Uncomment `routes` in
   `wrangler.jsonc`, set `"workers_dev": false` there, and deploy again.
7. **Email notifications:** dashboard → `vee.build` → Email → Email Routing
   → enable it, and add your own inbox as a destination address (verify it).
   In `wrangler.jsonc`, set `NOTIFY_TO` to that address, uncomment
   `send_email` with the same address, and deploy again. Settings → *Emails
   to you* then shows where they go.
8. **Your password:**
   ```bash
   npm run password:remote
   ```
   Then sign in at `https://vee.build/admin`. The same command resets a
   forgotten password. There is no reset by email, by design.

### Recommended switches in the Cloudflare dashboard (`vee.build`)

- SSL/TLS → **Full (strict)**; Edge Certificates → **Always Use HTTPS** on,
  minimum TLS **1.2**.
- Security → Bots → **Bot Fight Mode** on.
- Security → WAF → **Managed rules** on (the free Cloudflare set).
- Security → WAF → Rate limiting rules → one rule: URI path equals
  `/api/auth/login`, 5 requests per 10 seconds per IP, block for 10 minutes.
  This is an extra lock in front of the Worker's own limits.

## Work on it locally

```bash
cp .dev.vars.example .dev.vars        # Turnstile's test secret, for local use only
npm run db:migrate:local
npm run password:local                # your local login
cd .. && npm run build:all && cd admin
npm run dev                           # the whole thing on http://127.0.0.1:8787
```

- For the panel with instant reloads, also run `npm run dev:panel` and open
  http://localhost:5174/admin/. It sends `/api` to the Worker on :8787.
- For the website with instant reloads, run `npm run dev` in the repo root
  (http://localhost:4321). It sends `/api` to the Worker on :8787 too.
- The root `.env` needs `PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`
  (Cloudflare's test key, which always passes) for local work.

Checks:

```bash
npm run typecheck   # API and panel
npm test            # shared rules, and the site and panel pricing alike
```

## How it fits together

```
admin/
  wrangler.jsonc     the Worker: assets (../dist), D1, R2, rate limits, cron
  api/src/           the backend
    index.ts           routes /api, /admin and the site
    routes/            public (form, prices), auth, enquiries, files, quotes, pricing, owner
    lib/               crypto, security, data, mail, http
    panel.ts           serves the panel with its headers
    cron.ts            nightly: expire quotes, tidy, back up to R2
  panel/             the admin panel (React, Vite, Tailwind); builds into ../dist/admin
  shared/            the rules both use: schemas, the price calculation, CSV
  migrations/        the database, in order
  scripts/           set-password.mjs
```

- The site's configurator reads `GET /api/pricing` and falls back to
  `src/data/pricing.ts` if the API cannot be reached (`src/build/rates.ts`).
  A build sent with "Request a quote" carries its counted quantities
  (`quantities()` in `src/build/price.ts`). The panel prices quotes from
  those counts with `priceBuild()` (`shared/pricing-calc.ts`).
  `shared/site.test.ts` runs the site's own code to check that the two give
  the same totals for every preset.
- To add a database change, add a new numbered file in `migrations/` and run
  `npm run db:migrate:local`, then `npm run db:migrate:remote`. Never edit a
  migration that has already been applied.
- Prices published in the panel are the live ones. `src/data/pricing.ts` is
  only the fallback (and version 1 of the history).
