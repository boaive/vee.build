/**
 * The camera on the opening card's three buildings, fitted to the screen
 * they are seen on (client, 2026-10-11: "for different screen size it does
 * not fit well", "the building size can be adopted but it is reducing").
 *
 * What a screen leaves for the picture is told by the card's own words
 * (`Band`, measured from the page): its margins, the header, the headline
 * that no building may stand over, the names that hang under the buildings
 * and how low they may reach. Into that, each arrangement of the three
 * (row.ts, `s`) is fitted twice: under the headline, across the whole
 * width; and beside it, in what is left to its right, for a window too low
 * to have anything under the words. For each the camera stands as near as
 * it can while everything keeps inside. Among those whose names stand
 * clear of each other and of the other buildings, the one seen from lowest
 * is taken that is not plainly smaller than the largest (`NEAR_BEST`): eye
 * level where a screen allows it, as in the client's reference, and from
 * higher up only where that gives the buildings real size.
 *
 * The camera keeps the height its arrangement gives it. The picture is put
 * where it belongs on the screen by moving the camera sideways and by
 * tilting it, never by raising or lowering it: seen from eye level, a
 * camera moved down to shift the picture would be under the floor.
 *
 * Pure geometry on a camera: nothing here touches the scene or the page.
 * Run once for a size of screen, not in a frame.
 */
import { Vector3, type PerspectiveCamera } from 'three';
import { rowFor, type P3, type Row } from './row';

export interface Band {
  /** The canvas, in its own pixels. */
  w: number;
  h: number;
  /** Side margins. */
  l: number;
  r: number;
  /** The lowest the header reaches: nothing stands over it. */
  top: number;
  /** How low a name may hang. */
  bottom: number;
  /** The card's words: their right edge and their foot, with air. `textRight` below 0: no words in the picture. */
  textRight: number;
  textBottom: number;
  /** Each name's box, hung from its point on the floor: its width, and its top and foot under that point. House, capsule, block. */
  labels: { w: number; top: number; bottom: number }[];
  /** The scroll cue's corner, at the foot on the right: no name stands in it. */
  cue: { x0: number; y0: number } | null;
}

export interface RowFit {
  /** Which arrangement (row.ts): 0 seen from eye level, more from higher up. */
  s: number;
  mode: 'under' | 'beside' | 'compact';
  row: Row;
  pos: P3;
  look: P3;
  /** Where each name hangs from: a point on the floor under its building. */
  tags: [P3, P3, P3];
  /** How large the three stand: pixels to the metre of height, the mean of the three (geometric, so none is traded away for another). */
  score: number;
  /** Every name clear of the other names, the other buildings and the cue. */
  clear: boolean;
  /** No building's box over another's. */
  apart: boolean;
  /** How much of the height it was given the picture takes, names included, 0 to 1. */
  fill: number;
  /** Each building's box on the canvas (x0, x1, y0, y1), in its pixels. */
  boxes: [number, number, number, number][];
}

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** A name hangs this far under the lowest corner of its building. */
const GAP = 5;
/** Air kept between a name and what it must clear. */
const AIR = 6;
/** The height the camera's line of sight is taken from: with the bearing's own rise, eye level in the lowest arrangement. */
const EYE = 1.55;

const _p = new Vector3();
const _c = new Vector3();
const _aim = new Vector3();
const _dir = new Vector3();
const _right = new Vector3();

const hits = (a: Rect, b: Rect, air: number) => a.x0 < b.x1 + air && a.x1 > b.x0 - air && a.y0 < b.y1 + air && a.y1 > b.y0 - air;

/**
 * One arrangement in one place. From the row's bearing the camera stands
 * as near as it can; the picture is centred across what it has, its names
 * on the bottom line (under the headline) or centred in the height (beside
 * it), and under the headline what height is left over is shared above and
 * below. Projected through the camera itself, view offset included.
 */
