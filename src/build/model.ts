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
 * its neighbours.
 */
export function doorFaces(units: readonly Unit[]): Map<number, DoorFace> {
  const occ = occupancy(units);
  const at = new Map<string, Unit>();
  for (const u of units) for (const [x, z] of cells(u)) at.set(key(x, z, u.y), u);
  const out = new Map<number, DoorFace>();
  for (const u of units) {
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

/** A walkway outside an upper floor's door. `y` is its top. */
export interface Gallery extends Rect {
  side: Turn;
  y: number;
}

/**
 * The outer staircase at the end of a wall's galleries: a dog-leg flight
 * per floor in one footprint, a landing at each floor.
 */
export interface Tower {
  /** Where it meets the end of the galleries, on the wall line. */
  x: number;
  z: number;
  /** The side the galleries are on, and which end of them it stands at (+1 / −1 along x for sides 0 and 2, along z for 1 and 3). */
  side: Turn;
  dir: 1 | -1;
  /** `along`: its length continues the wall. `out`: it stands beside the corner and runs out from the wall, where the plot has no room along it. */
  turn: 'along' | 'out';
  /** Height of each floor's landing, lowest first. */
  levels: number[];
  /** Whether a gallery meets the landing at that floor. */
  open: boolean[];
}
/** Gallery depth, and the staircase's plan: two lanes side by side, a landing at each end of the run. */
export const GALLERY_D = 1.5;
export const TOWER = { w: 2, lane: 0.95, land: 1, run: 2.16, len: 4.16, tread: 0.27 } as const;

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
  /** Upper floors: a gallery at each door and an outer staircase up to it. Always there, never chosen. */
  galleries: Gallery[];
  /** Posts under the galleries: x, z, from height, to height. */
  columns: [number, number, number, number][];
  towers: Tower[];
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

/** Plan of a staircase tower: the rectangle it stands on. */
export function towerRect(t: Pick<Tower, 'x' | 'z' | 'side' | 'dir' | 'turn'>): Rect {
  const alongX = t.side === 0 || t.side === 2;
  const out = t.side === 0 || t.side === 1 ? 1 : -1;
  const a0 = alongX ? t.x : t.z;
  const o0 = alongX ? t.z : t.x;
  const a = [a0, a0 + t.dir * (t.turn === 'along' ? TOWER.len : TOWER.w)].sort((p, q) => p - q);
  const o = [o0, o0 + out * (t.turn === 'along' ? TOWER.w : TOWER.len)].sort((p, q) => p - q);
  return alongX ? { x0: a[0], x1: a[1], z0: o[0], z1: o[1] } : { x0: o[0], x1: o[1], z0: a[0], z1: a[1] };
}

/**
 * Upper floors. Every upper shell's door needs a floor outside it and a way
 * up: a gallery along the wall at each floor (or along the edge of the roof
 * the door opens onto), and one outer staircase at the end of each wall's
 * galleries, on whichever end is free, inside the plot if it can be.
 */
function layoutAccess(units: readonly Unit[], doors: ReadonlyMap<number, DoorFace>, occ: Set<string>, base: number, decks: readonly (Rect & { side: Turn })[], plot: Plot | undefined, out: AddOnLayout) {
  interface Edge {
    side: Turn;
    level: number;
    line: number;
    a0: number;
    u: number;
  }
  const edges: Edge[] = [];
  for (const u of units) {
    if (u.y === 0) continue;
    const f = doors.get(u.id);
    if (!f || f === 'none') continue;
    const d = doorSpot(u, f, base);
    const [dx, dz] = FRONT[d.side];
    let [cx, cz] = d.cell;
    // Across the roof the door opens onto, to its edge.
    for (let i = 0; i < 24 && occ.has(key(cx + dx, cz + dz, u.y - 1)) && !occ.has(key(cx + dx, cz + dz, u.y)); i++) {
      cx += dx;
      cz += dz;
    }
    if (occ.has(key(cx + dx, cz + dz, u.y))) continue; // the roof ends at a wall
    const alongX = d.side === 0 || d.side === 2;
    const line = (alongX ? (d.side === 0 ? cz + 1 : cz) : d.side === 1 ? cx + 1 : cx) * CELL;
    edges.push({ side: d.side, level: u.y, line, a0: (alongX ? cx : cz) * CELL, u: u.id });
  }
  const walls = new Map<string, Edge[]>();
  for (const e of edges) {
    const k = `${e.side}:${e.line}`;
    const list = walls.get(k);
    if (list) list.push(e);
    else walls.set(k, [e]);
  }
  const topOf = (level: number) => base + level * STOREY + 0.12;

  for (const list of walls.values()) {
    const { side, line } = list[0];
    const alongX = side === 0 || side === 2;
    const sign = side === 0 || side === 1 ? 1 : -1;
    /** The row of cells just outside the wall. */
    const outside = line / CELL + (sign > 0 ? 0 : -1);
    const cellAt = (a: number): [number, number] => (alongX ? [Math.floor(a / CELL + 1e-6), outside] : [outside, Math.floor(a / CELL + 1e-6)]);
    const top = Math.max(...list.map((e) => e.level));
    const levels = [...new Set(list.map((e) => e.level))].sort((p, q) => p - q);
    const spanOf = (level: number) => {
      const mine = list.filter((e) => e.level === level);
      return [Math.min(...mine.map((e) => e.a0)), Math.max(...mine.map((e) => e.a0 + CELL))] as const;
    };
    // Everything on this wall line, a ground deck included: the staircase stands clear of all of it.
    let lo = Math.min(...list.map((e) => e.a0));
    let hi = Math.max(...list.map((e) => e.a0 + CELL));
    for (const r of decks) {
      if (r.side !== side) continue;
      const onLine = alongX ? (side === 0 ? r.z0 : r.z1) : side === 1 ? r.x0 : r.x1;
      if (Math.abs(onLine - line) > 0.01) continue;
      lo = Math.min(lo, alongX ? r.x0 : r.z0);
      hi = Math.max(hi, alongX ? r.x1 : r.z1);
    }

    let best: { at: number; dir: 1 | -1; turn: Tower['turn']; cost: number } | null = null;
    for (const dir of [1, -1] as const) {
      const at = dir > 0 ? hi : lo;
      // Each floor's gallery has to reach the staircase without running into a shell.
      let reach = 0;
      let clear = true;
      for (const level of levels) {
        const [s0, s1] = spanOf(level);
        const from = dir > 0 ? s0 : at;
        const to = dir > 0 ? at : s1;
        reach += to - from;
        for (let a = from + CELL / 2; a < to && clear; a += CELL) {
          const [gx, gz] = cellAt(a);
          if (occ.has(key(gx, gz, level))) clear = false;
        }
      }
      if (!clear) continue;
      for (const turn of ['along', 'out'] as const) {
        const r = towerRect({ x: alongX ? at : line, z: alongX ? line : at, side, dir, turn });
        // Its own ground, at every floor it passes.
        let free = true;
        for (let x = r.x0 + 0.05; x <= r.x1 && free; x += 0.5)
          for (let z = r.z0 + 0.05; z <= r.z1 && free; z += 0.5) {
            const [gx, gz] = worldToCell(Math.min(x, r.x1 - 0.05), Math.min(z, r.z1 - 0.05));
            for (let y = 0; y <= top; y++) if (occ.has(key(gx, gz, y))) free = false;
          }
        if (!free) continue;
        // Inside the plot's walls; the street side is open, and a staircase may stand out onto it.
        const inside = !plot || (r.x0 >= -0.01 && r.x1 <= plot.x * CELL + 0.01 && r.z0 >= -0.01 && r.z1 <= plot.z * CELL + 4.5);
        const cost = reach + (inside ? 0 : 1000) + (turn === 'out' ? 0.5 : 0);
        if (!best || cost < best.cost) best = { at, dir, turn, cost };
      }
    }

    for (const level of levels) {
      const [s0, s1] = spanOf(level);
      const a0 = best && best.dir < 0 ? best.at : s0;
      const a1 = best && best.dir > 0 ? best.at : s1;
      const y = topOf(level);
      const g: Gallery = alongX
        ? { x0: a0, x1: a1, z0: sign > 0 ? line : line - GALLERY_D, z1: sign > 0 ? line + GALLERY_D : line, side, y }
        : { x0: sign > 0 ? line : line - GALLERY_D, x1: sign > 0 ? line + GALLERY_D : line, z0: a0, z1: a1, side, y };
      out.galleries.push(g);
      const edge = outerOf(g, y);
      out.rails.push(edge);
      // Open towards the staircase, railed at the other end (and at both when there is no staircase).
      endsOf(g, y).forEach((end, i) => {
        const atTower = best && (best.dir > 0 ? i === 1 : i === 0);
        if (!atTower) out.rails.push(end);
        else if (best?.turn === 'out') {
          // The staircase's landing is shallower than the gallery: the rest of this end keeps its rail.
          const o0 = line + sign * TOWER.land;
          const o1 = line + sign * GALLERY_D;
          const a = best.at;
          out.rails.push(alongX ? { x0: a, z0: o0, x1: a, z1: o1, y } : { x0: o0, z0: a, x1: o1, z1: a, y });
        }
      });
      const n = Math.max(1, Math.round((a1 - a0) / CELL));
      for (let k = 0; k <= n; k++) {
        const a = a0 + ((a1 - a0) * k) / n;
        const o = line + sign * (GALLERY_D - 0.06);
        // From the ground, or from a lower roof where one reaches out under the gallery.
        let from = 0;
        for (const near of [a - 0.2, a + 0.2]) {
          const [gx, gz] = cellAt(near);
          for (let below = level - 1; below >= 0; below--)
            if (occ.has(key(gx, gz, below))) {
              from = Math.max(from, base + (below + 1) * STOREY);
              break;
            }
        }
        if (y - 0.08 - from > 0.3) out.columns.push(alongX ? [a, o, from, y - 0.08] : [o, a, from, y - 0.08]);
      }
      out.pieces.push({ k: 'access', u: list.find((e) => e.level === level)!.u, s: side, box: [g.x0, y - 0.3, g.z0, g.x1, y + 1.1, g.z1] });
    }
    if (best) {
      const t: Tower = {
        x: alongX ? best.at : line,
        z: alongX ? line : best.at,
        side,
        dir: best.dir,
        turn: best.turn,
        levels: Array.from({ length: top }, (_, i) => topOf(i + 1)),
        open: Array.from({ length: top }, (_, i) => levels.includes(i + 1)),
      };
      out.towers.push(t);
      const r = towerRect(t);
      out.pieces.push({ k: 'access', u: list[0].u, s: side, box: [r.x0, 0, r.z0, r.x1, topOf(top) + 1.1, r.z1] });
    }
  }
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
  const out: AddOnLayout = { side, deckY, decks: [], posts: [], spandrels: [], rails: [], steps: [], shades: [], roofs: [], solar: [], galleries: [], columns: [], towers: [], pieces: [] };
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
    for (const u of ground) for (const [x, z] of exposedOn(u, side, occ)) rects.push({ ...edgeRect(x, z, side), u: u.id });
    // Keep only the outermost line on the deck side: one deck along the front.
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
  for (const r of rects) pieceOf('deck', r.u, r.side, r, 0, deckY + 1.1);
  const decked = (u: Unit, s: Turn) => rects.some((r) => r.u === u.id && r.side === s);

  /* Steps: opposite the shell's door when it opens onto this deck, else in the middle of the shell's stretch. */
  const stepsWanted: { u: Unit; s: Turn }[] = [];
  if (manual) {
    for (const m of manual) {
      const u = byId.get(m.u);
      if (m.k === 'steps' && m.s !== undefined && u) stepsWanted.push({ u, s: m.s });
    }
  } else if (on.has('steps') && rects.length) {
    const byDoor = ground
      .filter((u) => decked(u, side) && doors.get(u.id) !== 'none' && faceSide(doors.get(u.id) as WallFace, u.r) === side)
      .sort((a, b) => (a.t === b.t ? a.x - b.x || a.z - b.z : a.t === 'A' ? -1 : 1));
    const u = byDoor[0] ?? byId.get(rects[Math.floor(rects.length / 2)].u);
    if (u) stepsWanted.push({ u, s: side });
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
  layoutAccess(units, doors, occ, base, out.decks, plot, out);

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
          // A gallery along this edge already carries the rail, and the way through.
          const mid: [number, number] = [(seg.x0 + seg.x1) / 2 + dx * 0.3, (seg.z0 + seg.z1) / 2 + dz * 0.3];
          if (out.galleries.some((g) => Math.abs(g.y - (y + 0.12)) < 0.01 && mid[0] > g.x0 && mid[0] < g.x1 && mid[1] > g.z0 && mid[1] < g.z1)) continue;
          out.rails.push(inset(seg, 0.12));
        }
      }
    }
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
