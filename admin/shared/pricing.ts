import { z } from 'zod';

const rate = z.number().finite().nonnegative();
const byHeight = z.tuple([rate, rate, rate]);
const byShell = z.object({ A: rate, B: rate });

/**
 * The rates of the website's `src/data/pricing.ts`, field for field. Indian
 * rupees, ex-works, excluding GST. Heights are 300, 600, 900 mm. The site
 * reads the published set from `GET /api/pricing` and falls back to its own
 * file when the API cannot be reached.
 */
export const PricingSet = z.object({
  currency: z.literal('INR'),
  locale: z.literal('en-IN'),
  /** A finished shell. */
  shell: byShell,
  /** One precast plug footing, by height. */
  footing: byHeight,
  /** A combined footing under two or more shells costs this much more (a factor of one footing). */
  combined: z.number().min(0).max(2),
  /** L plinth, per metre, by height. */
  plinth: byHeight,
  /** Deck platform, per m². */
  deck: rate,
  /** A deck post with its jack pier. */
  post: rate,
  /** Spandrel, per metre. */
  spandrel: rate,
  /** Handrail, per metre. */
  handrail: rate,
  /** A flight of steps with its jack piers. */
  steps: rate,
  /** A window or door shade. */
  shade: rate,
  /** A sloped roof over one shell. */
  roof: byShell,
  /** A roof solar array over one shell. */
  solar: byShell,
  /** Gallery, per m². */
  gallery: rate,
  /** The outer staircase, for each floor it serves. */
  stair: rate,
  /** Delivery within 100 km, crane and placing, per shell. */
  delivery: rate,
});
export type PricingSet = z.infer<typeof PricingSet>;

/** One published price list. Never changed once written: a change is a new version. */
export interface PricingVersion {
  version: number;
  rates: PricingSet;
  note: string;
  publishedAt: string;
}

export const PublishPricing = z.object({
  rates: PricingSet,
  note: z.string().trim().max(300).default(''),
  /** The version the editor started from: a publish over a newer one is refused. */
  basedOn: z.number().int().positive(),
});
export type PublishPricing = z.infer<typeof PublishPricing>;
