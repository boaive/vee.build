/**
 * The build's indicative price (client, 2026-10-11), counted from what the
 * configurator actually lays out: the shells, the footings and plinth runs
 * of its foundation (foundationLayout), every deck, post, rail, flight of
 * steps, shade, roof and array the add-on rule places (layoutAddOns), the
 * galleries and staircase an upper floor brings, and delivery for each
 * shell. Rates are the published price list (build/rates.ts), or
 * data/pricing.ts until it arrives. No three.js in here.
 *
 * The counting (`quantities`) and the money (`estimate`) are apart, so an
 * enquiry from the configurator can send the counts and the admin panel can
 * price a quote from them with the same rule (admin/shared/pricing-calc.ts,
 * `priceBuild`; its tests hold the two to the same totals).
 */
import { FOUNDATION_HEIGHTS, addOnInfo, type AddOnId, type DeckSide, type Foundation, type ManualAddOn, type Plot } from '../data/build';
import { pricing } from '../data/pricing';
import { baseOf, foundationLayout, layoutAddOns, totals, type Unit } from './model';
import { rates, type Rates } from './rates';

export interface PriceLine {
  id: string;
  label: string;
  /** What is counted, in words ("2 × Shell A"). */
  detail: string;
  amount: number;
}

export interface Estimate {
  /** Rounded to the nearest thousand. */
  total: number;
  lines: PriceLine[];
  /** Per nominal square foot of the build. */
  perSqft: number;
}

export interface Priced {
  units: readonly Unit[];
  addOns: readonly AddOnId[];
  deckSide: DeckSide;
  manual: readonly ManualAddOn[] | null;
  foundation: Foundation;
  plot: Plot;
}

/** What is counted, as the admin panel's `BuildQuantities` has it. */
export interface Quantities {
  shells: { A: number; B: number };
  foundation: { h: 0 | 1 | 2; type: Foundation['type'] };
  /** Plug footings: one at every ground-floor corner, one shared where shells meet. */
  footings: number;
  /** Footings under two or more shells. */
  sharedFootings: number;
  plinthMetres: number;
  deckM2: number;
  posts: number;
  spandrelMetres: number;
  /** Beyond the rails the galleries already have. */
  handrailMetres: number;
  steps: number;
  shades: number;
  roof: { A: number; B: number };
  solar: { A: number; B: number };
  galleryM2: number;
  /** Floors the one outer staircase serves. */
  stairFloors: number;
}

const length = (s: { x0: number; z0: number; x1: number; z1: number }) => Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
const area = (r: { x0: number; z0: number; x1: number; z1: number }) => Math.abs((r.x1 - r.x0) * (r.z1 - r.z0));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const metres = (m: number) => `${m.toFixed(m < 10 ? 1 : 0)} m`;

/** Counts what the build lays out: the foundation, every add-on as placed, the access an upper floor brings. */
export function quantities(b: Priced): Quantities {
  const units = b.units;
  const t = totals(units);
  // Foundation: a footing at every ground-floor corner (one shared where shells meet), L plinth along the edges if chosen.
  const f = foundationLayout(units);
  const run = b.foundation.type === 'plinth' ? f.plinths.reduce((s, r) => s + length(r), 0) : 0;
  // Add-ons, as laid out; the rails a bare layout already has belong to the galleries.
  const base = baseOf(b.foundation);
  const full = layoutAddOns(units, new Set(b.addOns), b.deckSide, b.manual, base, b.plot);
  const bare = layoutAddOns(units, new Set(), b.deckSide, null, base, b.plot);
  return {
    shells: { A: t.a, B: t.b },
    foundation: { h: b.foundation.h as 0 | 1 | 2, type: b.foundation.type },
    footings: f.footings.length,
    sharedFootings: f.footings.filter((s) => s.shared > 1).length,
    plinthMetres: run,
    deckM2: full.decks.reduce((s, r) => s + area(r), 0),
    posts: full.posts.length,
    spandrelMetres: full.spandrels.reduce((s, e) => s + length(e), 0),
    handrailMetres: Math.max(0, full.rails.reduce((s, e) => s + length(e), 0) - bare.rails.reduce((s, e) => s + length(e), 0)),
    steps: full.steps.length,
    shades: full.shades.length,
    roof: { A: full.roofs.filter((r) => r.t === 'A').length, B: full.roofs.filter((r) => r.t === 'B').length },
    solar: { A: full.solar.filter((r) => r.t === 'A').length, B: full.solar.filter((r) => r.t === 'B').length },
    // Upper floors: the galleries and the one outer staircase come with them.
    galleryM2: full.galleries.reduce((s, g) => s + area(g), 0),
    stairFloors: full.stairs.reduce((s, st) => s + st.levels.length, 0),
  };
}

