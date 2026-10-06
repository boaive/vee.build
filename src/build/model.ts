/**
 * The configurator's rules and derived geometry. No three.js here: the
 * panel, the plan drawing and every 3D scene read the same functions.
 *
 * Shells sit on a 3 m grid on a plot the visitor can extend. A placement
 * is valid when it is on the plot, the space is free, and it either joins
 * the house side by side on the ground or rests fully on shells one floor
 * down. World coordinates are metres from the plot's minimum corner;
 * scenes centre the build themselves (extent()).
 */
import {
  DEFAULT_FOUNDATION,
  DEFAULT_PLOT,
  FOUNDATION_HEIGHTS,
  MAX_FLOORS,
  MAX_UNITS,
  type AddOnId,
  type DeckSide,
  type Foundation,
  type ManualAddOn,
  type Plot,
  type ShellType,
  type Turn,
  type UnitSpec,
} from '../data/build';
import { shells } from '../data/system';

export const CELL = 3;
export const STOREY = 3;
/** Screw jack between pedestal and shell (illustrative, notes H-a). */
export const JACK = 0.1;
/** Underside of the ground floor above ground for a foundation. */
export const baseOf = (f: Foundation = DEFAULT_FOUNDATION) => FOUNDATION_HEIGHTS[f.h] / 1000 + JACK;
/** The default foundation's ground-floor underside: 600 mm pedestals plus the jack. */
export const PLINTH = baseOf(DEFAULT_FOUNDATION);
/** Deck depth out from the house. */
export const DECK_D = 1.8;

export interface Unit extends UnitSpec {
  id: number;
}

/** Unit vector of each turn's glazed front, in grid cells (x, z). */
export const FRONT: Record<Turn, [number, number]> = { 0: [0, 1], 1: [1, 0], 2: [0, -1], 3: [-1, 0] };
const SIDES: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function span(t: ShellType, r: Turn): [number, number] {
  if (t === 'B') return [1, 1];
  return r % 2 ? [1, 2] : [2, 1];
}

export function cells(u: Pick<UnitSpec, 't' | 'x' | 'z' | 'r'>): [number, number][] {
  const [sx, sz] = span(u.t, u.r);
  const out: [number, number][] = [];
  for (let i = 0; i < sx; i++) for (let j = 0; j < sz; j++) out.push([u.x + i, u.z + j]);
  return out;
}

const key = (x: number, z: number, y: number) => `${x},${z},${y}`;

export function occupancy(units: readonly Unit[], except?: number) {
  const s = new Set<string>();
  for (const u of units) if (u.id !== except) for (const [x, z] of cells(u)) s.add(key(x, z, u.y));
  return s;
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

export type Verdict = { ok: true } | { ok: false; why: string };
const OK: Verdict = { ok: true };
const no = (why: string): Verdict => ({ ok: false, why });

export const WHY = {
  outside: 'That is outside the plot. Extend the plot to build there.',
  taken: 'That space is taken.',
  unsupported: 'An upper floor needs a shell underneath it.',
  detached: 'New shells join the house side by side.',
  ceiling: 'Five floors is the maximum.',
  full: 'This plot has taken as many shells as it can.',
  loaded: 'A shell rests on this one. Take the floor above off first.',
  split: 'Taking this out would split the house in two.',
  noRoom: 'There is no room to turn it here.',
} as const;

export function check(units: readonly Unit[], c: UnitSpec, except?: number, plot: Plot = DEFAULT_PLOT): Verdict {
  if (c.y < 0 || c.y >= MAX_FLOORS) return no(WHY.ceiling);
  if (except === undefined && units.length >= MAX_UNITS) return no(WHY.full);
  const cs = cells(c);
  for (const [x, z] of cs) if (x < 0 || z < 0 || x >= plot.x || z >= plot.z) return no(WHY.outside);
  const occ = occupancy(units, except);
  for (const [x, z] of cs) if (occ.has(key(x, z, c.y))) return no(WHY.taken);
  if (c.y > 0) return cs.every(([x, z]) => occ.has(key(x, z, c.y - 1))) ? OK : no(WHY.unsupported);
  if (!units.some((u) => u.id !== except && u.y === 0)) return OK;
  const touches = cs.some(([x, z]) => SIDES.some(([dx, dz]) => occ.has(key(x + dx, z + dz, 0))));
  return touches ? OK : no(WHY.detached);
}

/** True when another shell rests on `u`. */
export function isLoaded(units: readonly Unit[], u: Unit) {
  const mine = new Set(cells(u).map(([x, z]) => `${x},${z}`));
  return units.some((o) => o.y === u.y + 1 && cells(o).some(([x, z]) => mine.has(`${x},${z}`)));
}

/** Ground floor stays one connected piece. */
function connected(units: readonly Unit[]) {
  const ground = units.filter((u) => u.y === 0);
  if (ground.length <= 1) return true;
  const occ = new Set(ground.flatMap((u) => cells(u).map(([x, z]) => `${x},${z}`)));
  const start = [...occ][0];
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const [x, z] = queue.pop()!.split(',').map(Number);
    for (const [dx, dz] of SIDES) {
      const k = `${x + dx},${z + dz}`;
      if (occ.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push(k);
      }
    }
  }
  return seen.size === occ.size;
}