export function frameRow(cam: PerspectiveCamera, row: Row, band: Band, mode: RowFit['mode'], s: number): RowFit {
  const { az, el } = row.view;
  _dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  let cx = 0;
  let cz = 0;
  let n = 0;
  for (const hull of row.hull)
    for (const q of hull) {
      cx += q[0];
      cz += q[2];
      n++;
    }
  const boxes: Rect[] = row.hull.map(() => ({ x0: 0, x1: 0, y0: 0, y1: 0 }));
  const names: Rect[] = row.hull.map(() => ({ x0: 0, x1: 0, y0: 0, y1: 0 }));
  const all: Rect = { x0: 0, x1: 0, y0: 0, y1: 0 };
  const tan = Math.tan((cam.fov * Math.PI) / 360);
  const left = mode === 'beside' ? Math.max(band.l, band.textRight) : band.l;
  /** How far the line of sight is tilted: the height of the point looked at, above the one the camera is placed from. */
  let tilt = 0;
  const place = (d: number) => {
    cam.position.copy(_c).addScaledVector(_dir, d);
    cam.lookAt(_aim.copy(_c).setY(_c.y + tilt));
    cam.updateMatrixWorld();
  };
  const measure = () => {
    all.x0 = all.y0 = Infinity;
    all.x1 = all.y1 = -Infinity;
    row.hull.forEach((hull, b) => {
      const box = boxes[b];
      box.x0 = box.y0 = Infinity;
      box.x1 = box.y1 = -Infinity;
      for (const q of hull) {
        _p.set(q[0], q[1], q[2]).project(cam);
        const x = (_p.x * 0.5 + 0.5) * band.w;
        const y = (-_p.y * 0.5 + 0.5) * band.h;
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
      }
      // Its name: under the middle of it.
      const label = band.labels[b];
      const name = names[b];
      const mid = (box.x0 + box.x1) / 2;
      name.x0 = mid - label.w / 2;
      name.x1 = mid + label.w / 2;
      name.y0 = box.y1 + GAP + label.top;
      name.y1 = box.y1 + GAP + label.bottom;
      all.x0 = Math.min(all.x0, box.x0, name.x0);
      all.x1 = Math.max(all.x1, box.x1, name.x1);
      all.y0 = Math.min(all.y0, box.y0);
      all.y1 = Math.max(all.y1, name.y1);
    });
  };
  /** The highest a building may reach where it stands: under the words, or beside them. */
  const ceiling = (box: Rect) => (box.x0 < band.textRight ? Math.max(band.top, band.textBottom) : band.top);
  /** How far the nearest of them is under its ceiling (negative: over the words or the header). */
  const room = () => Math.min(...boxes.map((b) => b.y0 - ceiling(b)));
  const settle = (d: number) => {
    _c.set(cx / n, EYE, cz / n);
    tilt = 0;
    for (let it = 0; it < 7; it++) {
      place(d);
      measure();
      const ppm = band.h / (2 * d * tan);
      _right.setFromMatrixColumn(cam.matrixWorld, 0);
      const dx = (left + band.r) / 2 - (all.x0 + all.x1) / 2;
      const dy = mode === 'beside' ? (band.top + band.bottom) / 2 - (all.y0 + all.y1) / 2 : band.bottom - all.y1;
      _c.addScaledVector(_right, -dx / ppm);
      tilt += dy / ppm;
    }
    place(d);
    measure();
    return all.x1 - all.x0 <= band.r - left + 0.5 && all.y1 <= band.bottom + 0.5 && room() >= -0.5;
  };
  let lo = 4;
  let hi = 600;
  for (let k = 0; k < 28; k++) {
    const mid = (lo + hi) / 2;
    if (settle(mid)) hi = mid;
    else lo = mid;
  }
  settle(hi);
  if (mode !== 'beside') {
    // What height is left over: shared, a little more of it under the names.
    const spare = room();
    if (spare > 1) {
      tilt -= (spare * 0.44) / (band.h / (2 * hi * tan));
      place(hi);
      measure();
    }
  }
  /*
   * Names that would touch are moved apart, each as little as it takes, and
   * kept inside the margins: on a small screen a name is wider than its
   * building.
   */
  const order = [0, 1, 2].sort((i, j) => names[i].x0 + names[i].x1 - names[j].x0 - names[j].x1);
  const shift = (r: Rect, by: number) => {
    r.x0 += by;
    r.x1 += by;
  };
  for (let it = 0; it < 8; it++) {
    for (let k = 0; k < order.length - 1; k++) {
      const a = names[order[k]];
      const b = names[order[k + 1]];
      const lap = a.x1 + AIR * 2 - b.x0;
      if (lap > 0 && a.y0 < b.y1 + AIR && b.y0 < a.y1 + AIR) {
        shift(a, -lap / 2);
        shift(b, lap / 2);
      }
    }
    for (const r of names) {
      if (r.x0 < band.l) shift(r, band.l - r.x0);
      if (r.x1 > band.r) shift(r, band.r - r.x1);
    }
  }
  let clear = true;
  const body: Rect = { x0: 0, x1: 0, y0: 0, y1: 0 };
  for (let i = 0; i < names.length; i++) {
    if (band.cue && names[i].x1 > band.cue.x0 - AIR && names[i].y1 > band.cue.y0 - AIR) clear = false;
    for (let j = 0; j < names.length; j++) {
      if (i === j) continue;
      // Seen on the diagonal, the foot of a building's box is its nearest corner alone: floor beside it, where a name may stand.
      const b = boxes[j];
      body.x0 = b.x0;
      body.x1 = b.x1;
      body.y0 = b.y0;
      body.y1 = b.y1 - (b.y1 - b.y0) * 0.16;
      if (hits(names[i], body, AIR)) clear = false;
      if (j > i && hits(names[i], names[j], AIR - 1)) clear = false;
    }
  }
  let apart = true;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hits(boxes[i], boxes[j], band.w * 0.006)) apart = false;
  const score = Math.cbrt(boxes.reduce((p, b, i) => (p * Math.max(1e-3, b.y1 - b.y0)) / row.heights[i], 1));
  // Each name's point on the floor: under its building, seen from here.
  const tags = boxes.map((b, i): P3 => {
    const x = (names[i].x0 + names[i].x1) / 2;
    _p.set((x / band.w) * 2 - 1, -(((b.y1 + GAP) / band.h) * 2 - 1), 0.5)
      .unproject(cam)
      .sub(cam.position);
    const t = _p.y < -1e-6 ? -cam.position.y / _p.y : 0;
    return [cam.position.x + _p.x * t, 0, cam.position.z + _p.z * t];
  }) as [P3, P3, P3];
  const given = band.bottom - (mode === 'beside' || band.textRight < 0 ? band.top : Math.max(band.top, band.textBottom));
  const fill = Math.min(1, (all.y1 - all.y0) / Math.max(1, given));
  return {
    s,
    mode,
    row,
    pos: cam.position.toArray() as P3,
    look: [_c.x, _c.y + tilt, _c.z],
    tags,
    score,
    clear,
    apart,
    fill,
    boxes: boxes.map((b) => [b.x0, b.x1, b.y0, b.y1]),
  };
}

