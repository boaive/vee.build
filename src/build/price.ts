/**
 * The build's indicative price (client, 2026-10-11), counted from what the
 * configurator actually lays out: the shells, the footings and plinth runs
 * of its foundation (foundationLayout), every deck, post, rail, flight of
 * steps, shade, roof and array the add-on rule places (layoutAddOns), the
 * galleries and staircase an upper floor brings, and delivery for each
 * shell. Rates are in data/pricing.ts. No three.js in here.
 */
import { FOUNDATION_HEIGHTS, addOnInfo, type AddOnId, type DeckSide, type Foundation, type ManualAddOn, type Plot } from '../data/build';
import { pricing } from '../data/pricing';
import { baseOf, foundationLayout, layoutAddOns, totals, type Unit } from './model';

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

const length = (s: { x0: number; z0: number; x1: number; z1: number }) => Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
const area = (r: { x0: number; z0: number; x1: number; z1: number }) => Math.abs((r.x1 - r.x0) * (r.z1 - r.z0));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const metres = (m: number) => `${m.toFixed(m < 10 ? 1 : 0)} m`;

export function estimate(b: Priced): Estimate {
  const units = b.units;
  if (!units.length) return { total: 0, lines: [], perSqft: 0 };
  const p = pricing;
  const lines: PriceLine[] = [];
  const add = (id: string, label: string, detail: string, amount: number) => {
    if (amount > 0) lines.push({ id, label, detail, amount });
  };
  const t = totals(units);

  add('shells', 'Shells', [t.a && `${t.a} × Shell A`, t.b && `${t.b} × Shell B`].filter(Boolean).join(', '), t.a * p.shell.A + t.b * p.shell.B);

  // Foundation: a footing at every ground-floor corner (one shared where shells meet), L plinth along the edges if chosen.
  const f = foundationLayout(units);
  const h = b.foundation.h;
  const combined = f.footings.filter((s) => s.shared > 1).length;
  const run = b.foundation.type === 'plinth' ? f.plinths.reduce((s, r) => s + length(r), 0) : 0;
  add(
    'foundation',
    'Foundation',
    `${plural(f.footings.length, 'footing')}${run ? `, ${metres(run)} of L plinth` : ''}, ${FOUNDATION_HEIGHTS[h]} mm`,
    p.footing[h] * (f.footings.length + combined * p.combined) + p.plinth[h] * run,
  );

  // Add-ons, as laid out; the rails a bare layout already has belong to the galleries.
  const base = baseOf(b.foundation);
  const on = new Set(b.addOns);
  const full = layoutAddOns(units, on, b.deckSide, b.manual, base, b.plot);
  const bare = layoutAddOns(units, new Set(), b.deckSide, null, base, b.plot);
  const deck = full.decks.reduce((s, r) => s + area(r), 0);
  const spandrel = full.spandrels.reduce((s, e) => s + length(e), 0);
  const rail = Math.max(0, full.rails.reduce((s, e) => s + length(e), 0) - bare.rails.reduce((s, e) => s + length(e), 0));
  const roofs = { A: full.roofs.filter((r) => r.t === 'A').length, B: full.roofs.filter((r) => r.t === 'B').length };
  const solar = { A: full.solar.filter((r) => r.t === 'A').length, B: full.solar.filter((r) => r.t === 'B').length };
  add('deck', addOnInfo.deck.name, `${deck.toFixed(1)} m²`, deck * p.deck);
  add('posts', addOnInfo.posts.name, plural(full.posts.length, 'post'), full.posts.length * p.post);
  add('spandrel', addOnInfo.spandrel.name, metres(spandrel), spandrel * p.spandrel);
  add('handrail', addOnInfo.handrail.name, metres(rail), rail * p.handrail);
  add('steps', addOnInfo.steps.name, plural(full.steps.length, 'flight'), full.steps.length * p.steps);
  add('shades', addOnInfo.shades.name, plural(full.shades.length, 'shade'), full.shades.length * p.shade);
  add('roof', addOnInfo.roof.name, plural(roofs.A + roofs.B, 'shell'), roofs.A * p.roof.A + roofs.B * p.roof.B);
  add('solar', addOnInfo.solar.name, plural(solar.A + solar.B, 'array'), solar.A * p.solar.A + solar.B * p.solar.B);

  // Upper floors: the galleries and the one outer staircase come with them.
  const gallery = full.galleries.reduce((s, g) => s + area(g), 0);
  const flights = full.stairs.reduce((s, st) => s + st.levels.length, 0);
  add('access', 'Gallery and outer staircase', [gallery && `${gallery.toFixed(1)} m² of gallery`, flights && plural(flights, 'floor')].filter(Boolean).join(', '), gallery * p.gallery + flights * p.stair);

  add('delivery', 'Delivery and installation', plural(units.length, 'shell'), units.length * p.delivery);

  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) / 1000) * 1000;
  return { total, lines, perSqft: t.sqft ? Math.round(total / t.sqft) : 0 };
}

const money = new Intl.NumberFormat(pricing.locale, { style: 'currency', currency: pricing.currency, maximumFractionDigits: 0 });
/** "₹14,62,000". */
export const formatPrice = (v: number) => money.format(Math.round(v));