export function canRemove(units: readonly Unit[], u: Unit): Verdict {
  if (isLoaded(units, u)) return no(WHY.loaded);
  if (u.y === 0 && !connected(units.filter((o) => o.id !== u.id))) return no(WHY.split);
  return OK;
}

/**
 * A quarter turn, pivoting so the shell stays where it was; if a quarter turn
 * will not fit (or the shell is carrying a floor), a half turn flips its front.
 */
export function rotated(units: readonly Unit[], u: Unit, plot: Plot = DEFAULT_PLOT): Unit | Verdict {
  const quarter = ((u.r + 1) % 4) as Turn;
  const half = ((u.r + 2) % 4) as Turn;
  const tries: Unit[] = [];
  if (u.t === 'B') tries.push({ ...u, r: quarter });
  else if (!isLoaded(units, u)) {
    const offsets: [number, number][] =
      u.r % 2 === 0
        ? [
            [0, 0],
            [1, 0],
            [0, -1],
            [1, -1],
          ]
        : [
            [0, 0],
            [-1, 0],
            [0, 1],
            [-1, 1],
          ];
    for (const [dx, dz] of offsets) tries.push({ ...u, r: quarter, x: u.x + dx, z: u.z + dz });
  }
  if (u.t === 'A') tries.push({ ...u, r: half });
  for (const t of tries) if (check(units, t, u.id, plot).ok) return t;
  return no(WHY.noRoom);
}

/** Best free spot for a one-tap "add": beside the house on the ground, else on top. */
export function suggest(units: readonly Unit[], t: ShellType, r: Turn, plot: Plot = DEFAULT_PLOT): UnitSpec | null {
  if (units.length >= MAX_UNITS) return null;
  if (!units.length) {
    const [sx, sz] = span(t, r);
    return { t, r, y: 0, x: Math.floor((plot.x - sx) / 2), z: Math.floor((plot.z - sz) / 2) };
  }
  const ground = units.filter((u) => u.y === 0);
  let cx = 0;
  let cz = 0;
  for (const u of ground) {
    const [sx, sz] = span(u.t, u.r);
    cx += u.x + sx / 2;
    cz += u.z + sz / 2;
  }
  cx /= ground.length || 1;
  cz /= ground.length || 1;
  for (let y = 0; y < MAX_FLOORS; y++) {
    let best: UnitSpec | null = null;
    let score = Infinity;
    for (let x = 0; x < plot.x; x++)
      for (let z = 0; z < plot.z; z++)
        for (const rr of t === 'A' ? [r, ((r + 1) % 4) as Turn] : [r]) {
          const c: UnitSpec = { t, r: rr, x, z, y };
          if (!check(units, c, undefined, plot).ok) continue;
          const [sx, sz] = span(t, rr);
          // Prefer staying close and spreading along x (the street), facing it.
          const d = Math.hypot(x + sx / 2 - cx, (z + sz / 2 - cz) * 1.4) + (rr === r ? 0 : 0.6);
          if (d < score) {
            score = d;
            best = c;
          }
        }
    if (best) return best;
  }
  return null;
}

