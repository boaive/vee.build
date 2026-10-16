import { Hono } from 'hono';
import { PricingSet, PublishPricing, diffPricing, validatePricing, type PricingState, type PricingVersion } from '../../../shared';
import type { AppEnv } from '../env';
import { currentPricing, logActivity } from '../lib/data';
import { HttpError, now, readJson } from '../lib/http';

/**
 * The price list the website's configurator uses. Publishing writes a new
 * version; nothing is ever overwritten, so any earlier list can be loaded
 * into the editor and published again. Quotes keep the version they were
 * priced at.
 */
export const pricing = new Hono<AppEnv>();

pricing.get('/', async (c) => {
  const current = await currentPricing(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT version, rates_json, note, published_at FROM pricing_versions ORDER BY version DESC LIMIT 50').all<{
    version: number;
    rates_json: string;
    note: string;
    published_at: string;
  }>();
  const history: PricingVersion[] = results.map((r) => ({ version: r.version, rates: PricingSet.parse(JSON.parse(r.rates_json)), note: r.note, publishedAt: r.published_at }));
  return c.json<PricingState>({ current, history });
});

pricing.post('/', async (c) => {
  const input = await readJson(c, PublishPricing);
  const current = await currentPricing(c.env.DB);
  if (input.basedOn !== current.version) {
    throw new HttpError(409, `Prices were published (version ${current.version}) since you opened the editor. Reload, then make your changes again.`);
  }
  const issues = validatePricing(input.rates);
  if (issues.length) throw new HttpError(400, 'Some prices need fixing.', Object.fromEntries(issues.map((i) => [i.path, i.message])));
  const changes = diffPricing(current.rates, input.rates);
  if (!changes.length) throw new HttpError(400, 'Nothing has changed.');
  const version = current.version + 1;
  try {
    await c.env.DB.prepare('INSERT INTO pricing_versions (version, rates_json, note, published_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(version, JSON.stringify(input.rates), input.note, now())
      .run();
  } catch (e) {
    if (String(e).includes('UNIQUE') || String(e).includes('PRIMARY')) throw new HttpError(409, 'Prices were published at the same moment elsewhere. Reload and try again.');
    throw e;
  }
  await logActivity(c.env, 'Prices published', `Version ${version}: ${changes.map((ch) => ch.label).join(', ')}`.slice(0, 500));
  return c.json(await currentPricing(c.env.DB), 201);
});