/** The arrangements tried: on a screen with the words over or beside the picture, and on a narrow one, where the picture is an upright card. */
const STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const STEPS_COMPACT = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5];
/** An arrangement seen from lower is taken before a larger one seen from higher, if it is at least this much of the largest. */
const NEAR_BEST = 0.84;

/**
 * The three and the camera on them for this screen. `only`: one
 * arrangement, for looking at it (dev).
 */
export function fitRow(cam: PerspectiveCamera, band: Band, compact: boolean, only?: number): RowFit {
  const fits: RowFit[] = [];
  for (const s of only !== undefined ? [only] : compact ? STEPS_COMPACT : STEPS) {
    // Each arrangement as it is, and with the two behind standing farther right (row.ts, wide).
    for (const wide of [0, 1, 2, 3]) {
      const row = rowFor(s, wide);
      for (const mode of compact ? (['compact'] as const) : (['under', 'beside'] as const)) {
        if (mode === 'beside' && band.textRight < 0) continue;
        fits.push(frameRow(cam, row, band, mode, s));
      }
    }
  }
  // With every name clear, if any is; else the largest, whatever its names do.
  const clear = fits.filter((f) => f.clear);
  const pool = clear.length ? clear : fits;
  const top = Math.max(...pool.map((f) => f.score));
  // The lowest arrangement that has anything near enough the largest; of its own, one with the buildings apart if there is one, and the largest of those.
  const near = pool.filter((f) => f.score >= top * NEAR_BEST);
  const lowest = near.filter((f) => f.s === near[0].s);
  const apart = lowest.filter((f) => f.apart);
  return (apart.length ? apart : lowest).reduce((p, f) => (f.score > p.score ? f : p));
}