/** Shift a layout so its ground footprint sits in the middle of the plot. */
export function centred(specs: readonly UnitSpec[], plot: Plot = DEFAULT_PLOT): UnitSpec[] {
  if (!specs.length) return [];
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const s of specs)
    for (const [x, z] of cells(s)) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x + 1);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z + 1);
    }
  const ox = Math.floor((plot.x - (x1 - x0)) / 2) - x0;
  // Leave the front row free for a deck where the plot allows it.
  const oz = Math.max(0, Math.floor((plot.z - (z1 - z0) - 1) / 2)) - z0;
  return specs.map((s) => ({ ...s, x: s.x + ox, z: s.z + oz }));
}

/** The smallest plot (at least the default) that holds a layout. */
export function plotFor(specs: readonly UnitSpec[]): Plot {
  let x1 = 0;
  let z1 = 0;
  for (const s of specs)
    for (const [x, z] of cells(s)) {
      x1 = Math.max(x1, x + 1);
      z1 = Math.max(z1, z + 1);
    }
  return { x: Math.max(DEFAULT_PLOT.x, x1), z: Math.max(DEFAULT_PLOT.z, z1 + 1) };
}

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

export interface Totals {
  count: number;
  a: number;
  b: number;
  /** Nominal, from the brief: Shell A 200, Shell B 100 sq.ft. */
  sqft: number;
  sqm: number;
  floors: number;
  /** Ground footprint, metres. */
  width: number;
  depth: number;
  height: number;
}

export function totals(units: readonly Unit[]): Totals {
  let a = 0;
  let b = 0;
  let top = -1;
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const u of units) {
    if (u.t === 'A') a++;
    else b++;
    top = Math.max(top, u.y);
    if (u.y === 0)
      for (const [x, z] of cells(u)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + 1);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z + 1);
      }
  }
  const floors = top + 1;
  return {
    count: units.length,
    a,
    b,
    sqft: a * shells.A.sqft + b * shells.B.sqft,
    sqm: a * shells.A.sqm + b * shells.B.sqm,
    floors,
    width: units.length ? (x1 - x0) * CELL : 0,
    depth: units.length ? (z1 - z0) * CELL : 0,
    height: floors * STOREY,
  };
}

export const floorName = (y: number) => (y === 0 ? 'Ground' : `Floor ${y}`);

/** World centre and size of a build, for framing it. */
export function extent(units: readonly Unit[], base = PLINTH) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let top = 1;
  for (const u of units) {
    const [sx, sz] = span(u.t, u.r);
    x0 = Math.min(x0, u.x);
    x1 = Math.max(x1, u.x + sx);
    z0 = Math.min(z0, u.z);
    z1 = Math.max(z1, u.z + sz);
    top = Math.max(top, u.y + 1);
  }
  if (!units.length) return { cx: 0, cz: 0, w: 0, d: 0, h: 0, r: 0, reach: 9 };
  const w = (x1 - x0) * CELL;
  const d = (z1 - z0) * CELL;
  const h = top * STOREY + base;
  return {
    cx: ((x0 + x1) / 2) * CELL,
    cz: ((z0 + z1) / 2) * CELL,
    w,
    d,
    h,
    r: Math.hypot(w, d) / 2,
    /** A camera distance unit that keeps the whole build in frame. */
    reach: Math.max(9, Math.hypot(w, d, h * 1.2) * 0.62),
  };
}

export function describe(units: readonly Unit[], addOns: readonly AddOnId[] = []) {
  const t = totals(units);
  if (!t.count) return 'No shells placed yet.';
  const parts = [];
  if (t.a) parts.push(`${t.a} × Shell A (6 m × 3 m)`);
  if (t.b) parts.push(`${t.b} × Shell B (3 m × 3 m)`);
  const floors = t.floors === 1 ? '1 floor' : `${t.floors} floors (G+${t.floors - 1})`;
  return `${parts.join(' + ')} · ${t.sqft} sq.ft. nominal · ${floors} · ${t.width} m × ${t.depth} m footprint${addOns.length ? ` · add-ons: ${addOns.join(', ')}` : ''}`;
}