export function estimate(b: Priced, p: Rates = rates()): Estimate {
  if (!b.units.length) return { total: 0, lines: [], perSqft: 0 };
  return priceQuantities(quantities(b), p, totals(b.units).sqft);
}

/** The money for counted quantities: the lines, and the total to the nearest thousand. */
export function priceQuantities(q: Quantities, p: Rates, sqft: number): Estimate {
  const lines: PriceLine[] = [];
  const add = (id: string, label: string, detail: string, amount: number) => {
    if (amount > 0) lines.push({ id, label, detail, amount });
  };
  const h = q.foundation.h;
  const run = q.plinthMetres;

  add('shells', 'Shells', [q.shells.A && `${q.shells.A} × Shell A`, q.shells.B && `${q.shells.B} × Shell B`].filter(Boolean).join(', '), q.shells.A * p.shell.A + q.shells.B * p.shell.B);
  add(
    'foundation',
    'Foundation',
    `${plural(q.footings, 'footing')}${run ? `, ${metres(run)} of L plinth` : ''}, ${FOUNDATION_HEIGHTS[h]} mm`,
    p.footing[h] * (q.footings + q.sharedFootings * p.combined) + p.plinth[h] * run,
  );
  add('deck', addOnInfo.deck.name, `${q.deckM2.toFixed(1)} m²`, q.deckM2 * p.deck);
  add('posts', addOnInfo.posts.name, plural(q.posts, 'post'), q.posts * p.post);
  add('spandrel', addOnInfo.spandrel.name, metres(q.spandrelMetres), q.spandrelMetres * p.spandrel);
  add('handrail', addOnInfo.handrail.name, metres(q.handrailMetres), q.handrailMetres * p.handrail);
  add('steps', addOnInfo.steps.name, plural(q.steps, 'flight'), q.steps * p.steps);
  add('shades', addOnInfo.shades.name, plural(q.shades, 'shade'), q.shades * p.shade);
  add('roof', addOnInfo.roof.name, plural(q.roof.A + q.roof.B, 'shell'), q.roof.A * p.roof.A + q.roof.B * p.roof.B);
  add('solar', addOnInfo.solar.name, plural(q.solar.A + q.solar.B, 'array'), q.solar.A * p.solar.A + q.solar.B * p.solar.B);
  add(
    'access',
    'Gallery and outer staircase',
    [q.galleryM2 && `${q.galleryM2.toFixed(1)} m² of gallery`, q.stairFloors && plural(q.stairFloors, 'floor')].filter(Boolean).join(', '),
    q.galleryM2 * p.gallery + q.stairFloors * p.stair,
  );
  add('delivery', 'Delivery and installation', plural(q.shells.A + q.shells.B, 'shell'), (q.shells.A + q.shells.B) * p.delivery);

  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) / 1000) * 1000;
  return { total, lines, perSqft: sqft ? Math.round(total / sqft) : 0 };
}

const money = new Intl.NumberFormat(pricing.locale, { style: 'currency', currency: pricing.currency, maximumFractionDigits: 0 });
/** "₹14,62,000". */
export const formatPrice = (v: number) => money.format(Math.round(v));
