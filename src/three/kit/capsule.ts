/**
 * The capsule home (client references of 2026-10-09: three renders of a
 * white capsule with black-framed glazing wrapped round its ends, a door
 * bay in the middle of the long side, fold-down steps and jack legs).
 * The form is taken from those; nothing else is (no maker's marks, and the
 * colours are this site's own). Lengths are the brief's 10′, 16′ and 20′;
 * width, height and every opening are ours (notes C5).
 *
 * The hull is a box rounded with two radii: a large one round its corners
 * on plan and a smaller one where walls meet roof and floor. It is drawn as
 * a skin over two parameters, u along the perimeter and t up the section,
 * so that glazing, frames, seams and light lines are patches of the same
 * surface pushed a few millimetres off it, and follow it round the corners.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { box, cyl, memo, mergeGroups, withRoom } from './geometry';

const FT = 0.3048;

/** Section of the capsule in metres: width, hull height, leg height, and the three radii. */
export const POD = { D: 3, H: 2.75, legs: 0.4, R: 0.8, rt: 0.34, rb: 0.2 } as const;

/** How far the steps reach in front of the long side. */
export const POD_STEPS = 0.66;

type RimPoint = [cx: number, cz: number, nx: number, nz: number];

interface Rim {
  hx: number;
  hz: number;
  /** Length of the perimeter. */
  P: number;
  /** The core rectangle's point and the outward normal at u (any real u: it wraps). */
  at: (u: number) => RimPoint;
  /** u of a point x along the front, and along the back. */
  front: (x: number) => number;
  back: (x: number) => number;
  /** Where the long right-hand end wall stops and the back corner starts; and the same on the left, going the other way. */
  rightEnd: number;
  leftEnd: number;
  /** The two ends of each front corner, where a flat pane meets a curved one. */
  cornerRight: [number, number];
  cornerLeft: [number, number];
  /** Every u in [u0, u1] where the surface needs a column: ends of straights, steps round corners. */
  columns: (u0: number, u1: number) => number[];
}

const CORNER_STEPS = 9;

/**
 * The perimeter, clockwise seen from above: along the front (+z) towards
 * +x, round the right end, back along the back, round the left end.
 */
function rimOf(L: number): Rim {
  const { D, R } = POD;
  const hx = L / 2 - R;
  const hz = D / 2 - R;
  const q = (Math.PI * R) / 2;
  const seg = [2 * hx, q, 2 * hz, q, 2 * hx, q, 2 * hz, q];
  const start: number[] = [];
  let acc = 0;
  for (const s of seg) {
    start.push(acc);
    acc += s;
  }
  const P = acc;
  const at = (u0: number): RimPoint => {
    const u = ((u0 % P) + P) % P;
    let i = 0;
    while (i < 7 && u >= start[i] + seg[i]) i++;
    const d = u - start[i];
    const a = d / R;
    switch (i) {
      case 0:
        return [-hx + d, hz, 0, 1];
      case 1:
        return [hx, hz, Math.sin(a), Math.cos(a)];
      case 2:
        return [hx, hz - d, 1, 0];
      case 3:
        return [hx, -hz, Math.cos(a), -Math.sin(a)];
      case 4:
        return [hx - d, -hz, 0, -1];
      case 5:
        return [-hx, -hz, -Math.sin(a), -Math.cos(a)];
      case 6:
        return [-hx, -hz + d, -1, 0];
      default:
        return [-hx, hz, -Math.cos(a), Math.sin(a)];
    }
  };
  const breaks: number[] = [];
  seg.forEach((s, i) => {
    const n = i % 2 ? CORNER_STEPS : 1;
    for (let k = 0; k < n; k++) breaks.push(start[i] + (s * k) / n);
  });
  const columns = (u0: number, u1: number) => {
    const out = [u0];
    for (let turn = Math.floor(u0 / P); turn <= Math.floor(u1 / P); turn++)
      for (const b of breaks) {
        const u = b + turn * P;
        if (u > u0 + 1e-4 && u < u1 - 1e-4) out.push(u);
      }
    out.push(u1);
    return out;
  };
  return { hx, hz, P, at, front: (x) => hx + x, back: (x) => start[4] + hx - x, rightEnd: start[3], leftEnd: start[6] - P, cornerRight: [start[1], start[2]], cornerLeft: [start[7] - P, 0], columns };
}