/* ------------------------------------------------------------------ */
/* World placement                                                     */
/* ------------------------------------------------------------------ */

/** World centre (x, base y, z) and rotation of a unit, in metres from the plot corner. */
export function placeOf(u: Pick<UnitSpec, 't' | 'x' | 'z' | 'y' | 'r'>, base = PLINTH): [number, number, number, number] {
  const [sx, sz] = span(u.t, u.r);
  return [(u.x + sx / 2) * CELL, base + u.y * STOREY, (u.z + sz / 2) * CELL, (u.r * Math.PI) / 2];
}

export const cellToWorld = (cx: number, cz: number): [number, number] => [cx * CELL, cz * CELL];

export const worldToCell = (x: number, z: number): [number, number] => [Math.floor(x / CELL), Math.floor(z / CELL)];

/** World side (a Turn) a face normal points to. */
export function sideOf(nx: number, nz: number): Turn {
  if (Math.abs(nz) >= Math.abs(nx)) return nz >= 0 ? 0 : 2;
  return nx >= 0 ? 1 : 3;
}

/* ------------------------------------------------------------------ */
/* Foundation layout (illustrative, notes C2 and H)                    */
/* ------------------------------------------------------------------ */

export interface FootingSpot {
  x: number;
  z: number;
  /** Which quadrants around the point carry a shell: +x+z, −x+z, −x−z, +x−z. */
  q: [boolean, boolean, boolean, boolean];
  /** Shells resting on it. More than one: a combined footing. */
  shared: number;
}

export interface PlinthRun {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Side the toe points to (into the building), as a Turn; null when shared both ways. */
  inward: Turn | null;
  /** Precast piece length: 1425 mm on a 6 m side, 1350 mm on a 3 m side. */
  piece: number;
  /** Carries two shells' edges. */
  shared: boolean;
}

export interface FoundationLayout {
  footings: FootingSpot[];
  plinths: PlinthRun[];
}

/**
 * A footing at every ground-floor shell corner. Where shells meet, they
 * share one: a combined footing at a common corner, and one plinth run on a
 * common edge instead of two (the client's question, notes H-b).
 */
