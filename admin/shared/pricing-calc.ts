/**
 * The money side of the website's `estimate()` (src/build/price.ts), on
 * quantities instead of a 3D layout. The site counts footings, metres and
 * square metres from its layout code; here those counts are inputs, and the
 * rates, the combined-footing factor, the lines and the rounding are the
 * site's, rule for rule. samples.ts carries the site's own totals for its
 * presets, and pricing.test.ts holds this function to them.
 */
import { z } from 'zod';
import type { PricingSet } from './pricing';
import type { PriceLine } from './quote';

export const FOUNDATION_HEIGHTS = [300, 600, 900] as const;

/** Nominal floor area of a shell, as the site counts it (`shells` in src/data/system.ts). */
export const SHELL_SQFT = { A: 200, B: 100 } as const;

/** The site's add-on names (`addOns` in src/data/narrative.ts). */
export const ADD_ON_NAMES = {
  deck: 'Deck platform',
  posts: 'Deck post',
  spandrel: 'Spandrel',
  handrail: 'Handrail',
  steps: 'Steps',
  shades: 'Window / door shades',
  roof: 'Sloped roof option',
  solar: 'Roof solar arrays',
} as const;

const count = z.number().int().min(0).max(10_000);
const measure = z.number().finite().min(0).max(100_000);
const perShell = z.object({ A: count, B: count });

export const BuildQuantities = z.object({
  shells: perShell,
  foundation: z.object({ h: z.union([z.literal(0), z.literal(1), z.literal(2)]), type: z.enum(['footings', 'plinth']) }),
  /** Plug footings: one at every ground-floor corner, one shared where shells meet. */
  footings: count,
  /** Footings shared by two or more shells: each costs `combined` × a footing more. */
  sharedFootings: count,
  /** L plinth run, metres (zero on footings only). */
  plinthMetres: measure,
  deckM2: measure,
  posts: count,
  spandrelMetres: measure,
  /** Handrail beyond what the galleries' own rails need. */
  handrailMetres: measure,
  steps: count,
  shades: count,
  roof: perShell,
  solar: perShell,
  galleryM2: measure,
  /** Floors the one outer staircase serves. */
  stairFloors: count,
});
export type BuildQuantities = z.infer<typeof BuildQuantities>;

export interface SampleBuild {
  id: string;
  name: string;
  addOns: string[];
  quantities: BuildQuantities;
  sqft: number;
  /** The site's estimate() for this build with the rates of 2026-10-15. */
  siteTotal: number;
}

export interface BuildPrice {
  lines: PriceLine[];
  /** Rounded to the nearest thousand, as the site rounds it. */
  total: number;
  perSqft: number;
  sqft: number;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const metres = (m: number) => `${m.toFixed(m < 10 ? 1 : 0)} m`;

export function priceBuild(q: BuildQuantities, p: PricingSet): BuildPrice {
  const shells = q.shells.A + q.shells.B;
  const sqft = q.shells.A * SHELL_SQFT.A + q.shells.B * SHELL_SQFT.B;
  if (!shells) return { lines: [], total: 0, perSqft: 0, sqft: 0 };
  const lines: PriceLine[] = [];
  const add = (id: string, label: string, detail: string, amount: number) => {
    if (amount > 0) lines.push({ id, label, detail, amount });
  };
  const h = q.foundation.h;
  const run = q.foundation.type === 'plinth' ? q.plinthMetres : 0;

  add('shells', 'Shells', [q.shells.A && `${q.shells.A} × Shell A`, q.shells.B && `${q.shells.B} × Shell B`].filter(Boolean).join(', '), q.shells.A * p.shell.A + q.shells.B * p.shell.B);
  add(
    'foundation',
    'Foundation',
    `${plural(q.footings, 'footing')}${run ? `, ${metres(run)} of L plinth` : ''}, ${FOUNDATION_HEIGHTS[h]} mm`,
    p.footing[h] * (q.footings + q.sharedFootings * p.combined) + p.plinth[h] * run,
  );
  add('deck', ADD_ON_NAMES.deck, `${q.deckM2.toFixed(1)} m²`, q.deckM2 * p.deck);
  add('posts', ADD_ON_NAMES.posts, plural(q.posts, 'post'), q.posts * p.post);
  add('spandrel', ADD_ON_NAMES.spandrel, metres(q.spandrelMetres), q.spandrelMetres * p.spandrel);
  add('handrail', ADD_ON_NAMES.handrail, metres(q.handrailMetres), q.handrailMetres * p.handrail);
  add('steps', ADD_ON_NAMES.steps, plural(q.steps, 'flight'), q.steps * p.steps);
  add('shades', ADD_ON_NAMES.shades, plural(q.shades, 'shade'), q.shades * p.shade);
  add('roof', ADD_ON_NAMES.roof, plural(q.roof.A + q.roof.B, 'shell'), q.roof.A * p.roof.A + q.roof.B * p.roof.B);
  add('solar', ADD_ON_NAMES.solar, plural(q.solar.A + q.solar.B, 'array'), q.solar.A * p.solar.A + q.solar.B * p.solar.B);
  add(
    'access',
    'Gallery and outer staircase',
    [q.galleryM2 && `${q.galleryM2.toFixed(1)} m² of gallery`, q.stairFloors && plural(q.stairFloors, 'floor')].filter(Boolean).join(', '),
    q.galleryM2 * p.gallery + q.stairFloors * p.stair,
  );
  add('delivery', 'Delivery and installation', plural(shells, 'shell'), shells * p.delivery);

  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) / 1000) * 1000;
  return { lines, total, perSqft: sqft ? Math.round(total / sqft) : 0, sqft };
}

