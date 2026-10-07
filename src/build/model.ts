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
  type ManualKind,
  type Plot,
  type ShellType,
  type Turn,
  type UnitSpec,
} from '../data/build';
import { DOOR_AT, shells, type DoorFace } from '../data/system';

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
  // Room in front for a deck and behind for a back door's: the house stands in the middle, nearer the back if it must lean.
  const oz = Math.floor((plot.z - (z1 - z0)) / 2) - z0;
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
  // An upper floor needs the outer staircase, which stands beside the building: a cell to spare on each side.
  const stacked = specs.some((u) => u.y > 0);
  // A row to spare in front and one behind, for the decks at the doors.
  return { x: Math.max(DEFAULT_PLOT.x, x1 + (stacked ? 2 : 0)), z: Math.max(DEFAULT_PLOT.z, z1 + 2) };
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
/* Doors                                                               */
/* ------------------------------------------------------------------ */

export const WALL_FACES = ['front', 'left', 'right', 'back'] as const;
export type WallFace = (typeof WALL_FACES)[number];

/** World side (a Turn) a shell's face looks out of. The right end is the shell's +x end. */
export function faceSide(f: WallFace, r: Turn): Turn {
  return ((r + (f === 'front' ? 0 : f === 'right' ? 1 : f === 'back' ? 2 : 3)) % 4) as Turn;
}

export interface DoorSpot {
  /** Centre of the door on its wall, metres from the plot corner; y is the shell's underside. */
  x: number;
  y: number;
  z: number;
  /** The side it opens to. */
  side: Turn;
  /** The shell's own cell behind it. */
  cell: [number, number];
}

export function doorSpot(u: Pick<UnitSpec, 't' | 'x' | 'z' | 'y' | 'r'>, f: WallFace, base = PLINTH): DoorSpot {
  const [cx, by, cz, ry] = placeOf(u, base);
  const half = u.t === 'A' ? 3 : 1.5;
  const at = DOOR_AT[u.t][f];
  // On the shell's own plan: x along it, z towards its front.
  const lx = f === 'front' || f === 'back' ? at : f === 'right' ? half : -half;
  const lz = f === 'front' ? 1.5 : f === 'back' ? -1.5 : at;
  const cos = Math.round(Math.cos(ry));
  const sin = Math.round(Math.sin(ry));
  const x = cx + lx * cos + lz * sin;
  const z = cz - lx * sin + lz * cos;
  const side = faceSide(f, u.r);
  const [dx, dz] = FRONT[side];
  return { x, y: by, z, side, cell: worldToCell(x - dx * 0.5, z - dz * 0.5) };
}

/**
 * The face each shell's one door is on. The front, as the client's model
 * has it, unless a shell stands against it there; then the door goes to a
 * free face, the street side first. Two refinements: a turned shell at the
 * end of a row of turned shells opens to the street like the rest of its
 * row, and between otherwise equal faces an upper shell takes the one that
 * opens onto a roof below it.
 * `none`: every face is built against, and the shell is reached through
 * its neighbours. So is the upper part of a stair lobby (brief, 2.3): Shell
 * B standing on Shell B beside the building is the way up inside, and above
 * the ground it has no door of its own.
 */