export function foundationLayout(units: readonly Unit[]): FoundationLayout {
  const ground = units.filter((u) => u.y === 0);
  const corners = new Map<string, FootingSpot>();
  const occ = new Set(ground.flatMap((u) => cells(u).map(([x, z]) => `${x},${z}`)));
  for (const u of ground) {
    const [sx, sz] = span(u.t, u.r);
    const pts: [number, number, number][] = [
      [u.x, u.z, 0],
      [u.x + sx, u.z, 1],
      [u.x + sx, u.z + sz, 2],
      [u.x, u.z + sz, 3],
    ];
    for (const [gx, gz, q] of pts) {
      const k = `${gx},${gz}`;
      let c = corners.get(k);
      if (!c) {
        c = { x: gx * CELL, z: gz * CELL, q: [false, false, false, false], shared: 0 };
        corners.set(k, c);
      }
      c.q[q] = true;
      c.shared++;
    }
  }
  // Grid points on shell edges that hold another shell's corner split the plinth there.
  const isFooting = (gx: number, gz: number) => corners.has(`${gx},${gz}`);
  const runs = new Map<string, PlinthRun>();
  for (const u of ground) {
    const [sx, sz] = span(u.t, u.r);
    const longX = sx > sz;
    const edges: { a: [number, number]; b: [number, number]; out: Turn; alongX: boolean }[] = [
      { a: [u.x, u.z], b: [u.x + sx, u.z], out: 2, alongX: true },
      { a: [u.x, u.z + sz], b: [u.x + sx, u.z + sz], out: 0, alongX: true },
      { a: [u.x, u.z], b: [u.x, u.z + sz], out: 3, alongX: false },
      { a: [u.x + sx, u.z], b: [u.x + sx, u.z + sz], out: 1, alongX: false },
    ];
    for (const e of edges) {
      const n = e.alongX ? e.b[0] - e.a[0] : e.b[1] - e.a[1];
      let start = 0;
      for (let i = 1; i <= n; i++) {
        const gx = e.alongX ? e.a[0] + i : e.a[0];
        const gz = e.alongX ? e.a[1] : e.a[1] + i;
        if (i < n && !isFooting(gx, gz)) continue;
        const ax = e.alongX ? e.a[0] + start : e.a[0];
        const az = e.alongX ? e.a[1] : e.a[1] + start;
        // The cell beyond this stretch of edge decides whether it is shared.
        const cx = e.alongX ? ax : e.out === 1 ? ax : ax - 1;
        const cz = e.alongX ? (e.out === 0 ? az : az - 1) : az;
        const shared = occ.has(`${cx},${cz}`);
        const k = `${Math.min(ax, gx)},${Math.min(az, gz)},${Math.max(ax, gx)},${Math.max(az, gz)}`;
        const piece = (e.alongX ? longX : !longX) && u.t === 'A' ? 1.425 : 1.35;
        const prev = runs.get(k);
        if (prev) {
          prev.shared = true;
          prev.inward = null;
          if (piece > prev.piece) prev.piece = piece;
        } else
          runs.set(k, {
            x0: ax * CELL,
            z0: az * CELL,
            x1: gx * CELL,
            z1: gz * CELL,
            inward: shared ? null : (((e.out + 2) % 4) as Turn),
            piece,
            shared,
          });
        start = i;
      }
    }
  }
  return { footings: [...corners.values()], plinths: [...runs.values()] };
}

/* ------------------------------------------------------------------ */
/* Add-on layout                                                       */
/* ------------------------------------------------------------------ */

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}
export interface Seg {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Height of the surface the segment stands on. */
  y: number;
}
export interface Placed {
  x: number;
  y: number;
  z: number;
  ry: number;
  w: number;
}

export interface AddOnLayout {
  side: Turn;
  deckY: number;
  decks: (Rect & { side: Turn })[];
  posts: [number, number][];
  spandrels: Seg[];
  rails: Seg[];
  steps: (Placed & { side: Turn })[];
  shades: Placed[];
  roofs: (Placed & { t: ShellType })[];
  solar: (Placed & { t: ShellType; sloped: boolean })[];
}

/** The side most glazed fronts face out of, street side first on a tie. */
export function dominantSide(units: readonly Unit[]): Turn {
  const occ = occupancy(units);
  const score = [0, 0, 0, 0];
  for (const u of units) {
    if (u.y !== 0) continue;
    const [fx, fz] = FRONT[u.r];
    const open = cells(u).some(([x, z]) => !occ.has(key(x + fx, z + fz, 0)));
    if (open) score[u.r] += u.t === 'A' ? 2 : 1;
  }
  const order: Turn[] = [0, 1, 3, 2];
  return order.reduce((best, s) => (score[s] > score[best] ? s : best), order[0]);
}

/** Exposed cell edges of ground unit `u` on world side `s`: [cellX, cellZ] list. */
function exposedOn(u: Unit, s: Turn, occ: Set<string>, y = 0): [number, number][] {
  const [dx, dz] = FRONT[s];
  return cells(u).filter(([x, z]) => !occ.has(key(x + dx, z + dz, y)));
}

/** Deck rect for one exposed cell edge on side s. */
function deckRect(x: number, z: number, s: Turn): Rect & { side: Turn } {
  const [wx, wz] = cellToWorld(x, z);
  if (s === 0) return { x0: wx, x1: wx + CELL, z0: wz + CELL, z1: wz + CELL + DECK_D, side: s };
  if (s === 2) return { x0: wx, x1: wx + CELL, z0: wz - DECK_D, z1: wz, side: s };
  if (s === 1) return { x0: wx + CELL, x1: wx + CELL + DECK_D, z0: wz, z1: wz + CELL, side: s };
  return { x0: wx - DECK_D, x1: wx, z0: wz, z1: wz + CELL, side: s };
}