/**
 * The section, bottom to top. t −1…0 the underside, 0…1 the fillet at the
 * foot, 1…2 the wall, 2…3 the fillet at the roof, 3…4 the roof. Returns the
 * offset from the plan outline, the height, and the normal's horizontal and
 * vertical parts.
 */
function section(t: number): [off: number, y: number, nh: number, ny: number] {
  const { H, R, rt, rb } = POD;
  if (t <= 0) return [-rb + t * (R - rb), 0, 0, -1];
  if (t <= 1) {
    const b = ((t - 1) * Math.PI) / 2;
    return [-rb + rb * Math.cos(b), rb + rb * Math.sin(b), Math.cos(b), Math.sin(b)];
  }
  if (t <= 2) return [0, rb + (t - 1) * (H - rt - rb), 1, 0];
  if (t <= 3) {
    const a = ((t - 2) * Math.PI) / 2;
    return [-rt + rt * Math.cos(a), H - rt + rt * Math.sin(a), Math.cos(a), Math.sin(a)];
  }
  return [-rt - (t - 3) * (R - rt), H, 0, 1];
}

/** t of a height on the wall. */
const onWall = (y: number) => 1 + (y - POD.rb) / (POD.H - POD.rt - POD.rb);

/**
 * A piece of the hull's surface, `out` metres off it. `cols` are its
 * columns along the perimeter; `ts` gives each column's samples up the
 * section (the same count in every column).
 */