/** A line as the configurator's bill shows it: rounded to the nearest ₹100. The total is not their sum. */
export const displayLineAmount = (amount: number) => Math.round(amount / 100) * 100;

/* ---------- The editor's view of a PricingSet ---------- */

export const PRICING_GROUPS = ['Shells', 'Foundation', 'Add-ons', 'Upper floors', 'Delivery'] as const;
export type PricingGroup = (typeof PRICING_GROUPS)[number];

export interface PricingField {
  /** Dotted path into PricingSet: "shell.A", "footing.1", "combined". */
  path: string;
  label: string;
  unit: string;
  group: PricingGroup;
  /** A factor, not a rupee rate: never touched by a bulk change. */
  factor?: true;
}

const H = FOUNDATION_HEIGHTS;
export const PRICING_FIELDS: PricingField[] = [
  { path: 'shell.A', label: 'Shell A, finished', unit: 'per shell', group: 'Shells' },
  { path: 'shell.B', label: 'Shell B, finished', unit: 'per shell', group: 'Shells' },
  ...H.map((h, i): PricingField => ({ path: `footing.${i}`, label: `Plug footing, ${h} mm`, unit: 'per footing', group: 'Foundation' })),
  { path: 'combined', label: 'Combined footing factor', unit: '× one footing, extra', group: 'Foundation', factor: true },
  ...H.map((h, i): PricingField => ({ path: `plinth.${i}`, label: `L plinth, ${h} mm`, unit: 'per metre', group: 'Foundation' })),
  { path: 'deck', label: ADD_ON_NAMES.deck, unit: 'per m²', group: 'Add-ons' },
  { path: 'post', label: `${ADD_ON_NAMES.posts} with jack pier`, unit: 'per post', group: 'Add-ons' },
  { path: 'spandrel', label: ADD_ON_NAMES.spandrel, unit: 'per metre', group: 'Add-ons' },
  { path: 'handrail', label: ADD_ON_NAMES.handrail, unit: 'per metre', group: 'Add-ons' },
  { path: 'steps', label: `${ADD_ON_NAMES.steps}, with jack piers`, unit: 'per flight', group: 'Add-ons' },
  { path: 'shade', label: 'Window or door shade', unit: 'per shade', group: 'Add-ons' },
  { path: 'roof.A', label: 'Sloped roof over Shell A', unit: 'per shell', group: 'Add-ons' },
  { path: 'roof.B', label: 'Sloped roof over Shell B', unit: 'per shell', group: 'Add-ons' },
  { path: 'solar.A', label: 'Solar array on Shell A', unit: 'per shell', group: 'Add-ons' },
  { path: 'solar.B', label: 'Solar array on Shell B', unit: 'per shell', group: 'Add-ons' },
  { path: 'gallery', label: 'Gallery with its rail', unit: 'per m²', group: 'Upper floors' },
  { path: 'stair', label: 'Outer staircase', unit: 'per floor served', group: 'Upper floors' },
  { path: 'delivery', label: 'Delivery, crane and placing (within 100 km)', unit: 'per shell', group: 'Delivery' },
];

export function getRate(set: PricingSet, path: string): number {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], set) as number;
}

export function setRate(set: PricingSet, path: string, value: number): PricingSet {
  const next = JSON.parse(JSON.stringify(set)) as Record<string, unknown>;
  const keys = path.split('.');
  const last = keys.pop()!;
  const parent = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, next);
  parent[last] = value;
  return next as unknown as PricingSet;
}

export interface RateChange {
  path: string;
  label: string;
  group: PricingGroup;
  from: number;
  to: number;
  abs: number;
  /** Percentage change, or null when the old value was zero. */
  pct: number | null;
}

export function diffPricing(from: PricingSet, to: PricingSet): RateChange[] {
  return PRICING_FIELDS.flatMap((f) => {
    const a = getRate(from, f.path);
    const b = getRate(to, f.path);
    if (a === b) return [];
    return [{ path: f.path, label: f.label, group: f.group, from: a, to: b, abs: b - a, pct: a === 0 ? null : ((b - a) / a) * 100 }];
  });
}

export interface PricingIssue {
  path: string;
  message: string;
}

/** What stops a set from being published. An empty list means it may be. */
export function validatePricing(set: PricingSet): PricingIssue[] {
  const issues: PricingIssue[] = [];
  for (const f of PRICING_FIELDS) {
    const v = getRate(set, f.path);
    if (typeof v !== 'number' || !Number.isFinite(v)) issues.push({ path: f.path, message: 'Enter a number.' });
    else if (f.factor) {
      if (v < 0 || v > 2) issues.push({ path: f.path, message: 'A factor between 0 and 2.' });
    } else if (v < 0) issues.push({ path: f.path, message: 'A rate cannot be negative.' });
    else if (!Number.isInteger(v)) issues.push({ path: f.path, message: 'Whole rupees only.' });
    else if (v > 100_000_000) issues.push({ path: f.path, message: 'That is more than ₹10 crore; check the zeros.' });
    else if (f.group === 'Shells' && v === 0) issues.push({ path: f.path, message: 'A shell cannot be free.' });
  }
  return issues;
}