/** Merge touching deck rects on the same side and line into runs. */
function mergeDecks(list: (Rect & { side: Turn })[]) {
  const out: (Rect & { side: Turn })[] = [];
  const sorted = [...list].sort((a, b) => a.side - b.side || a.z0 - b.z0 || a.x0 - b.x0);
  for (const r of sorted) {
    const alongX = r.side === 0 || r.side === 2;
    const last = out.find(
      (o) =>
        o.side === r.side &&
        (alongX ? Math.abs(o.z0 - r.z0) < 1e-6 && Math.abs(o.x1 - r.x0) < 1e-6 : Math.abs(o.x0 - r.x0) < 1e-6 && Math.abs(o.z1 - r.z0) < 1e-6),
    );
    if (last) {
      if (alongX) last.x1 = r.x1;
      else last.z1 = r.z1;
    } else if (!out.some((o) => o.side === r.side && o.x0 === r.x0 && o.z0 === r.z0)) out.push({ ...r });
  }
  return out;
}

const outerOf = (r: Rect & { side: Turn }, y: number): Seg =>
  r.side === 0
    ? { x0: r.x0, z0: r.z1, x1: r.x1, z1: r.z1, y }
    : r.side === 2
      ? { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z0, y }
      : r.side === 1
        ? { x0: r.x1, z0: r.z0, x1: r.x1, z1: r.z1, y }
        : { x0: r.x0, z0: r.z0, x1: r.x0, z1: r.z1, y };

const endsOf = (r: Rect & { side: Turn }, y: number): Seg[] =>
  r.side === 0 || r.side === 2
    ? [
        { x0: r.x0, z0: r.z0, x1: r.x0, z1: r.z1, y },
        { x0: r.x1, z0: r.z0, x1: r.x1, z1: r.z1, y },
      ]
    : [
        { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z0, y },
        { x0: r.x0, z0: r.z1, x1: r.x1, z1: r.z1, y },
      ];

const STEP_W = 1.2;