export function doorFaces(units: readonly Unit[]): Map<number, DoorFace> {
  const occ = occupancy(units);
  const at = new Map<string, Unit>();
  for (const u of units) for (const [x, z] of cells(u)) at.set(key(x, z, u.y), u);
  const out = new Map<number, DoorFace>();
  for (const u of units) {
    if (u.t === 'B' && u.y > 0 && at.get(key(u.x, u.z, u.y - 1))?.t === 'B' && SIDES.some(([dx, dz]) => occ.has(key(u.x + dx, u.z + dz, u.y)) || occ.has(key(u.x + dx, u.z + dz, u.y - 1)))) {
      out.set(u.id, 'none');
      continue;
    }
    const [bx, bz] = FRONT[((u.r + 2) % 4) as Turn];
    const row =
      u.t === 'A' &&
      u.r % 2 === 1 &&
      cells(u).every(([x, z]) => {
        const o = at.get(key(x + bx, z + bz, u.y));
        return !!o && o.t === 'A' && o.r === u.r;
      });
    let best: DoorFace = 'none';
    let top = -Infinity;
    for (const f of WALL_FACES) {
      const d = doorSpot(u, f);
      const [dx, dz] = FRONT[d.side];
      const nx = d.cell[0] + dx;
      const nz = d.cell[1] + dz;
      if (occ.has(key(nx, nz, u.y))) continue;
      let s = f === 'front' ? 4 : f === 'left' ? 1 : f === 'right' ? 0.9 : 0;
      if (f !== 'front' && d.side === 0) s += 1.5 + (row ? 2 : 0);
      if (u.y > 0 && occ.has(key(nx, nz, u.y - 1))) s += 0.3;
      if (s > top) {
        top = s;
        best = f;
      }
    }
    out.set(u.id, best);
  }
  return out;
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

/** A walkway outside an upper floor's door, carried off the shells. `y` is its top. */
export interface Gallery extends Rect {
  y: number;
}

/**
 * The outer staircase. A building has one, and it stands beside the
 * building, not across its front: a dog-leg (one U-bend for each floor) in
 * a plan 2 m wide and 4.5 m long, its long side against the building's
 * flank where there is room, with a landing at each floor that the floor's
 * gallery or open roof meets.
 */
export interface Stair {
  /** The corner of its plan where the floor landings lie and a floor meets them, metres from the plot corner. */
  x: number;
  z: number;
  /** The way its length runs from that corner, and the way its width does (away from the floor it serves). */
  u: Turn;
  v: Turn;
  /** Height of each floor's landing, lowest first, and whether a floor meets it there. */
  levels: number[];
  open: boolean[];
}
/** Galleries are half a cell deep, so they and the landings lie on a 1.5 m grid. */
export const GALLERY_D = CELL / 2;
/** The staircase's plan: two lanes side by side, a floor landing as deep as a gallery, a half landing at the far end. */
export const STAIR = { w: 2, lane: 0.95, land: GALLERY_D, half: 1, run: 2, len: 4.5 } as const;

/** One selectable thing in the layout: what it is, the shell it belongs to, and the box it fills. */
export interface Piece {
  k: ManualKind | 'access';
  u: number;
  s?: Turn;
  /** x0, y0, z0, x1, y1, z1 in metres from the plot corner. */
  box: [number, number, number, number, number, number];
}

export interface AddOnLayout {
  side: Turn;
  deckY: number;
  decks: (Rect & { side: Turn })[];
  posts: [number, number][];
  spandrels: Seg[];
  rails: Seg[];
  steps: (Placed & { side: Turn; u: number })[];
  shades: Placed[];
  roofs: (Placed & { t: ShellType })[];
  solar: (Placed & { t: ShellType; sloped: boolean })[];
  /** Upper floors: a gallery at each door and one outer staircase up to them. Always there, never chosen. */
  galleries: Gallery[];
  stairs: Stair[];
  pieces: Piece[];
}

/** The side most doors open to, street side first on a tie. Fronts decide when no shell has a door. */
export function dominantSide(units: readonly Unit[], doors: ReadonlyMap<number, DoorFace> = doorFaces(units)): Turn {
  const occ = occupancy(units);
  const score = [0, 0, 0, 0];
  for (const u of units) {
    if (u.y !== 0) continue;
    const f = doors.get(u.id);
    if (f && f !== 'none') score[faceSide(f, u.r)] += u.t === 'A' ? 2 : 1;
    const [fx, fz] = FRONT[u.r];
    if (cells(u).some(([x, z]) => !occ.has(key(x + fx, z + fz, 0)))) score[u.r] += 0.25;
  }
  const order: Turn[] = [0, 1, 3, 2];
  return order.reduce((best, s) => (score[s] > score[best] ? s : best), order[0]);
}

/** Exposed cell edges of unit `u` on world side `s`: [cellX, cellZ] list. */
function exposedOn(u: Unit, s: Turn, occ: Set<string>, y = 0): [number, number][] {
  const [dx, dz] = FRONT[s];
  return cells(u).filter(([x, z]) => !occ.has(key(x + dx, z + dz, y)));
}

/** Rect of depth `depth` outside one cell edge on side s. */
function edgeRect(x: number, z: number, s: Turn, depth = DECK_D): Rect & { side: Turn } {
  const [wx, wz] = cellToWorld(x, z);
  if (s === 0) return { x0: wx, x1: wx + CELL, z0: wz + CELL, z1: wz + CELL + depth, side: s };
  if (s === 2) return { x0: wx, x1: wx + CELL, z0: wz - depth, z1: wz, side: s };
  if (s === 1) return { x0: wx + CELL, x1: wx + CELL + depth, z0: wz, z1: wz + CELL, side: s };
  return { x0: wx - depth, x1: wx, z0: wz, z1: wz + CELL, side: s };
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

export const STEP_W = 1.2;
/** Risers and going of the steps from a deck at height `deckY` down to the ground. */
export const stepRun = (deckY: number) => {
  const risers = Math.max(2, Math.round(deckY / 0.18));
  return { risers, run: risers * 0.28 };
};

/** Plan of the staircase: the rectangle it stands on. */
export function stairRect(t: Pick<Stair, 'x' | 'z' | 'u' | 'v'>): Rect {
  const [ux, uz] = FRONT[t.u];
  const [vx, vz] = FRONT[t.v];
  const x = [t.x, t.x + ux * STAIR.len + vx * STAIR.w].sort((p, q) => p - q);
  const z = [t.z, t.z + uz * STAIR.len + vz * STAIR.w].sort((p, q) => p - q);
  return { x0: x[0], x1: x[1], z0: z[0], z1: z[1] };
}

/** Collinear segments that meet end to end, as one. */
function joinSegs(list: Seg[]): Seg[] {
  const e = 1e-6;
  const alongX = (g: Seg) => Math.abs(g.z0 - g.z1) < e;
  const norm = list.map((g) => (alongX(g) ? (g.x0 <= g.x1 ? g : { ...g, x0: g.x1, x1: g.x0 }) : g.z0 <= g.z1 ? g : { ...g, z0: g.z1, z1: g.z0 }));
  norm.sort((a, b) => a.y - b.y || Number(alongX(a)) - Number(alongX(b)) || (alongX(a) ? a.z0 - b.z0 || a.x0 - b.x0 : a.x0 - b.x0 || a.z0 - b.z0));
  const out: Seg[] = [];
  for (const g of norm) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.y - g.y) < e && alongX(last) === alongX(g) && Math.abs(last.x1 - g.x0) < e && Math.abs(last.z1 - g.z0) < e) {
      last.x1 = g.x1;
      last.z1 = g.z1;
    } else out.push({ ...g });
  }
  return out;
}

