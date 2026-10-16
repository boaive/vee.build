import { describe, expect, it } from 'vitest';
import {
  EnquirySubmission,
  PRICING_FIELDS,
  PricingSet,
  SAMPLE_BUILDS,
  SITE_RATES_2026_10_15,
  canMoveQuote,
  csvCell,
  diffPricing,
  getRate,
  priceBuild,
  quoteNumber,
  setRate,
  validatePricing,
} from './index';

const site = PricingSet.parse(JSON.parse(JSON.stringify(SITE_RATES_2026_10_15)));

describe('priceBuild against the website', () => {
  it.each(SAMPLE_BUILDS.map((s) => [s.id, s] as const))('%s: same total as the site', (_id, s) => {
    const p = priceBuild(s.quantities, site);
    expect(p.total).toBe(s.siteTotal);
    expect(p.sqft).toBe(s.sqft);
  });

  it('writes the lines as the site does', () => {
    const p = priceBuild(SAMPLE_BUILDS.find((s) => s.id === 'duplex-prime')!.quantities, site);
    expect(p.lines.map((l) => [l.id, l.label, l.detail])).toEqual([
      ['shells', 'Shells', '3 × Shell A'],
      ['foundation', 'Foundation', '6 footings, 30 m of L plinth, 600 mm'],
      ['deck', 'Deck platform', '21.6 m²'],
      ['posts', 'Deck post', '10 posts'],
      ['spandrel', 'Spandrel', '19 m'],
      ['handrail', 'Handrail', '26 m'],
      ['steps', 'Steps', '2 flights'],
      ['shades', 'Window / door shades', '3 shades'],
      ['solar', 'Roof solar arrays', '1 array'],
      ['access', 'Gallery and outer staircase', '1 floor'],
      ['delivery', 'Delivery and installation', '3 shells'],
    ]);
    expect(p.perSqft).toBe(3478);
  });

  it('applies the combined-footing factor to shared footings only', () => {
    const q = SAMPLE_BUILDS.find((s) => s.id === 'studio-max-footings')!.quantities;
    const foundation = priceBuild(q, site).lines.find((l) => l.id === 'foundation')!.amount;
    expect(foundation).toBe(7500 * (7 + 1 * 0.6));
    const noFactor = priceBuild(q, { ...site, combined: 0 }).lines.find((l) => l.id === 'foundation')!.amount;
    expect(noFactor).toBe(7500 * 7);
  });

  it('prices nothing for no shells', () => {
    expect(priceBuild({ ...SAMPLE_BUILDS[0]!.quantities, shells: { A: 0, B: 0 } }, site)).toEqual({ lines: [], total: 0, perSqft: 0, sqft: 0 });
  });
});

describe('editing rates', () => {
  it('maps every rate of the set, and nothing else', () => {
    const leaves = (o: unknown): number => (typeof o === 'number' ? 1 : Object.values(o as object).reduce((s: number, v) => s + leaves(v), 0));
    const { currency: _c, locale: _l, ...rates } = site;
    expect(PRICING_FIELDS).toHaveLength(leaves(rates));
    for (const f of PRICING_FIELDS) expect(typeof getRate(site, f.path)).toBe('number');
  });

  it('sets one rate without touching the original', () => {
    const next = setRate(site, 'footing.1', 9900);
    expect(next.footing).toEqual([7500, 9900, 12000]);
    expect(site.footing[1]).toBe(9500);
  });

  it('diffs with absolute and percentage change', () => {
    const d = diffPricing(site, setRate(setRate(site, 'deck', 4950), 'combined', 0.5));
    expect(d).toEqual([
      { path: 'combined', label: 'Combined footing factor', group: 'Foundation', from: 0.6, to: 0.5, abs: expect.closeTo(-0.1, 10), pct: expect.closeTo(-16.667, 2) },
      { path: 'deck', label: 'Deck platform', group: 'Add-ons', from: 4500, to: 4950, abs: 450, pct: 10 },
    ]);
  });

  it('refuses what should not be published', () => {
    expect(validatePricing(site)).toEqual([]);
    const bad = setRate(setRate(setRate(setRate(site, 'deck', -1), 'post', 1900.5), 'combined', 3), 'shell.B', 0);
    expect(validatePricing(bad).map((i) => i.path)).toEqual(['shell.B', 'combined', 'deck', 'post']);
  });
});

describe('quotes', () => {
  it('numbers by year', () => expect(quoteNumber(2026, 7)).toBe('VQ-2026-0007'));

  it('allows only real moves', () => {
    expect(canMoveQuote('draft', 'sent')).toBe(true);
    expect(canMoveQuote('draft', 'accepted')).toBe(false);
    expect(canMoveQuote('sent', 'draft')).toBe(true);
    expect(canMoveQuote('accepted', 'declined')).toBe(false);
    expect(canMoveQuote('expired', 'sent')).toBe(false);
  });
});

describe('the website form', () => {
  const ok = { form: 'contact', name: ' Asha ', email: 'asha@example.in', category: 'Modular Home', message: 'A home near Coimbatore', page: 'https://vee.build/' };

  it('accepts what the site sends, trimmed, with empty optional fields dropped', () => {
    const r = EnquirySubmission.parse({ ...ok, phone: '  ' });
    expect(r.name).toBe('Asha');
    expect(r.phone).toBeUndefined();
    expect(r.turnstileToken).toBe('');
  });

  it('accepts a configurator build and refuses a bad one', () => {
    const build = { link: 'https://vee.build/?build=v2~A0010#configure', quantities: SAMPLE_BUILDS[0]!.quantities, total: 660000, pricingVersion: 1 };
    expect(EnquirySubmission.parse({ ...ok, build }).build?.total).toBe(660000);
    expect(EnquirySubmission.safeParse({ ...ok, build: { ...build, link: 'javascript:alert(1)' } }).success).toBe(false);
    expect(EnquirySubmission.safeParse({ ...ok, build: { ...build, quantities: { ...build.quantities, posts: -1 } } }).success).toBe(false);
  });

  it('refuses what the form would refuse', () => {
    expect(EnquirySubmission.safeParse({ ...ok, email: 'not-an-email' }).success).toBe(false);
    expect(EnquirySubmission.safeParse({ ...ok, name: '   ' }).success).toBe(false);
    expect(EnquirySubmission.safeParse({ ...ok, message: 'x'.repeat(5001) }).success).toBe(false);
  });
});

describe('CSV export', () => {
  it('quotes and defuses formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+91 98')).toBe("'+91 98");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell(null)).toBe('');
  });
});