export function layoutAddOns(
  units: readonly Unit[],
  on: ReadonlySet<AddOnId>,
  deckSide: DeckSide,
  manual: readonly ManualAddOn[] | null = null,
  base = PLINTH,
): AddOnLayout {
  const side: Turn = deckSide === 'auto' ? dominantSide(units) : deckSide;
  const deckY = base + 0.12;
  const out: AddOnLayout = { side, deckY, decks: [], posts: [], spandrels: [], rails: [], steps: [], shades: [], roofs: [], solar: [] };
  const occ = occupancy(units);
  const ground = units.filter((u) => u.y === 0);
  const byId = new Map(units.map((u) => [u.id, u]));

  /* Decks */
  const rects: (Rect & { side: Turn })[] = [];
  if (manual) {
    for (const m of manual) {
      if (m.k !== 'deck' || m.s === undefined) continue;
      const u = byId.get(m.u);
      if (!u || u.y !== 0) continue;
      for (const [x, z] of exposedOn(u, m.s, occ)) rects.push(deckRect(x, z, m.s));
    }
  } else if (on.has('deck') && ground.length) {
    for (const u of ground) for (const [x, z] of exposedOn(u, side, occ)) rects.push(deckRect(x, z, side));
    // Keep only the outermost line on the deck side (as before: one deck along the front).
    const alongX = side === 0 || side === 2;
    const outward = side === 0 || side === 1;
    const best = new Map<number, number>();
    for (const r of rects) {
      const line = alongX ? r.x0 : r.z0;
      const depth = alongX ? r.z0 : r.x0;
      const cur = best.get(line);
      if (cur === undefined || (outward ? depth > cur : depth < cur)) best.set(line, depth);
    }
    const kept = rects.filter((r) => best.get(alongX ? r.x0 : r.z0) === (alongX ? r.z0 : r.x0));
    rects.length = 0;
    rects.push(...kept);
  }
  out.decks = mergeDecks(rects);

  /* Steps */
  const stepsWanted: { u?: Unit; s: Turn }[] = [];
  if (manual) {
    for (const m of manual) if (m.k === 'steps' && m.s !== undefined) stepsWanted.push({ u: byId.get(m.u), s: m.s });
  } else if (on.has('steps') && out.decks.length) {
    const longest = out.decks.reduce((b, r) => (Math.abs(r.x1 - r.x0) + Math.abs(r.z1 - r.z0) > Math.abs(b.x1 - b.x0) + Math.abs(b.z1 - b.z0) ? r : b), out.decks[0]);
    const e = outerOf(longest, deckY);
    out.steps.push({ x: (e.x0 + e.x1) / 2, y: 0, z: (e.z0 + e.z1) / 2, ry: (longest.side * Math.PI) / 2, w: STEP_W, side: longest.side });
  }
  for (const w of stepsWanted) {
    if (!w.u) continue;
    const exposed = exposedOn(w.u, w.s, occ);
    if (!exposed.length) continue;
    // Middle of this shell's stretch of deck on that side, if a deck is there.
    const segs = exposed.map(([x, z]) => outerOf(deckRect(x, z, w.s), deckY));
    const deck = out.decks.find((d) => d.side === w.s && segs.some((sg) => touchesSeg(d, sg)));
    if (!deck) continue;
    const mx = segs.reduce((a, sg) => a + (sg.x0 + sg.x1) / 2, 0) / segs.length;
    const mz = segs.reduce((a, sg) => a + (sg.z0 + sg.z1) / 2, 0) / segs.length;
    out.steps.push({ x: mx, y: 0, z: mz, ry: (w.s * Math.PI) / 2, w: STEP_W, side: w.s });
  }

  /* Deck details: follow the decks in both modes. */
  const details = on;
  out.decks.forEach((r) => {
    const e = outerOf(r, deckY);
    const len = Math.hypot(e.x1 - e.x0, e.z1 - e.z0);
    if (details.has('posts')) {
      const n = Math.max(1, Math.round(len / 1.5));
      for (let k = 0; k <= n; k++) out.posts.push([e.x0 + ((e.x1 - e.x0) * k) / n, e.z0 + ((e.z1 - e.z0) * k) / n]);
    }
    if (details.has('spandrel')) out.spandrels.push(e, ...endsOf(r, deckY));
    if (details.has('handrail')) {
      // Leave openings where steps land on this edge.
      const ux = (e.x1 - e.x0) / len;
      const uz = (e.z1 - e.z0) / len;
      const cuts = out.steps
        .filter((s) => s.side === r.side && Math.abs((s.x - e.x0) * uz - (s.z - e.z0) * ux) < 0.05)
        .map((s) => (s.x - e.x0) * ux + (s.z - e.z0) * uz)
        .filter((t) => t > 0 && t < len)
        .sort((a, b) => a - b);
      let t0 = 0;
      const g = STEP_W / 2 + 0.05;
      for (const t of cuts) {
        if (t - g > t0 + 0.2) out.rails.push({ ...e, x0: e.x0 + ux * t0, z0: e.z0 + uz * t0, x1: e.x0 + ux * (t - g), z1: e.z0 + uz * (t - g) });
        t0 = t + g;
      }
      if (len > t0 + 0.2) out.rails.push({ ...e, x0: e.x0 + ux * t0, z0: e.z0 + uz * t0 });
      for (const end of endsOf(r, deckY)) {
        if (!out.decks.some((o) => o !== r && touchesSeg(o, end))) out.rails.push(end);
      }
    }
  });

  /* Roof terraces: open roof beside a floor above gets a handrail. */
  if (on.has('handrail')) {
    const topLevels = new Set(units.map((u) => u.y));
    for (const u of units) {
      const lvl = u.y + 1;
      if (!topLevels.has(lvl)) continue;
      for (const [x, z] of cells(u)) {
        if (occ.has(key(x, z, lvl))) continue;
        for (const [dx, dz] of SIDES) {
          const nx = x + dx;
          const nz = z + dz;
          if (occ.has(key(nx, nz, lvl))) continue; // a wall
          if (occ.has(key(nx, nz, lvl - 1)) && !occ.has(key(nx, nz, lvl))) continue; // terrace continues
          const [wx, wz] = cellToWorld(x, z);
          const y = base + lvl * STOREY;
          const seg =
            dx === 1
              ? { x0: wx + CELL, z0: wz, x1: wx + CELL, z1: wz + CELL, y }
              : dx === -1
                ? { x0: wx, z0: wz, x1: wx, z1: wz + CELL, y }
                : dz === 1
                  ? { x0: wx, z0: wz + CELL, x1: wx + CELL, z1: wz + CELL, y }
                  : { x0: wx, z0: wz, x1: wx + CELL, z1: wz, y };
          out.rails.push(inset(seg, 0.12));
        }
      }
    }
  }

  /* Shades, roofs and solar. */
  const levels = new Set(units.map((u) => u.y));
  const topShell = (u: Unit) => !cells(u).some(([x, z]) => occ.has(key(x, z, u.y + 1))) && !levels.has(u.y + 1);
  const shadeOn = (u: Unit, s: Turn) => {
    const [cx, by, cz] = placeOf(u, base);
    const [sx, sz] = span(u.t, u.r);
    const along = s === 0 || s === 2 ? sx * CELL : sz * CELL;
    const [fx, fz] = FRONT[s];
    const half = s === 0 || s === 2 ? (sz * CELL) / 2 : (sx * CELL) / 2;
    out.shades.push({ x: cx + fx * (half + 0.28), y: by + 2.52, z: cz + fz * (half + 0.28), ry: (s * Math.PI) / 2, w: along - 0.7 });
  };
  const roofOn = (u: Unit) => {
    const [cx, by, cz, ry] = placeOf(u, base);
    out.roofs.push({ x: cx, y: by + STOREY, z: cz, ry, w: u.t === 'A' ? 6 : 3, t: u.t });
  };
  const solarOn = (u: Unit, sloped: boolean) => {
    const [cx, by, cz, ry] = placeOf(u, base);
    out.solar.push({ x: cx, y: by + STOREY, z: cz, ry, w: u.t === 'A' ? 6 : 3, t: u.t, sloped });
  };

  if (manual) {
    const roofed = new Set(manual.filter((m) => m.k === 'roof').map((m) => m.u));
    for (const m of manual) {
      const u = byId.get(m.u);
      if (!u) continue;
      if (m.k === 'shade' && m.s !== undefined && exposedOn(u, m.s, occ, u.y).length) shadeOn(u, m.s);
      if (m.k === 'roof' && topShell(u)) roofOn(u);
      if (m.k === 'solar' && topShell(u)) solarOn(u, roofed.has(u.id));
    }
  } else {
    for (const u of units) {
      if (on.has('shades') && exposedOn(u, u.r, occ, u.y).length) shadeOn(u, u.r);
      if (!topShell(u)) continue;
      if (on.has('roof')) roofOn(u);
      if (on.has('solar')) solarOn(u, on.has('roof'));
    }
  }

  return out;
}

function touchesSeg(r: Rect, s: Seg) {
  const e = 0.01;
  const onX = (v: number) => Math.abs(v - r.x0) < e || Math.abs(v - r.x1) < e;
  const onZ = (v: number) => Math.abs(v - r.z0) < e || Math.abs(v - r.z1) < e;
  if (Math.abs(s.x0 - s.x1) < e) return onX(s.x0) && Math.min(s.z0, s.z1) < r.z1 - e && Math.max(s.z0, s.z1) > r.z0 + e;
  return onZ(s.z0) && Math.min(s.x0, s.x1) < r.x1 - e && Math.max(s.x0, s.x1) > r.x0 + e;
}

function inset(s: Seg, d: number): Seg {
  const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
  const ux = (s.x1 - s.x0) / len;
  const uz = (s.z1 - s.z0) / len;
  return { ...s, x0: s.x0 + ux * d, z0: s.z0 + uz * d, x1: s.x1 - ux * d, z1: s.z1 - uz * d };
}