/**
 * Upper floors. Every upper shell's door needs a floor outside it and a way
 * up. Each floor is walked on a 1.5 m grid: the open roof of the floor
 * below is already a floor, and a gallery can hang anywhere just outside
 * it. The galleries built are the shortest that join every door of the
 * floor to the staircase. The staircase is tried at every place a landing
 * can meet a floor, turned every way; the one that needs the least gallery
 * wins, tucked against the building's flank before standing free, clear of
 * doors, decks and steps, inside the plot.
 *
 * Returns two tests for the roof rails: "a gallery lies here" and "a
 * landing meets this edge" (floor, half-grid square, direction).
 */
function layoutAccess(units: readonly Unit[], doors: ReadonlyMap<number, DoorFace>, occ: Set<string>, base: number, plot: Plot | undefined, out: AddOnLayout) {
  const none = { gallery: (_l: number, _i: number, _j: number) => false, opening: (_l: number, _i: number, _j: number, _di: number, _dj: number) => false };
  const upper = units.filter((u) => u.y > 0 && (doors.get(u.id) ?? 'none') !== 'none');
  if (!upper.length) return none;
  const H = GALLERY_D;
  // The building's squares, and room round them for a gallery and the staircase.
  const M = 5;
  let i0 = Infinity;
  let i1 = -Infinity;
  let j0 = Infinity;
  let j1 = -Infinity;
  for (const u of units) {
    const [sx, sz] = span(u.t, u.r);
    i0 = Math.min(i0, u.x * 2 - M);
    i1 = Math.max(i1, (u.x + sx) * 2 - 1 + M);
    j0 = Math.min(j0, u.z * 2 - M);
    j1 = Math.max(j1, (u.z + sz) * 2 - 1 + M);
  }
  const W = i1 - i0 + 1;
  const N = W * (j1 - j0 + 1);
  const at = (i: number, j: number) => (i < i0 || i > i1 || j < j0 || j > j1 ? -1 : i - i0 + (j - j0) * W);
  const ij = (n: number): [number, number] => [(n % W) + i0, Math.floor(n / W) + j0];
  const solid = (i: number, j: number, y: number) => occ.has(key(Math.floor(i / 2), Math.floor(j / 2), y));
  const top = Math.max(...upper.map((u) => u.y));
  const topOf = (level: number) => base + level * STOREY + 0.12;

  /** What a square is at each floor: 2 the open roof of the floor below, 1 a place a gallery can hang, 0 neither. */
  const kinds: Uint8Array[] = [];
  /** A shell stands on the square at some floor; on the ground. */
  const built = new Uint8Array(N);
  const footing = new Uint8Array(N);
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const n = at(i, j);
      if (solid(i, j, 0)) footing[n] = 1;
      for (let y = 0; y <= top && !built[n]; y++) if (solid(i, j, y)) built[n] = 1;
    }
  for (let L = 1; L <= top; L++) {
    const k = new Uint8Array(N);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        if (solid(i, j, L)) continue;
        if (solid(i, j, L - 1)) k[at(i, j)] = 2;
        else {
          for (let d = 0; d < 9 && !k[at(i, j)]; d++) if (solid(i + (d % 3) - 1, j + Math.floor(d / 3) - 1, L - 1)) k[at(i, j)] = 1;
        }
      }
    kinds[L] = k;
  }
  /** Least new gallery from a set of squares to every other square (roof is free), and the way back. */
  const flood = (L: number, from: Iterable<number>) => {
    const kind = kinds[L];
    const dist = new Float32Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const queue: number[] = [];
    for (const n of from) {
      dist[n] = 0;
      queue.push(n);
    }
    while (queue.length) {
      const c = queue.shift()!;
      const [ci, cj] = ij(c);
      for (const [di, dj] of SIDES) {
        const n = at(ci + di, cj + dj);
        if (n < 0 || !kind[n]) continue;
        const w = kind[n] === 1 ? 1 : 0;
        if (dist[c] + w >= dist[n]) continue;
        dist[n] = dist[c] + w;
        prev[n] = c;
        if (w) queue.push(n);
        else queue.unshift(n);
      }
    }
    return { dist, prev };
  };

  /* The squares outside each door, by floor: the width of the door's own cell. */
  const doorSq: number[][] = [];
  const owner: number[] = [];
  for (const u of upper) {
    const d = doorSpot(u, doors.get(u.id) as WallFace, base);
    const [cx, cz] = d.cell;
    const sq: [number, number][] =
      d.side === 0
        ? [
            [2 * cx, 2 * cz + 2],
            [2 * cx + 1, 2 * cz + 2],
          ]
        : d.side === 2
          ? [
              [2 * cx, 2 * cz - 1],
              [2 * cx + 1, 2 * cz - 1],
            ]
          : d.side === 1
            ? [
                [2 * cx + 2, 2 * cz],
                [2 * cx + 2, 2 * cz + 1],
              ]
            : [
                [2 * cx - 1, 2 * cz],
                [2 * cx - 1, 2 * cz + 1],
              ];
    for (const [i, j] of sq) {
      const n = at(i, j);
      if (n >= 0 && kinds[u.y][n]) (doorSq[u.y] ??= []).push(n);
    }
    owner[u.y] ??= u.id;
  }

  /* Each floor's doors joined to one another, before the staircase is placed. */
  const trees: Set<number>[] = [];
  const loose: Set<number>[] = [];
  const fromTree: (ReturnType<typeof flood> | null)[] = [];
  for (let L = 1; L <= top; L++) {
    const tree = new Set<number>();
    const rest = new Set<number>();
    const todo = new Set(doorSq[L] ?? []);
    const first = todo.values().next();
    if (!first.done) tree.add(first.value);
    for (;;) {
      for (const n of tree) todo.delete(n);
      if (!todo.size) break;
      const { dist, prev } = flood(L, tree);
      let near = -1;
      for (const n of todo) if (dist[n] < Infinity && (near < 0 || dist[n] < dist[near])) near = n;
      if (near < 0) {
        // Cut off from the rest of its floor: it keeps a balcony of its own.
        for (const n of todo) rest.add(n);
        break;
      }
      for (let n = near; n >= 0 && !tree.has(n); n = prev[n]) tree.add(n);
    }
    trees[L] = tree;
    loose[L] = rest;
    fromTree[L] = tree.size ? flood(L, tree) : null;
  }

  /* The staircase: every square a floor can be met from, the landing on each side of it, the stair running either way from there. */
  const doorAt = units.flatMap((u) => {
    const f = doors.get(u.id);
    return f && f !== 'none' ? [doorSpot(u, f, base)] : [];
  });
  const fixed = out.pieces.filter((p) => p.k === 'deck' || p.k === 'steps');
  let best: { stair: Stair; a: number; cost: number } | null = null;
  for (let a = 0; a < N; a++) {
    let reach = 0;
    for (let L = 1; L <= top && reach < Infinity; L++) {
      const f = fromTree[L];
      if (f) reach += kinds[L][a] ? f.dist[a] : Infinity;
    }
    if (!(reach < Infinity)) continue;
    const [ai, aj] = ij(a);
    for (const v of [0, 1, 2, 3] as Turn[]) {
      const [vx, vz] = FRONT[v];
      const bi = ai + vx;
      const bj = aj + vz;
      for (const u of [((v + 1) % 4) as Turn, ((v + 3) % 4) as Turn]) {
        const [ux, uz] = FRONT[u];
        // The landing's corner: on the edge it shares with the floor, at the end the stair runs away from.
        const stair: Stair = {
          x: (vx ? (vx > 0 ? bi : bi + 1) : ux > 0 ? bi : bi + 1) * H,
          z: (vz ? (vz > 0 ? bj : bj + 1) : uz > 0 ? bj : bj + 1) * H,
          u,
          v,
          levels: Array.from({ length: top }, (_, n) => topOf(n + 1)),
          open: Array.from({ length: top }, (_, n) => !!fromTree[n + 1]),
        };
        const r = stairRect(stair);
        let cost = reach;
        // Its own ground at every floor it passes, and never through a gallery.
        for (let i = Math.floor((r.x0 + 0.01) / H); i <= Math.floor((r.x1 - 0.01) / H) && cost < Infinity; i++)
          for (let j = Math.floor((r.z0 + 0.01) / H); j <= Math.floor((r.z1 - 0.01) / H) && cost < Infinity; j++) {
            const n = at(i, j);
            if (n < 0) continue;
            if (built[n]) cost = Infinity;
            else for (let L = 1; L <= top; L++) if (trees[L].has(n) || loose[L].has(n)) cost += 100;
          }
        if (!(cost < Infinity)) continue;
        // Tucked against the building: the two squares beside its flights are the building's own ground floor.
        for (const n of [1, 2]) {
          const q = at(ai + ux * n, aj + uz * n);
          if (q < 0 || !footing[q]) cost += 1.5;
        }
        // Inside the plot's walls; the street side is open, and a staircase may stand out onto it.
        if (plot && !(r.x0 >= -0.01 && r.x1 <= plot.x * CELL + 0.01 && r.z0 >= -0.01 && r.z1 <= plot.z * CELL + 4.5)) cost += 1000;
        for (const p of fixed) if (p.box[0] < r.x1 - 0.01 && p.box[3] > r.x0 + 0.01 && p.box[2] < r.z1 - 0.01 && p.box[5] > r.z0 + 0.01) cost += 50;
        for (const d of doorAt) if (d.x > r.x0 - 0.2 && d.x < r.x1 + 0.2 && d.z > r.z0 - 0.2 && d.z < r.z1 + 0.2) cost += 30;
        if (!best || cost < best.cost - 1e-6) best = { stair, a, cost };
      }
    }
  }

  /* Galleries, their rails, and the openings where a landing meets them. */
  const walk: Set<number>[] = [];
  const [ox, oz] = best ? FRONT[best.stair.v] : [0, 0];
  for (let L = 1; L <= top; L++) {
    const G = new Set<number>([...trees[L], ...loose[L]]);
    const f = fromTree[L];
    if (best && f) for (let n = best.a; n >= 0 && !G.has(n); n = f.prev[n]) G.add(n);
    const k = kinds[L];
    const y = topOf(L);
    const mine = new Set([...G].filter((n) => k[n] === 1));
    walk[L] = mine;
    const rails: Seg[] = [];
    const rows = new Map<number, number[]>();
    for (const n of mine) {
      const [i, j] = ij(n);
      const list = rows.get(j);
      if (list) list.push(i);
      else rows.set(j, [i]);
      for (const [di, dj] of SIDES) {
        if (mine.has(at(i + di, j + dj))) continue; // the gallery goes on
        if (solid(i + di, j + dj, L) || solid(i + di, j + dj, L - 1)) continue; // a wall, or the roof it opens onto
        if (best && n === best.a && di === ox && dj === oz) continue; // the landing
        const x = (i + (di > 0 ? 1 : 0)) * H;
        const z = (j + (dj > 0 ? 1 : 0)) * H;
        rails.push(di ? { x0: x, z0: j * H, x1: x, z1: (j + 1) * H, y } : { x0: i * H, z0: z, x1: (i + 1) * H, z1: z, y });
      }
    }
    out.rails.push(...joinSegs(rails));
    for (const [j, list] of rows) {
      list.sort((p, q) => p - q);
      let from = list[0];
      list.forEach((i, n) => {
        if (list[n + 1] === i + 1) return;
        const g: Gallery = { x0: from * H, x1: (i + 1) * H, z0: j * H, z1: (j + 1) * H, y };
        out.galleries.push(g);
        out.pieces.push({ k: 'access', u: owner[L] ?? upper[0].id, box: [g.x0, y - 0.3, g.z0, g.x1, y + 1.1, g.z1] });
        from = list[n + 1];
      });
    }
  }
  if (!best) return { ...none, gallery: (level: number, i: number, j: number) => !!walk[level]?.has(at(i, j)) };
  out.stairs.push(best.stair);
  const r = stairRect(best.stair);
  out.pieces.push({ k: 'access', u: upper[0].id, s: best.stair.v, box: [r.x0, 0, r.z0, r.x1, topOf(top) + 1.1, r.z1] });
  const [mi, mj] = ij(best.a);
  return {
    gallery: (level: number, i: number, j: number) => !!walk[level]?.has(at(i, j)),
    opening: (level: number, i: number, j: number, di: number, dj: number) => !!fromTree[level] && i === mi && j === mj && di === ox && dj === oz,
  };
}