function skin(rim: Rim, cols: number[], ts: (u: number) => number[], out: number, uv?: (u: number, y: number) => [number, number]): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const m = ts(cols[0]).length;
  cols.forEach((u, c) => {
    const [cx, cz, nx, nz] = rim.at(u);
    for (const t of ts(u)) {
      const [off, y, nh, ny] = section(t);
      const r = POD.R + off + out * nh;
      pos.push(cx + nx * r, y + out * ny, cz + nz * r);
      nor.push(nx * nh, ny, nz * nh);
      const st = uv ? uv(u, y) : [0, 0];
      uvs.push(st[0], st[1]);
    }
    if (c === 0) return;
    for (let j = 0; j < m - 1; j++) {
      const a = (c - 1) * m + j;
      const b = c * m + j;
      index.push(a, b, b + 1, a, b + 1, a + 1);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/**
 * A panel on the wall with rounded corners, from u0 to u1 and y0 to y1: a
 * window, its frame, a door leaf, a light line. `lit`: its UVs run 0–1 up
 * the panel, for glazing that glows from the ceiling down; a number pins
 * them (1: as bright as the lamp gets).
 */
function panel(rim: Rim, u0: number, u1: number, y0: number, y1: number, rc: number, out: number, lit: true | number = 0): BufferGeometry {
  const r = Math.min(rc, (u1 - u0) / 2, (y1 - y0) / 2);
  const cols = rim.columns(u0, u1);
  for (let k = 1; k <= 5; k++) {
    const d = r * (1 - Math.cos((k * Math.PI) / 10));
    cols.push(u0 + d, u1 - d);
  }
  cols.sort((a, b) => a - b);
  const dip = (u: number) => {
    const e = Math.max(0, u0 + r - u, u - (u1 - r));
    return r - Math.sqrt(Math.max(0, r * r - e * e));
  };
  return skin(
    rim,
    cols,
    (u) => [onWall(y0 + dip(u)), onWall(y1 - dip(u))],
    out,
    lit === true ? (u, y) => [(u - u0) / (u1 - u0), (y - y0) / (y1 - y0)] : () => [0.5, lit],
  );
}

interface Layout {
  /** Centre of the door along the front, and the solid bay it stands in. */
  door: number;
  bay: [number, number];
  /** Glazing wrapped round the left end as well as the right. */
  left: boolean;
  /** Centres of the light lines beside the door. */
  bars: number[];
}

/** One layout per length of the brief; the door moves towards an end as the capsule gets shorter. */
function layoutOf(feet: number): Layout {
  if (feet <= 10) return { door: -0.17, bay: [-0.72, 0.36], left: false, bars: [] };
  if (feet <= 16) return { door: -0.5, bay: [-1.06, 0.52], left: true, bars: [0.22] };
  return { door: 0, bay: [-0.98, 0.98], left: true, bars: [-0.72, 0.72] };
}

const WINDOW = { y0: 0.42, y1: 2.24, rc: 0.3, frame: 0.085 };

/**
 * Capsule of a given length in feet. Origin: centre of its footprint, the
 * ground at y = 0 (it stands on legs). Front: +z.
 * Groups: 0 shell, 1 dark metal (frames, seams, chassis, legs), 2 glazing
 * and light lines, 3 timber (the steps).
 */
export function capsuleGeometry(feet: number): BufferGeometry {
  return memo(`capsule-v2-${feet}`, () => {
    const L = feet * FT;
    const { D, H, rb, legs } = POD;
    const rim = rimOf(L);
    const { hx, hz } = rim;
    const lay = layoutOf(feet);

    const shell: BufferGeometry[] = [];
    const dark: BufferGeometry[] = [];
    const glass: BufferGeometry[] = [];
    /** Lines of light in the glazing's group: a glow of their own, no room behind them. */
    const lights: BufferGeometry[] = [];
    const timber: BufferGeometry[] = [];

    /* Hull: one skin from the underside to the roof, and the two flat middles. */
    const up = [-1, 0, 0.34, 0.67, 1, 2, 2.2, 2.4, 2.6, 2.8, 3, 4];
    shell.push(skin(rim, rim.columns(0, rim.P), () => up, 0));
    shell.push(box(2 * hx, 0.002, 2 * hz, 0, H - 0.001, 0), box(2 * hx, 0.002, 2 * hz, 0, 0.001, 0));

    /* Seams: the hull reads as segments, a joint round it every metre or so, and a belt where wall meets roof. */
    const bays = Math.max(1, Math.round((2 * hx) / 1.15));
    const over = [1, 2, 2.25, 2.5, 2.75, 3, 4];
    for (let k = 0; k <= bays; k++) {
      const x = -hx + (2 * hx * k) / bays;
      for (const u of [rim.front(x), rim.back(x)]) dark.push(skin(rim, [u - 0.012, u + 0.012], () => over, 0.003));
      dark.push(box(0.024, 0.004, 2 * hz, x, H + 0.002, 0));
    }
    const round = rim.columns(0, rim.P);
    dark.push(skin(rim, round, () => [1.994, 2.02], 0.003));
    /* The skirt: a dark recess at the foot with a line of light in it. */
    dark.push(skin(rim, round, () => [onWall(rb), onWall(rb + 0.12)], 0.003));
    lights.push(skin(rim, round, () => [onWall(rb + 0.045), onWall(rb + 0.072)], 0.007, () => [0.5, 1]));

    /* Glazing wrapped round an end: from beside the door bay, round the front corner and across the end wall. */
    const window = (u0: number, u1: number, corner: [number, number]) => {
      const { y0, y1, rc, frame: f } = WINDOW;
      dark.push(panel(rim, u0, u1, y0, y1, rc, 0.012));
      glass.push(panel(rim, u0 + f, u1 - f, y0 + f, y1 - f, rc - f, 0.019, true));
      // A mullion where the flat pane meets the curved one, each side of the corner.
      for (const u of corner) if (u > u0 + 0.3 && u < u1 - 0.3) dark.push(panel(rim, u - 0.022, u + 0.022, y0 + f, y1 - f, 0, 0.024));
    };
    window(rim.front(lay.bay[1] + 0.1), rim.rightEnd - 0.06, rim.cornerRight);
    if (lay.left) window(rim.leftEnd + 0.06, rim.front(lay.bay[0] - 0.1), rim.cornerLeft);
    else {
      // The short capsule's other end is solid, with one square light in it.
      const mid = rim.leftEnd + hz;
      const half = Math.min(0.5, hz - 0.08);
      dark.push(panel(rim, mid - half, mid + half, 1.0, 1.0 + half * 2, 0.2, 0.012));
      glass.push(panel(rim, mid - half + 0.07, mid + half - 0.07, 1.07, 0.93 + half * 2, 0.14, 0.019, true));
    }
    /* A ribbon of high glazing along the back. */
    const ribbon = Math.min(2.2, 2 * hx - 0.5);
    if (ribbon > 0.6) {
      dark.push(panel(rim, rim.back(ribbon / 2), rim.back(-ribbon / 2), 1.72, 2.2, 0.16, 0.012));
      glass.push(panel(rim, rim.back(ribbon / 2) + 0.07, rim.back(-ribbon / 2) - 0.07, 1.79, 2.13, 0.1, 0.019, true));
    }

    /* The door: a dark surround, a leaf in the shell's colour with a tall slot of glass, a pull. */
    const ud = rim.front(lay.door);
    const sill = rb + 0.03;
    dark.push(panel(rim, ud - 0.47, ud + 0.47, sill - 0.04, 2.24, 0.09, 0.012));
    shell.push(panel(rim, ud - 0.4, ud + 0.4, sill + 0.03, 2.17, 0.05, 0.02));
    glass.push(panel(rim, ud + 0.1, ud + 0.25, 0.72, 1.92, 0.07, 0.026, true));
    dark.push(box(0.028, 0.52, 0.03, lay.door - 0.27, 1.2, D / 2 + 0.045));
    /* Light lines beside the door. */
    for (const x of lay.bars) for (const y of [1.16, 1.34, 1.52]) lights.push(panel(rim, rim.front(x) - 0.16, rim.front(x) + 0.16, y, y + 0.034, 0.017, 0.012, 1));

    /* Chassis and jack legs. */
    dark.push(box(L - 1.5, 0.14, D - 1.2, 0, -0.07, 0));
    const lx = Math.max(0.5, L / 2 - 0.95);
    for (const x of L > 5.5 ? [-lx, 0, lx] : [-lx, lx])
      for (const sz of [-1, 1]) {
        const z = sz * (D / 2 - 0.62);
        dark.push(cyl(0.045, 0.045, legs - 0.14, 10, x, -0.14 - (legs - 0.14) / 2, z), cyl(0.07, 0.07, 0.07, 10, x, -0.2, z), cyl(0.12, 0.15, 0.035, 12, x, -legs + 0.0175, z));
      }

    /* Fold-down steps at the door: two timber treads on a dark frame. */
    const rise = (legs + sill) / 3;
    for (let k = 1; k <= 2; k++) {
      const top = -legs + rise * k;
      const z = D / 2 + 0.03 + 0.3 * (2 - k) + 0.15;
      timber.push(box(0.92, 0.045, 0.3, lay.door, top - 0.0225, z));
      for (const s of [-1, 1]) dark.push(box(0.03, top + legs - 0.045, 0.26, lay.door + s * 0.42, (top - 0.045 - legs) / 2, z));
    }

    // The room behind the glazing: the hull's inside, floor to ceiling (materials.ts, interiorGlass), where it
    // will be once the hull is lifted onto its legs (the box is not moved with the vertices).
    const lo = [-L / 2 + 0.32, legs + rb + 0.06, -D / 2 + 0.3];
    const hi = [L / 2 - 0.32, legs + H - POD.rt * 0.55, D / 2 - 0.3];
    for (const part of [...shell, ...dark, ...glass, ...timber]) withRoom(part, lo, hi);
    for (const part of lights) withRoom(part, [0, 0, 0], [0, 0, 0]);
    const g = mergeGroups([shell, dark, [...glass, ...lights], timber]);
    g.translate(0, legs, 0);
    return g;
  });
}

/** Capsule length in metres for a length in feet. */
export const capsuleLength = (feet: number) => feet * FT;
