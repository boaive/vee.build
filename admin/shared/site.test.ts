/**
 * The website and the panel price with two copies of one rule: the site's
 * `estimate()` (src/build/price.ts) on its 3D layout, the panel's
 * `priceBuild()` on counted quantities. These tests run the site's own code
 * and hold the two to each other, and the database's first price list to
 * the site's src/data/pricing.ts.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FOUNDATION, DEFAULT_PLOT, presets } from '../../src/data/build';
import { pricing } from '../../src/data/pricing';
import { estimate, quantities, type Priced } from '../../src/build/price';
import { presetLayout } from '../../src/build/store';
import { BuildQuantities, PricingSet, SAMPLE_BUILDS, SITE_RATES_2026_10_15, priceBuild } from './index';

/** The samples keep counts to a few decimals: 10.8 where the layout gives 10.799999999999999. */
const round = (v: unknown): unknown => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)])) : v);

const site = PricingSet.parse(JSON.parse(JSON.stringify(pricing)));

const builds = presets.flatMap((p) => {
  const l = presetLayout(p.id, { plot: DEFAULT_PLOT })!;
  const at = (foundation: Priced['foundation'], id: string): [string, Priced] => [id, { units: l.units, addOns: p.addOns, deckSide: p.deckSide, manual: null, foundation, plot: l.plot }];
  return [at(DEFAULT_FOUNDATION, p.id), at({ ...DEFAULT_FOUNDATION, h: 0, type: 'footings' }, `${p.id}-footings`)];
});

describe('the site and the panel price alike', () => {
  it('has every preset', () => expect(builds.length).toBe(presets.length * 2));

  it.each(builds)('%s: the panel prices the site’s counts to the site’s total', (_id, b) => {
    const q = quantities(b);
    expect(BuildQuantities.safeParse(q).success).toBe(true);
    const s = estimate(b, pricing);
    const a = priceBuild(q, site);
    expect(a.total).toBe(s.total);
    expect(a.lines.map((l) => [l.id, l.detail, l.amount])).toEqual(s.lines.map((l) => [l.id, l.detail, l.amount]));
  });

  it.each(builds)('%s: the same counts and total as the panel’s samples', (id, b) => {
    const sample = SAMPLE_BUILDS.find((s) => s.id === id);
    if (!sample) return;
    expect(round(quantities(b))).toEqual(round(sample.quantities));
    // The samples were made with the rates of 2026-10-15; the site's file still holds them.
    expect(estimate(b, SITE_RATES_2026_10_15 as unknown as typeof pricing).total).toBe(sample.siteTotal);
  });
});

describe('the database starts from the site’s prices', () => {
  it('migration 0002 is src/data/pricing.ts', () => {
    const sql = readFileSync(new URL('../migrations/0002_pricing_v1.sql', import.meta.url), 'utf8');
    const json = /VALUES \(1, '(\{.*?\})'/.exec(sql)![1]!;
    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(pricing)));
  });
});