export function layoutAddOns(
  units: readonly Unit[],
  on: ReadonlySet<AddOnId>,
  deckSide: DeckSide,
  manual: readonly ManualAddOn[] | null = null,
  base = PLINTH,
  plot?: Plot,
): AddOnLayout {
  const doors = doorFaces(units);
  const side: Turn = deckSide === 'auto' ? dominantSide(units, doors) : deckSide;
  const deckY = base + 0.12;
  const out: AddOnLayout = { side, deckY, decks: [], posts: [], spandrels: [], rails: [], steps: [], shades: [], roofs: [], solar: [], galleries: [], stairs: [], pieces: [] };
  const occ = occupancy(units);
  const ground = units.filter((u) => u.y === 0);
  const byId = new Map(units.map((u) => [u.id, u]));
  const pieceOf = (k: ManualKind, u: number, s: Turn | undefined, r: Rect, y0: number, y1: number) => out.pieces.push({ k, u, s, box: [r.x0, y0, r.z0, r.x1, y1, r.z1] });

  /* Decks */
  const rects: (Rect & { side: Turn; u: number })[] = [];
  if (manual) {
    for (const m of manual) {
      if (m.k !== 'deck' || m.s === undefined) continue;
      const u = byId.get(m.u);
      if (!u || u.y !== 0) continue;
      for (const [x, z] of exposedOn(u, m.s, occ)) rects.push({ ...edgeRect(x, z, m.s), u: u.id });
    }
  } else if (on.has('deck') && ground.length) {
    // A deck outside every ground-floor door, along that side of its shell: no door opens onto a drop.
    for (const u of ground) {
      const f = doors.get(u.id);
      if (!f || f === 'none') continue;
      const ds = faceSide(f, u.r);
      for (const [x, z] of exposedOn(u, ds, occ)) rects.push({ ...edgeRect(x, z, ds), u: u.id });
    }
    if (deckSide !== 'auto') {
      // And along the side the visitor has asked for: the outermost line there.
      const asked: (Rect & { side: Turn; u: number })[] = [];
      for (const u of ground) for (const [x, z] of exposedOn(u, side, occ)) asked.push({ ...edgeRect(x, z, side), u: u.id });
      const alongX = side === 0 || side === 2;
      const outward = side === 0 || side === 1;
      const best = new Map<number, number>();
      for (const r of asked) {
        const line = alongX ? r.x0 : r.z0;
        const depth = alongX ? r.z0 : r.x0;
        const cur = best.get(line);
        if (cur === undefined || (outward ? depth > cur : depth < cur)) best.set(line, depth);
      }
      for (const r of asked) {
        if (best.get(alongX ? r.x0 : r.z0) !== (alongX ? r.z0 : r.x0)) continue;
        if (!rects.some((o) => o.side === r.side && o.x0 === r.x0 && o.z0 === r.z0)) rects.push(r);
      }
    }
  }
  out.decks = mergeDecks(rects);
  for (const r of rects) pieceOf('deck', r.u, r.side, r, 0, deckY + 1.1);

  /* Steps: opposite the shell's door when it opens onto this deck, else in the middle of the shell's stretch. */
  const stepsWanted: { u: Unit; s: Turn }[] = [];
  if (manual) {
    for (const m of manual) {
      const u = byId.get(m.u);
      if (m.k === 'steps' && m.s !== undefined && u) stepsWanted.push({ u, s: m.s });
    }
  } else if (on.has('steps') && rects.length) {
    // One flight for each stretch of deck (pieces that meet along an edge), at a door that opens onto it:
    // the street side before the others, Shell A before Shell B. A stretch with no door gets it in its middle.
    const group = rects.map((_, i) => i);
    const find = (i: number): number => (group[i] === i ? i : (group[i] = find(group[i])));
    rects.forEach((a, i) =>
      rects.forEach((b, j) => {
        if (j <= i) return;
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
        if (ox > -0.01 && oz > -0.01 && (ox > 0.01 || oz > 0.01)) group[find(i)] = find(j);
      }),
    );
    const stretches = new Map<number, (Rect & { side: Turn; u: number })[]>();
    rects.forEach((r, i) => {
      const k = find(i);
      const list = stretches.get(k);
      if (list) list.push(r);
      else stretches.set(k, [r]);
    });
    for (const list of stretches.values()) {
      const atDoor = list
        .filter((r) => {
          const f = doors.get(r.u);
          const u = byId.get(r.u);
          return !!u && !!f && f !== 'none' && faceSide(f, u.r) === r.side;
        })
        .sort((a, b) => {
          const ua = byId.get(a.u)!;
          const ub = byId.get(b.u)!;
          return (a.side === 0 ? 0 : 1) - (b.side === 0 ? 0 : 1) || (ua.t === ub.t ? ua.x - ub.x || ua.z - ub.z : ua.t === 'A' ? -1 : 1);
        });
      const pick = atDoor[0] ?? list[Math.floor(list.length / 2)];
      const u = byId.get(pick.u);
      if (u) stepsWanted.push({ u, s: pick.side });
    }
  }
  const { run } = stepRun(deckY);
  for (const w of stepsWanted) {
    const mine = rects.filter((r) => r.u === w.u.id && r.side === w.s);
    if (!mine.length) continue;
    const f = doors.get(w.u.id);
    const alongX = w.s === 0 || w.s === 2;
    const segs = mine.map((r) => outerOf(r, deckY));
    let mx = segs.reduce((a, sg) => a + (sg.x0 + sg.x1) / 2, 0) / segs.length;
    let mz = segs.reduce((a, sg) => a + (sg.z0 + sg.z1) / 2, 0) / segs.length;
    if (f && f !== 'none' && faceSide(f, w.u.r) === w.s) {
      const d = doorSpot(w.u, f, base);
      // Along the wall the door's own position; out from the wall the deck's edge.
      const lo = Math.min(...mine.map((r) => (alongX ? r.x0 : r.z0))) + STEP_W / 2 + 0.1;
      const hi = Math.max(...mine.map((r) => (alongX ? r.x1 : r.z1))) - STEP_W / 2 - 0.1;
      if (alongX) mx = Math.min(hi, Math.max(lo, d.x));
      else mz = Math.min(hi, Math.max(lo, d.z));
    }
    out.steps.push({ x: mx, y: 0, z: mz, ry: (w.s * Math.PI) / 2, w: STEP_W, side: w.s, u: w.u.id });
    const [fx, fz] = FRONT[w.s];
    const half = STEP_W / 2 + 0.05;
    pieceOf(
      'steps',
      w.u.id,
      w.s,
      {
        x0: Math.min(mx, mx + fx * run) - (alongX ? half : 0),
        x1: Math.max(mx, mx + fx * run) + (alongX ? half : 0),
        z0: Math.min(mz, mz + fz * run) - (alongX ? 0 : half),
        z1: Math.max(mz, mz + fz * run) + (alongX ? 0 : half),
      },
      0,
      deckY + 0.1,
    );
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

  /* Upper floors: galleries and the outer staircase. */
  const access = layoutAccess(units, doors, occ, base, plot, out);

  /* Roof terraces: open roof beside a floor above gets a handrail, but for where a gallery or the staircase leads off it. */
  if (on.has('handrail')) {
    const topLevels = new Set(units.map((u) => u.y));
    const H = GALLERY_D;
    const solid = (i: number, j: number, y: number) => occ.has(key(Math.floor(i / 2), Math.floor(j / 2), y));
    const edge: Seg[] = [];
    for (const u of units) {
      const lvl = u.y + 1;
      if (!topLevels.has(lvl)) continue;
      const y = base + lvl * STOREY;
      for (const [x, z] of cells(u)) {
        if (occ.has(key(x, z, lvl))) continue;
        for (let q = 0; q < 4; q++) {
          const i = 2 * x + (q & 1);
          const j = 2 * z + (q >> 1);
          for (const [di, dj] of SIDES) {
            // A wall, more terrace, the gallery or the staircase's landing: no rail.
            if (solid(i + di, j + dj, lvl) || solid(i + di, j + dj, lvl - 1) || access.gallery(lvl, i + di, j + dj) || access.opening(lvl, i, j, di, dj)) continue;
            const ex = (i + (di > 0 ? 1 : 0)) * H;
            const ez = (j + (dj > 0 ? 1 : 0)) * H;
            edge.push(di ? { x0: ex, z0: j * H, x1: ex, z1: (j + 1) * H, y } : { x0: i * H, z0: ez, x1: (i + 1) * H, z1: ez, y });
          }
        }
      }
    }
    for (const g of joinSegs(edge)) out.rails.push(inset(g, 0.12));
  }

  /* Shades, roofs and solar. */
  const levels = new Set(units.map((u) => u.y));
  const topShell = (u: Unit) => !cells(u).some(([x, z]) => occ.has(key(x, z, u.y + 1))) && !levels.has(u.y + 1);
  const footprint = (u: Unit): Rect => {
    const [sx, sz] = span(u.t, u.r);
    return { x0: u.x * CELL, x1: (u.x + sx) * CELL, z0: u.z * CELL, z1: (u.z + sz) * CELL };
  };
  const shadeOn = (u: Unit, s: Turn) => {
    const [cx, by, cz] = placeOf(u, base);
    const [sx, sz] = span(u.t, u.r);
    const along = s === 0 || s === 2 ? sx * CELL : sz * CELL;
    const [fx, fz] = FRONT[s];
    const half = s === 0 || s === 2 ? (sz * CELL) / 2 : (sx * CELL) / 2;
    const x = cx + fx * (half + 0.28);
    const z = cz + fz * (half + 0.28);
    out.shades.push({ x, y: by + 2.52, z, ry: (s * Math.PI) / 2, w: along - 0.7 });
    const hw = (along - 0.7) / 2;
    const alongX = s === 0 || s === 2;
    pieceOf('shade', u.id, s, { x0: x - (alongX ? hw : 0.45), x1: x + (alongX ? hw : 0.45), z0: z - (alongX ? 0.45 : hw), z1: z + (alongX ? 0.45 : hw) }, by + 2.2, by + 2.75);
  };
  const roofOn = (u: Unit) => {
    const [cx, by, cz, ry] = placeOf(u, base);
    out.roofs.push({ x: cx, y: by + STOREY, z: cz, ry, w: u.t === 'A' ? 6 : 3, t: u.t });
    pieceOf('roof', u.id, undefined, footprint(u), by + STOREY, by + STOREY + 0.95);
  };
  const solarOn = (u: Unit, sloped: boolean) => {
    const [cx, by, cz, ry] = placeOf(u, base);
    out.solar.push({ x: cx, y: by + STOREY, z: cz, ry, w: u.t === 'A' ? 6 : 3, t: u.t, sloped });
    pieceOf('solar', u.id, undefined, footprint(u), by + STOREY, by + STOREY + 1.2);
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

/**
 * The automatic layout as a list of hand placements, so that taking one
 * piece away (or adding one) starts from what is standing there.
 */
export function materialise(units: readonly Unit[], on: ReadonlySet<AddOnId>, deckSide: DeckSide, base = PLINTH): ManualAddOn[] {
  const seen = new Set<string>();
  const out: ManualAddOn[] = [];
  for (const p of layoutAddOns(units, on, deckSide, null, base).pieces) {
    if (p.k === 'access') continue;
    const k = `${p.k}:${p.u}:${p.s ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p.s === undefined ? { k: p.k, u: p.u } : { k: p.k, u: p.u, s: p.s });
  }
  return out;
}

/** The piece under a point (metres from the plot corner), the smallest that holds it. */
export function pieceAt(layout: AddOnLayout, x: number, y: number, z: number, kinds?: readonly Piece['k'][]): Piece | null {
  let best: Piece | null = null;
  let size = Infinity;
  const pad = 0.12;
  for (const p of layout.pieces) {
    if (kinds && !kinds.includes(p.k)) continue;
    const [x0, y0, z0, x1, y1, z1] = p.box;
    if (x < x0 - pad || x > x1 + pad || y < y0 - pad || y > y1 + pad || z < z0 - pad || z > z1 + pad) continue;
    const v = (x1 - x0) * (y1 - y0) * (z1 - z0);
    if (v < size) {
      size = v;
      best = p;
    }
  }
  return best;
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
