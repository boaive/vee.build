/**
 * The capsule home (POD), drawn from its plan (podPlan.ts): the developer's
 * scheme of 2026-11-08 and 2026-11-09 (notes W). One model wherever the pod
 * is shown: the opening card, the hero's second banner, the phone's hero
 * and the POD page.
 *
 * What is drawn is what stands outside, as the market builds a capsule and
 * RTARIUM clads it: TRC panels of 20 mm with their joints showing (dark
 * behind every joint, as a stud-frame cladding's open joint is), each end
 * module's panoramic window wrapping round its cut corners onto the glazed
 * end, charcoal window surrounds and a warm light line under each head, the
 * door with its precast steps, the frosted bathroom window on the back, the
 * roof band with its cut edge over the electrics, the kicker set back under
 * the middle over the plumbing, the end modules' skirts and feet, four
 * lifting eyes on the roof. The panels of the top band take the joints of
 * the wall under them (developer, 2026-11-09: "the top panels ... follows
 * placement like a stud frame cladding"), and the end modules' skirts are
 * panels of their own under a joint at the kicker's line.
 *
 * Built in parts, as the pod is: the head (its first end module and the
 * door bay), the middle bays (instanced: a plain panel or a window panel,
 * one each side, with their roof and kicker), and the tail (the same end
 * module, mirrored). A length is a count of middle bays, so going from one
 * length to another (`follow`, on the visitor's choice) is panels coming and
 * going in the middle: the far end slides out and the new bays are lowered
 * into the gap, or the bays are lifted out and the far end slides in
 * (things enter and leave a picture by being lowered and lifted, never by
 * fading; CLAUDE.md). The parts are kept apart for what comes next, the pod
 * taken apart layer by layer (developer, 2026-11-09: "the burst animation
 * or more like a construction of the pod ... be prepared for that").
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  ShapeUtils,
  Vector2,
  type Group,
  type InstancedMesh,
  type Material,
  type Mesh,
  type PointLight,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { podChoice } from '../../film/podChoice';
import { ease, win } from '../../film/timeline';
import { box, memo, merge, setInst, withRoom } from './geometry';
import type { Look } from './looks';
import { instanced, litGlass, precastMat, roomPlanUniforms, tintedGlass, trimMat, type RoomPlan } from './materials';
import { POD, POD_DEFAULT, POD_LENGTHS, POD_PIECES, bayAt, fillet, isWindowBay, podBalcony, podBays, podInterior, type PodLayout } from './podPlan';
import { useRefined } from './refined';
import { boxUV } from './textures';

/*
 * The finishes. The TRC in a light concrete grey (RTARIUM's panels are
 * raw concrete), the joints and the kicker dark, the surrounds, the door
 * and the eyes charcoal, the glass tinted, the feet and the steps precast.
 * CONFIRM (notes W): ours, after the references' light panels and dark glass.
 */
const FINISH = { trc: '#c9c6bf', dark: '#202225', frame: '#2c2f33', glass: '#3a4650', concrete: '#a6a29a', guard: '#cdd5d9', door: '#5b4a3b' } as const;

/**
 * Material slots, in the order every part's geometry groups them. The last
 * three are what the pod's layers film tells apart (the top's cladding from
 * the walls', the chassis and the plumbing under the floor): drawn whole,
 * each joins the slot whose material it has, and the pod costs no more.
 */
const S = { trc: 0, dark: 1, frame: 2, glass: 3, concrete: 4, frost: 5, led: 6, guard: 7, door: 8, top: 9, chassis: 10, pipe: 11, topDark: 12 } as const;
type Lists = BufferGeometry[][];
const lists = (): Lists => Array.from({ length: 13 }, () => []);

const { W, chamfer: C, end: E, door: D, bay: B, feet: FEET, kick: KICK, floor: FLOOR, wallTop: WT, bandFace: BF, top: TOP, bandCut: BC, skirtCut: SC, sill: SILL, head: HEAD, cut: CUT, jamb: JAMB, skin: T, joint: J, balcony: BAL } = POD;
const HW = W / 2;
/** The roof band's depth in from the face: the void over the ceiling is behind it. */
const BAND_D = 0.32;
/** Where the end module's top band and skirt are jointed along each side (developer's marks of 2026-11-09). */
const SPLIT = 1.8;

type P2 = [number, number];
type V3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/** A box between two corners. */
const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

const _m = new Matrix4();

/** A bar in a vertical plane z0..z1, from (x0, y0) to (x1, y1), `w` wide in that plane. */
function bar(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, w: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const g = box(len, w, z1 - z0);
  const a = Math.atan2(y1 - y0, x1 - x0);
  _m.makeRotationZ(a).setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g.applyMatrix4(_m);
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * A profile swept along a plan path: the roof band, the skirts, the strips
 * round the glazed end. `prof` is a closed outline, anticlockwise in (u, y),
 * u outward from the path; `inside` is a plan point on the pod's side of
 * the path, which says which way is out. Mitred at the path's corners, with
 * its ends closed. UVs in metres. Shaded smooth where it bends gently (a
 * rounded corner of the plan, a rounded edge of the profile: under 50°
 * between neighbours), sharp elsewhere, as the MOD house's rounded edges
 * are (developer, 2026-11-09: "the pod edges ... make it look smooth").
 */
function sweep(path: P2[], inside: P2, prof: P2[], caps = true): BufferGeometry {
  const n = path.length;
  const segs: { d: P2; n: P2; len: number }[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const d: P2 = [(bx - ax) / len, (bz - az) / len];
    let nn: P2 = [-d[1], d[0]];
    if (nn[0] * ((ax + bx) / 2 - inside[0]) + nn[1] * ((az + bz) / 2 - inside[1]) < 0) nn = [-nn[0], -nn[1]];
    segs.push({ d, n: nn, len });
  }
  const miter = path.map((_, i): P2 => {
    if (i === 0) return segs[0].n;
    if (i === n - 1) return segs[n - 2].n;
    const a = segs[i - 1].n;
    const b = segs[i].n;
    const k = 1 + a[0] * b[0] + a[1] * b[1];
    return [(a[0] + b[0]) / k, (a[1] + b[1]) / k];
  });
  /** The plan normal each path point is shaded with: its segment's at a sharp corner, the two segments' between them at a gentle one. */
  const SMOOTH = Math.cos((50 * Math.PI) / 180);
  const shade = (i: number, s: number): P2 => {
    if (i === 0 || i === n - 1) return segs[s].n;
    const a = segs[i - 1].n;
    const b = segs[i].n;
    if (a[0] * b[0] + a[1] * b[1] < SMOOTH) return segs[s].n;
    const l = Math.hypot(a[0] + b[0], a[1] + b[1]);
    return [(a[0] + b[0]) / l, (a[1] + b[1]) / l];
  };
  const off = (i: number, u: number): P2 => [path[i][0] + miter[i][0] * u, path[i][1] + miter[i][1] * u];
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const m = prof.length;
  const pv = [0];
  for (let j = 0; j < m; j++) {
    const [u0, y0] = prof[j];
    const [u1, y1] = prof[(j + 1) % m];
    pv.push(pv[j] + Math.hypot(u1 - u0, y1 - y0));
  }
  // Each profile edge's normal (out, up), and at each profile point the normal it is shaded with (the same rule).
  const pe: P2[] = prof.map(([u0, y0], j) => {
    const [u1, y1] = prof[(j + 1) % m];
    const el = Math.hypot(u1 - u0, y1 - y0) || 1;
    return [(y1 - y0) / el, -(u1 - u0) / el];
  });
  const pAt = (j: number, edge: number): P2 => {
    const a = pe[(j - 1 + m) % m];
    const b = pe[j % m];
    if (a[0] * b[0] + a[1] * b[1] < SMOOTH) return pe[edge];
    const l = Math.hypot(a[0] + b[0], a[1] + b[1]);
    return [(a[0] + b[0]) / l, (a[1] + b[1]) / l];
  };
  const tri = (q: V3[], t: P2[], N: V3[], order: number[]) => {
    const f = N[order[0]];
    const flip = dot(cross(sub(q[order[1]], q[order[0]]), sub(q[order[2]], q[order[0]])), f) < 0;
    const o = flip ? [order[0], order[2], order[1]] : order;
    for (const k of o) {
      pos.push(...q[k]);
      nor.push(...N[k]);
      uv.push(...t[k]);
    }
  };
  const nrm = (p: P2, e: P2): V3 => {
    const v: V3 = [p[0] * e[0], e[1], p[1] * e[0]];
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  let dist = 0;
  for (let s = 0; s < n - 1; s++) {
    const { len } = segs[s];
    const sa = shade(s, s);
    const sb = shade(s + 1, s);
    for (let j = 0; j < m; j++) {
      const [u0, y0] = prof[j];
      const [u1, y1] = prof[(j + 1) % m];
      const el = Math.hypot(u1 - u0, y1 - y0);
      if (el < 1e-6) continue;
      const e0 = pAt(j, j);
      const e1 = pAt((j + 1) % m, j);
      const N: V3[] = [nrm(sa, e0), nrm(sb, e0), nrm(sb, e1), nrm(sa, e1)];
      const A = off(s, u0);
      const Bq = off(s + 1, u0);
      const Cq = off(s + 1, u1);
      const Dq = off(s, u1);
      const q: V3[] = [
        [A[0], y0, A[1]],
        [Bq[0], y0, Bq[1]],
        [Cq[0], y1, Cq[1]],
        [Dq[0], y1, Dq[1]],
      ];
      const t: P2[] = [
        [dist, pv[j]],
        [dist + len, pv[j]],
        [dist + len, pv[j + 1]],
        [dist, pv[j + 1]],
      ];
      tri(q, t, N, [0, 1, 2]);
      tri(q, t, N, [0, 2, 3]);
    }
    dist += len;
  }
  if (caps) {
    const faces = ShapeUtils.triangulateShape(
      prof.map(([u, y]) => new Vector2(u, y)),
      [],
    );
    for (const [i, s, sign] of [
      [0, 0, -1],
      [n - 1, n - 2, 1],
    ] as const) {
      const N: V3 = [segs[s].d[0] * sign, 0, segs[s].d[1] * sign];
      for (const f of faces) {
        const q = f.map((k): V3 => {
          const o = off(i, prof[k][0]);
          return [o[0], prof[k][1], o[1]];
        });
        const t = f.map((k): P2 => [prof[k][0], prof[k][1]]);
        tri(q, t, [N, N, N], [0, 1, 2]);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

/** A plan outline (x, z) made a flat plate from y0 to y1. */
function plate(pts: P2[], y0: number, y1: number) {
  const s = new Shape(pts.map(([x, z]) => new Vector2(x, z)));
  const g = new ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(Math.PI / 2);
  g.translate(0, y1, 0);
  return g;
}

/** An outline in a long side's plane (x, y) made a panel from z0 to z1, with holes. */
function panel(outline: P2[] | Shape, z0: number, z1: number, holes: Path[] = [], segs = 6) {
  const s = outline instanceof Shape ? outline : new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  s.holes.push(...holes);
  const g = new ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: segs });
  g.translate(0, 0, z0);
  return g;
}

function roundRect<T extends Path>(p: T, x0: number, y0: number, x1: number, y1: number, r: number): T {
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r);
  p.quadraticCurveTo(x1, y1, x1 - r, y1);
  p.lineTo(x0 + r, y1);
  p.quadraticCurveTo(x0, y1, x0, y1 - r);
  p.lineTo(x0, y0 + r);
  p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}

/** The radius the end modules' cut corners are rounded to, in plan (developer, 2026-11-09: "make it look smooth"). */
const ROUND = 0.45;
/** How far along the side the first corner's rounding begins, past the cut corner's point. */
const ROUND_T = ROUND * Math.tan(Math.PI / 8);


/** A quarter round in a profile, from `a` turning to `b` about the corner `c` (the profile's points between them). */
function quarter(c: P2, a: P2, b: P2, segs = 5): P2[] {
  const out: P2[] = [];
  const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  let a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
  if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
  if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
  const r = Math.hypot(a[0] - c[0], a[1] - c[1]);
  for (let k = 0; k <= segs; k++) {
    const ang = a0 + ((a1 - a0) * k) / segs;
    out.push([c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]);
  }
  return out;
}

/** The plan outline of an end module (x from its end, 0, to its joint, `to`), pushed in by `d` all round but at the joint, its cut corners rounded. */
function endOutline(d: number, to: number = E): P2[] {
  const k = d * (Math.SQRT2 - 1);
  const raw: P2[] = [
    [to, HW - d],
    [C + k, HW - d],
    [d, HW - C - k],
    [d, -(HW - C - k)],
    [C + k, -(HW - d)],
    [to, -(HW - d)],
  ];
  return fillet(raw, Math.max(0.05, ROUND - d));
}

/** The parts' merged geometry: each list of slot `s` becomes a group drawn with material `s`. The glass's lit room is `room` (lo, hi), the plan's `kind` of room (0 living, 1 bedroom). */
function finish(l: Lists, room?: [V3, V3], kind: 0 | 1 = 0, layered = false): BufferGeometry {
  if (!layered) {
    for (const [from, to] of [
      [S.top, S.trc],
      [S.chassis, S.frame],
      [S.pipe, S.guard],
      [S.topDark, S.dark],
    ] as const) {
      l[to].push(...l[from]);
      l[from] = [];
    }
  }
  const used: [BufferGeometry, number][] = [];
  l.forEach((parts, slot) => {
    if (!parts.length) return;
    const m = merge(parts);
    boxUV(m, 1);
    const g = m.index ? m.toNonIndexed() : m;
    if (g !== m) m.dispose();
    withRoom(g, slot === S.glass && room ? room[0] : [0, 0, 0], slot === S.glass && room ? room[1] : [0, 0, 0], kind);
    used.push([g, slot]);
  });
  const out = mergeGeometries(
    used.map((u) => u[0]),
    true,
  );
  if (!out) throw new Error('pod: merge failed');
  out.groups.forEach((g, i) => (g.materialIndex = used[i][1]));
  used.forEach((u) => u[0].dispose());
  return out;
}

/** Rectangle profiles, anticlockwise in (u, y). */
const rectProf = (u0: number, u1: number, y0: number, y1: number): P2[] => [
  [u0, y0],
  [u1, y0],
  [u1, y1],
  [u0, y1],
];
/**
 * The roof band: its face, its edge rounded up onto the roof (a quarter
 * round where the draft had a cut; developer, 2026-11-09: "make it look
 * smooth"), back over the void; and the dark inside it that shows at its
 * joints.
 */
const BAND: P2[] = [[-BAND_D, WT], [0, WT], ...quarter([-BC, BF], [0, BF], [-BC, TOP]), [-BAND_D, TOP]];
const BAND_DARK: P2[] = [
  [-BAND_D + 0.01, WT + 0.01],
  [-0.012, WT + 0.01],
  ...quarter([-BC, BF], [-0.012, BF], [-BC, TOP - 0.012]),
  [-BAND_D + 0.01, TOP - 0.012],
];
/** An end module's skirt: from the kicker's line down to the feet, its foot rounded in. */
const SKIRT: P2[] = [[-0.25, FEET], ...quarter([-SC, FEET + SC], [-SC, FEET], [0, FEET + SC]), [0, KICK], [-0.25, KICK]];
const SKIRT_DARK: P2[] = [
  [-0.24, FEET + 0.01],
  ...quarter([-SC, FEET + SC], [-SC, FEET + 0.012], [-0.012, FEET + SC]),
  [-0.012, KICK - 0.005],
  [-0.24, KICK - 0.005],
];

/** A straight run of the band or the skirt along one long side, from x0 to x1, its joints at both ends. */
function sideRun(x0: number, x1: number, side: 1 | -1, prof: P2[], trim = J / 2) {
  return sweep(
    [
      [x0 + trim, side * HW],
      [x1 - trim, side * HW],
    ],
    [(x0 + x1) / 2, 0],
    prof,
  );
}

/* ------------------------------------------------------------------ */
/* The parts                                                           */
/* ------------------------------------------------------------------ */

/**
 * An end module, as the head has it: x from its end (0) to its joint with
 * the door bay or the middle (E). The tail draws it mirrored. `room`: what
 * the plan has behind its glass (1 the bedroom, 0 the living room).
 * `balcony`: the 12 m's far end (the draft's plan, notes W3): its last
 * metres open under the roof band behind a glass guard, a glazed wall
 * across the pod into the room, each side's window short of it. The frame
 * and the panels are the same either way: the pod stays the same at both
 * ends (developer, 2026-11-08: "mirror able").
 */
function endModuleGeometry(room: 0 | 1, balcony = false, layered = false) {
  return memo(`pod-end-v7-${room}-${balcony ? 'balcony' : 'glazed'}${layered ? '-layered' : ''}`, () => {
    const l = lists();
    const inside: P2 = [1.5, 0];
    const wrapIn = 0.06;
    /** Where each side's flat begins: past the rounding of the cut corner. */
    const xs = C + ROUND_T;
    /** Where each side's window begins: at the rounded corner, or past the balcony. */
    const w0 = balcony ? BAL + 0.15 : xs;
    const sideWindow = () => {
      const p = new Path();
      p.moveTo(w0, SILL);
      p.lineTo(E - JAMB - CUT, SILL);
      p.lineTo(E - JAMB, SILL + CUT);
      p.lineTo(E - JAMB, HEAD - CUT);
      p.lineTo(E - JAMB - CUT, HEAD);
      p.lineTo(w0, HEAD);
      p.closePath();
      return p;
    };
    // The plan path round the end: side, cut corner, end, cut corner, side; its corners rounded.
    const corners = (x: number): P2[] => [
      [x, HW],
      [C, HW],
      [0, HW - C],
      [0, -(HW - C)],
      [C, -HW],
      [x, -HW],
    ];
    const round = (x: number, mids?: [P2, P2][]) => fillet(corners(x), ROUND, 4, mids);

    for (const side of [1, -1] as const) {
      const z0 = side > 0 ? HW - T : -HW;
      const z1 = side > 0 ? HW : -HW + T;
      // The side panel round the panoramic window: one piece from the rounded corner to the joint, open where the glass
      // wraps on (or, at a balcony, open over its guard, the window a hole in it).
      const outline = (j: number): P2[] =>
        balcony
          ? [
              [xs + j, KICK + j],
              [E - j, KICK + j],
              [E - j, WT - j],
              [xs + j, WT - j],
              [xs + j, HEAD],
              [BAL, HEAD],
              [BAL, SILL],
              [xs + j, SILL],
            ]
          : [
              [xs + j, KICK + j],
              [E - j, KICK + j],
              [E - j, WT - j],
              [xs + j, WT - j],
              [xs + j, HEAD],
              [E - JAMB - CUT, HEAD],
              [E - JAMB, HEAD - CUT],
              [E - JAMB, SILL + CUT],
              [E - JAMB - CUT, SILL],
              [xs + j, SILL],
            ];
      l[S.trc].push(panel(outline(J / 2), z0, z1, balcony ? [sideWindow()] : []));
      const bz0 = side > 0 ? HW - T - 0.012 : -HW + T + 0.004;
      l[S.dark].push(panel(outline(0), bz0, bz0 + 0.008, balcony ? [sideWindow()] : []));
      // The window: its glass set back, the surround round its inner end, the light line under its head.
      const gz = side > 0 ? HW - wrapIn - 0.012 : -HW + wrapIn;
      const pane: P2[] = [
        [w0, SILL],
        [E - JAMB - CUT, SILL],
        [E - JAMB, SILL + CUT],
        [E - JAMB, HEAD - CUT],
        [E - JAMB - CUT, HEAD],
        [w0, HEAD],
      ];
      l[S.glass].push(panel(pane, gz, gz + 0.012, [], 1));
      const fz0 = side > 0 ? HW - 0.075 : -HW + 0.005;
      const fz1 = fz0 + 0.07;
      const w = 0.045;
      l[S.frame].push(bar(E - JAMB - CUT - 0.01, HEAD - w / 2 + 0.005, E - JAMB + 0.005, HEAD - CUT, fz0, fz1, w));
      l[S.frame].push(bar(E - JAMB - w / 2, HEAD - CUT + 0.02, E - JAMB - w / 2, SILL + CUT - 0.02, fz0, fz1, w));
      l[S.frame].push(bar(E - JAMB + 0.005, SILL + CUT, E - JAMB - CUT - 0.01, SILL + w / 2 - 0.005, fz0, fz1, w));
      if (balcony) {
        // The window past the balcony: its surround's outer post, head and sill, the light line under its head.
        l[S.frame].push(slab(w0 - 0.005, w0 + 0.04, SILL, HEAD, fz0, fz1));
        l[S.frame].push(slab(w0, E - JAMB - CUT, HEAD - w, HEAD, fz0, fz1));
        l[S.frame].push(slab(w0, E - JAMB - CUT, SILL, SILL + w, fz0, fz1));
        const lz0 = side > 0 ? HW - 0.07 : -HW + 0.045;
        l[S.led].push(slab(w0 + 0.04, E - JAMB - CUT, HEAD - 0.07, HEAD - 0.05, lz0, lz0 + 0.025));
      }
    }

    // Round the end, between the two side panels: the strip under the glass (or the guard) and the strip over it, each one piece.
    const mids: [P2, P2][] = [];
    const wrap = round(xs, mids);
    l[S.trc].push(sweep(wrap, inside, rectProf(-T, 0, KICK + J / 2, SILL)));
    l[S.trc].push(sweep(wrap, inside, rectProf(-T, 0, HEAD, WT - J / 2)));
    l[S.dark].push(sweep(wrap, inside, rectProf(-T - 0.012, -T - 0.004, KICK, SILL + 0.02)));
    l[S.dark].push(sweep(wrap, inside, rectProf(-T - 0.012, -T - 0.004, HEAD - 0.02, WT)));
    if (balcony) balconyParts(l, wrap, inside);
    else glazedEnd(l, wrap, inside, wrapIn, mids);

    // The top band: a run along each side to the joint over the window, and one piece round the end.
    for (const side of [1, -1] as const) l[S.top].push(sideRun(SPLIT, E, side, BAND));
    l[S.top].push(sweep(round(SPLIT - J / 2), inside, BAND));
    l[S.topDark].push(sweep(round(E), inside, BAND_DARK, false));
    // The skirt: round the end only, to the joint under the window. From there to the door bay (or the middle) the side
    // is open, as under the middle (developer, 2026-11-09: the marked part is kicker too): the skirt's box is closed there.
    l[S.trc].push(sweep(round(SPLIT - J / 2), inside, SKIRT));
    l[S.dark].push(sweep(round(SPLIT), inside, SKIRT_DARK, false));
    l[S.trc].push(slab(SPLIT - J / 2 - T, SPLIT - J / 2, FEET, KICK, -(HW - 0.02), HW - 0.02));
    openBase(l, SPLIT - J / 2, E);

    // The roof over the band, the dark under its joints; the underside of the closed end; the floor inside (and the balcony's).
    l[S.top].push(plate(endOutline(BAND_D + 0.01, E - J / 2), TOP - 0.045, TOP - 0.005));
    l[S.topDark].push(plate(endOutline(BAND_D - 0.05), TOP - 0.07, TOP - 0.05));
    l[S.dark].push(plate(endOutline(0.24, SPLIT - J / 2 - T), FEET, FEET + 0.02));
    l[S.concrete].push(plate(endOutline(0.2), FLOOR - 0.04, FLOOR));
    // Two lifting eyes on the frame's corners at this end, through the roof.
    for (const z of [HW - 0.55, -(HW - 0.55)]) {
      l[S.frame].push(box(0.022, 0.09, 0.022, E - 0.66, TOP + 0.04, z));
      l[S.frame].push(box(0.022, 0.09, 0.022, E - 0.54, TOP + 0.04, z));
      l[S.frame].push(box(0.142, 0.022, 0.022, E - 0.6, TOP + 0.085, z));
    }
    // The room the glass looks into: the end module's (past the balcony's glazed wall, at a balcony).
    const inner = HW - 0.12;
    return finish(
      l,
      [
        [balcony ? BAL : 0.12, FLOOR, -inner],
        [E, 2.9, inner],
      ],
      room,
      layered,
    );
  });
}

/** A glazed end: the glass round the end, the surround at its head and sill, a mullion at the middle of each rounded corner, the light line. */
function glazedEnd(l: Lists, wrap: P2[], inside: P2, wrapIn: number, mids: [P2, P2][]) {
    const ring: P2[] = [[E - JAMB - CUT, HW], ...wrap, [E - JAMB - CUT, -HW]];
    l[S.glass].push(sweep(wrap, inside, rectProf(-wrapIn - 0.012, -wrapIn, SILL, HEAD), false));
    l[S.frame].push(sweep(ring, inside, rectProf(-0.075, -0.005, HEAD - 0.045, HEAD)));
    l[S.frame].push(sweep(ring, inside, rectProf(-0.075, -0.005, SILL, SILL + 0.045)));
    l[S.led].push(sweep(ring, inside, rectProf(-0.07, -0.045, HEAD - 0.07, HEAD - 0.05)));
    // Each corner's mullion stands in the opening, at the middle of its rounding, just in from the face.
    for (const [[px, pz], [ix, iz]] of mids) l[S.frame].push(box(0.045, HEAD - SILL, 0.045, px + ix * 0.04, (SILL + HEAD) / 2, pz + iz * 0.04));
}

/**
 * The open base between the closed ends, x0 to x1 (developer, 2026-11-09:
 * "it does not have to be black. it is just the place has nothing there.
 * that gives workers to repair things"): the side kicker is empty, the
 * land seen through it. What is there is the pod's own: the chassis's edge
 * rail under each wall, a cross member at each end, and the plumbing fixed
 * under the floor, a drain and a supply, for plumbers to reach from the side.
 */
function openBase(l: Lists, x0: number, x1: number) {
  for (const side of [1, -1] as const) {
    const za = side * (HW - 0.13);
    const zb = side * (HW - 0.025);
    l[S.chassis].push(slab(x0, x1, KICK - 0.15, KICK, Math.min(za, zb), Math.max(za, zb)));
  }
  l[S.chassis].push(slab(x0, x0 + 0.06, KICK - 0.15, KICK - 0.02, -(HW - 0.13), HW - 0.13));
  const pipe = (r: number, y: number, z: number) => {
    const g = new CylinderGeometry(r, r, x1 - x0, 10, 1, true);
    g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, y, z);
    l[S.pipe].push(g);
  };
  pipe(0.055, KICK - 0.11, -0.55);
  pipe(0.018, KICK - 0.07, -0.9);
}

/**
 * A balcony at the end: the guard round its open sides and end (frosted
 * glass from the sill strip to a metre over the floor, a rail on it), the
 * glazed wall across the pod into the room (two sliding leaves in a frame),
 * the panel over that wall, and the balcony's ceiling under the roof band
 * with a light line along it.
 */
function balconyParts(l: Lists, wrap: P2[], inside: P2) {
  const guard: P2[] = [[BAL, HW], ...wrap, [BAL, -HW]];
  const top = FLOOR + 1.0;
  l[S.guard].push(sweep(guard, inside, rectProf(-0.05, -0.038, SILL, top), false));
  l[S.frame].push(sweep(guard, inside, rectProf(-0.058, -0.03, top, top + 0.03)));
  const zi = HW - 0.12;
  l[S.glass].push(slab(BAL + 0.03, BAL + 0.042, FLOOR, HEAD, -zi, zi));
  l[S.frame].push(slab(BAL, BAL + 0.07, FLOOR, FLOOR + 0.04, -zi, zi));
  l[S.frame].push(slab(BAL, BAL + 0.07, HEAD - 0.045, HEAD, -zi, zi));
  for (const z of [-zi, 0, zi]) l[S.frame].push(slab(BAL, BAL + 0.07, FLOOR, HEAD, z - 0.025, z + 0.025));
  l[S.led].push(slab(BAL - 0.3, BAL - 0.26, 2.785, 2.8, -zi + 0.15, zi - 0.15));
  l[S.trc].push(slab(BAL - 0.02, BAL + 0.08, HEAD, 2.82, -zi, zi));
  const k = 0.1 * (Math.SQRT2 - 1);
  l[S.trc].push(
    plate(
      fillet(
        [
          [BAL, HW - 0.1],
          [C + k, HW - 0.1],
          [0.1, HW - C - k],
          [0.1, -(HW - C - k)],
          [C + k, -(HW - 0.1)],
          [BAL, -(HW - 0.1)],
        ],
        ROUND - 0.1,
      ),
      2.8,
      2.82,
    ),
  );
}

/** The parts every bay has, x from 0 to `w`: the top band each side, the roof, the floor, and under it the open base (the kicker). */
function bayCommon(l: Lists, w: number) {
  for (const side of [1, -1] as const) {
    l[S.top].push(sideRun(0, w, side, BAND));
    l[S.topDark].push(sideRun(0, w, side, BAND_DARK, 0));
  }
  l[S.top].push(slab(J / 2, w - J / 2, TOP - 0.045, TOP - 0.005, -(HW - BAND_D - 0.01), HW - BAND_D - 0.01));
  l[S.topDark].push(slab(0, w, TOP - 0.07, TOP - 0.05, -(HW - BAND_D + 0.05), HW - BAND_D + 0.05));
  l[S.concrete].push(slab(0, w, FLOOR - 0.04, FLOOR, -(HW - 0.13), HW - 0.13));
  openBase(l, 0, w);
}

/** A plain wall panel, the full height of the wall band, on one side of a bay x0..x1; and the dark behind its joints. */
function wallPanel(l: Lists, x0: number, x1: number, side: 1 | -1, holes: Path[] = []) {
  const z0 = side > 0 ? HW - T : -HW;
  const outline: P2[] = [
    [x0 + J / 2, KICK + J / 2],
    [x1 - J / 2, KICK + J / 2],
    [x1 - J / 2, WT - J / 2],
    [x0 + J / 2, WT - J / 2],
  ];
  l[S.trc].push(holes.length ? panel(outline, z0, z0 + T, holes) : slab(x0 + J / 2, x1 - J / 2, KICK + J / 2, WT - J / 2, z0, z0 + T));
  // The dark behind its joints, with the panel's openings in it too: else it stands in front of the glass.
  const bz = side > 0 ? HW - T - 0.012 : -HW + T + 0.004;
  const full: P2[] = [
    [x0, KICK],
    [x1, KICK],
    [x1, WT],
    [x0, WT],
  ];
  l[S.dark].push(holes.length ? panel(full, bz, bz + 0.008, holes) : slab(x0, x1, KICK, WT, bz, bz + 0.008));
}

/** A middle bay: a plain panel each side, or a panel each side with a window. */
function bayGeometry(kind: 'panel' | 'window', layered = false) {
  return memo(`pod-bay-${kind}-v5${layered ? '-layered' : ''}`, () => {
    const l = lists();
    bayCommon(l, B);
    const { w, sill, head, r } = POD.win;
    const x0 = (B - w) / 2;
    const x1 = x0 + w;
    for (const side of [1, -1] as const) {
      if (kind === 'panel') {
        wallPanel(l, 0, B, side);
        continue;
      }
      wallPanel(l, 0, B, side, [roundRect(new Path(), x0, sill, x1, head, r)]);
      const zf = side > 0 ? HW - 0.07 : -HW + 0.005;
      // The surround: a charcoal ring in the opening, the glass behind it.
      const ring = roundRect(new Shape(), x0 - 0.001, sill - 0.001, x1 + 0.001, head + 0.001, r);
      ring.holes.push(roundRect(new Path(), x0 + 0.045, sill + 0.045, x1 - 0.045, head - 0.045, r * 0.7));
      l[S.frame].push(panel(ring, zf, zf + 0.065, [], 4));
      const gz = side > 0 ? HW - 0.062 : -HW + 0.05;
      l[S.glass].push(panel(roundRect(new Shape(), x0 + 0.03, sill + 0.03, x1 - 0.03, head - 0.03, r * 0.8), gz, gz + 0.012, [], 4));
    }
    // Its lit room: the far room, the living room, round the window.
    return finish(
      l,
      [
        [-1.5, POD.floor, -(HW - 0.12)],
        [2.5, 2.9, HW - 0.12],
      ],
      0,
      layered,
    );
  });
}

/** The door bay, as the head has it (x from E to E + D): the door and its steps in front, the bathroom's frosted window behind. */
function doorBayGeometry(layered = false) {
  return memo(`pod-door-v5${layered ? '-layered' : ''}`, () => {
    const l = lists();
    bayCommon(l, D);
    const { h: dh } = POD.doorLeaf;
    const top = FLOOR + dh;
    /** The frame's width; the leaf's face, set back from the panels' (a reveal that reads as a door's). */
    const fw = 0.055;
    const face = HW - 0.035;
    // The frame (developer, 2026-11-09: "the door currently does not look like a door ... make it look like a door"):
    // jambs and head standing just proud of the panels, the leaf set back in it.
    l[S.frame].push(slab(0, fw, KICK, top + fw, HW - 0.09, HW + 0.008));
    l[S.frame].push(slab(D - fw, D, KICK, top + fw, HW - 0.09, HW + 0.008));
    l[S.frame].push(slab(0, D, top, top + fw, HW - 0.09, HW + 0.008));
    // The leaf, in a quiet bronze: a frosted vision strip by the hinge (lit with the rooms), a kick plate, a long pull.
    const x0 = fw + 0.004;
    const x1 = D - fw - 0.004;
    const vx0 = x0 + 0.08;
    const vx1 = vx0 + 0.13;
    const vy0 = FLOOR + 0.34;
    const vy1 = FLOOR + 1.92;
    l[S.door].push(slab(x0, vx0, FLOOR + 0.01, top - 0.004, face - 0.04, face));
    l[S.door].push(slab(vx1, x1, FLOOR + 0.01, top - 0.004, face - 0.04, face));
    l[S.door].push(slab(vx0, vx1, FLOOR + 0.01, vy0, face - 0.04, face));
    l[S.door].push(slab(vx0, vx1, vy1, top - 0.004, face - 0.04, face));
    l[S.frost].push(slab(vx0, vx1, vy0, vy1, face - 0.025, face - 0.015));
    for (const [a, b, c, d] of [
      [vx0, vx0 + 0.014, vy0, vy1],
      [vx1 - 0.014, vx1, vy0, vy1],
      [vx0, vx1, vy0, vy0 + 0.014],
      [vx0, vx1, vy1 - 0.014, vy1],
    ])
      l[S.frame].push(slab(a, b, c, d, face - 0.02, face + 0.006));
    l[S.guard].push(slab(x0 + 0.03, x1 - 0.03, FLOOR + 0.03, FLOOR + 0.2, face, face + 0.004));
    const px = x1 - 0.1;
    l[S.guard].push(slab(px - 0.0125, px + 0.0125, FLOOR + 0.5, FLOOR + 1.75, face + 0.045, face + 0.07));
    for (const y of [FLOOR + 0.58, FLOOR + 1.67]) l[S.guard].push(slab(px - 0.008, px + 0.008, y - 0.008, y + 0.008, face, face + 0.045));
    // The sill: an aluminium threshold on the precast landing's edge.
    l[S.guard].push(slab(fw * 0.5, D - fw * 0.5, FLOOR - 0.006, FLOOR + 0.012, HW - 0.09, HW + 0.025));
    l[S.trc].push(slab(J / 2, D - J / 2, top + fw + J / 2, WT - J / 2, HW - T, HW));
    l[S.dark].push(slab(0, D, top + fw, WT, HW - T - 0.012, HW - T - 0.004));
    // The light over the door, on the strip over it: its wiring comes down from the roof band.
    l[S.frame].push(slab(D / 2 - 0.13, D / 2 + 0.13, top + fw + 0.004, top + fw + 0.054, HW, HW + 0.07));
    l[S.led].push(slab(D / 2 - 0.11, D / 2 + 0.11, top + fw - 0.001, top + fw + 0.005, HW + 0.01, HW + 0.06));
    l[S.concrete].push(slab(fw * 0.5, D - fw * 0.5, KICK, FLOOR - 0.006, HW - 0.12, HW));
    // The steps: precast, a landing at the floor and two steps down, wider than the door.
    const { rise, going, w: sw } = POD.steps;
    const sx0 = D / 2 - sw / 2;
    const sx1 = D / 2 + sw / 2;
    l[S.concrete].push(slab(sx0, sx1, 0, FLOOR - 0.005, HW, HW + 0.52));
    l[S.concrete].push(slab(sx0, sx1, 0, FLOOR - 0.005 - rise, HW + 0.52, HW + 0.52 + going));
    l[S.concrete].push(slab(sx0, sx1, 0, FLOOR - 0.005 - 2 * rise, HW + 0.52 + going, HW + 0.52 + 2 * going));
    // The back: a panel with the bathroom's window, high and frosted.
    const { w: qw, sill: qs, head: qh } = POD.frost;
    const qx0 = (D - qw) / 2;
    const hole = new Path();
    hole.moveTo(qx0, qs);
    hole.lineTo(qx0, qh);
    hole.lineTo(qx0 + qw, qh);
    hole.lineTo(qx0 + qw, qs);
    hole.closePath();
    wallPanel(l, 0, D, -1, [hole]);
    l[S.frost].push(slab(qx0, qx0 + qw, qs, qh, -HW + 0.045, -HW + 0.055));
    for (const [a, b2, c, d] of [
      [qx0, qx0 + 0.04, qs, qh],
      [qx0 + qw - 0.04, qx0 + qw, qs, qh],
      [qx0, qx0 + qw, qs, qs + 0.04],
      [qx0, qx0 + qw, qh - 0.04, qh],
    ])
      l[S.frame].push(slab(a, b2, c, d, -HW + 0.005, -HW + 0.06));
    const g = finish(l, undefined, 0, layered);
    g.translate(E, 0, 0);
    return g;
  });
}

/* ------------------------------------------------------------------ */
/* The pod                                                             */
/* ------------------------------------------------------------------ */

/** The middle bays the longest pod has, by kind: which bay each instance is. */
const BAYS_MAX = podBays(POD_LENGTHS[POD_LENGTHS.length - 1]);
const PANEL_BAYS = Array.from({ length: BAYS_MAX }, (_, k) => k).filter((k) => !isWindowBay(k));
const WINDOW_BAYS = Array.from({ length: BAYS_MAX }, (_, k) => k).filter(isWindowBay);

/** The middle bays that stand on a pair of feet of their own, as the ends and the door bay do: the chassis's spans stay short. */
const FOOT_BAYS = [1, 4];
const FEET_N = 2 * (3 + FOOT_BAYS.length);
/** A foot: a precast cone from the ground up under the chassis (in a closed end, its head hidden in the skirt's box). */
function footGeometry() {
  return memo('pod-foot-v1', () => {
    const h = KICK - 0.15;
    const g = new CylinderGeometry(0.15, 0.1, h, 18);
    g.translate(0, h / 2, 0);
    return g;
  });
}

/** Going from one length to another, in seconds: growing (the far end out, the bays down into the gap) and shrinking (the bays up, the far end in). */
const MORPH = { grow: 1.35, shrink: 1.15, drop: 9, lift: 9 } as const;
/** How far a pod set down on its feet comes from (`getDrop`). */
const DROP_H = 4;

/** What a pod is doing, for a set that draws something beside it (the dimension line under it). */
export interface PodTrack {
  /** Its length as drawn this frame, in metres (between two during a change). */
  length: number;
  /** The length it is going to, or stands at. */
  settled: number;
}

export interface PodProps {
  /** Its length, where it is not the visitor's to choose. */
  length?: number;
  /** Follow the visitor's choice (film/podChoice.ts), going from one length to another by panels. */
  follow?: boolean;
  /** 0 to 1: its lights, on once it stands. */
  getLit?: () => number;
  look: Look;
  /** 0 to 1: set down on its feet from above (the hero's banner, as the set arrives). */
  getDrop?: () => number;
  /** Written every frame: what it is doing. */
  track?: PodTrack;
  /**
   * The light over the door, as a light (its fitting is always drawn):
   * how bright, at full. One point light a set (sets.tsx, Lamp): give it
   * only where the set has no other.
   */
  lamp?: number;
  /**
   * What of it is drawn: all of it (everywhere the pod stands), or for the
   * layers film (PodLayersScene) its TRC skin's walls (with the glazing, the
   * door and the steps) or its top cladding alone. Its frame, services,
   * insulation and lining are that film's own (kit/podLayers.ts).
   */
  part?: PodPart;
  /**
   * The layers film's cladding, hung a unit at a time (developer, 2026-11-09:
   * "cladding by cladding that is getting attached/locked"): how far above
   * its place unit `i` of `n` stands this frame (0 in place; over 40 not
   * there yet). Units in order along the pod: the head end, the door bay,
   * each middle bay, the far end.
   */
  unitOffset?: (i: number, n: number) => number;
}

export type PodPart = 'whole' | 'walls' | 'top';

/**
 * One pod, centred on its length and its width, its front (the door) to
 * +z, standing on the ground at y = 0.
 */
export function Pod({ length = POD_DEFAULT, follow = false, getLit, look, getDrop, track, lamp = 0, part = 'whole', unitOffset }: PodProps) {
  const layered = part !== 'whole';
  const light = useRef<PointLight>(null);
  const fine = useRefined();
  const invalidate = useThree((s) => s.invalidate);
  // Lit from inside wherever the light is dusk's, by its own getter or at full; the rooms behind the glass are its plan's.
  const dusk = look.windows === 'dusk';
  const plan = useMemo(() => roomPlanUniforms(), []);
  const glow = useMemo(() => (dusk ? litGlass(fine, plan) : null), [dusk, fine, plan]);
  /** The frosted window and the light lines, lit with the rooms. */
  const frost = useMemo(() => new MeshStandardMaterial({ color: '#d5d8da', roughness: 0.5, emissive: '#ffd6a0', emissiveIntensity: 0 }), []);
  const led = useMemo(() => new MeshStandardMaterial({ color: '#2a2622', roughness: 0.4, emissive: '#ffcf9a', emissiveIntensity: 0 }), []);
  /** The balcony's guard: frosted glass, pale, not clear (the pod's other glass is). */
  const guard = useMemo(() => new MeshStandardMaterial({ color: FINISH.guard, roughness: 0.32, metalness: 0 }), []);
  useEffect(
    () => () => {
      glow?.dispose();
      frost.dispose();
      led.dispose();
      guard.dispose();
    },
    [glow, frost, led, guard],
  );
  const mats = useMemo<Material[]>(
    () => [
      precastMat(FINISH.trc, fine),
      trimMat(FINISH.dark, fine),
      trimMat(FINISH.frame, fine),
      glow ? glow.material : tintedGlass(FINISH.glass),
      precastMat(FINISH.concrete, fine),
      frost,
      led,
      guard,
      trimMat(FINISH.door, fine),
    ],
    [fine, glow, look, frost, led, guard],
  );
  /** A part of the skin alone (the layers film): the slots not in it drawn by nothing. */
  const hidden = useMemo(() => new MeshBasicMaterial({ visible: false }), []);
  useEffect(() => () => hidden.dispose(), [hidden]);
  const shown = useMemo<Material[]>(() => {
    if (part === 'whole') return mats;
    if (part === 'walls') return [...mats, hidden, hidden, hidden, hidden];
    return [...mats.map(() => hidden), mats[S.trc], hidden, hidden, mats[S.dark]];
  }, [part, mats, hidden]);
  const imats = useMemo(() => instanced(shown), [shown]);

  const root = useRef<Group>(null);
  const tail = useRef<Group>(null);
  /** The far end's two forms: glazed, or (the 12 m) its balcony. */
  const glazedTail = useRef<Mesh>(null);
  const balconyTail = useRef<Mesh>(null);
  const panels = useRef<InstancedMesh>(null);
  const windows = useRef<InstancedMesh>(null);
  const feet = useRef<InstancedMesh>(null);
  const headUnit = useRef<Mesh>(null);
  const doorUnit = useRef<Mesh>(null);

  /** The change of length under way: from and to (bays), and how far (0–1); `next`, a choice made while one was under way. */
  const morph = useMemo(() => {
    const m = podBays(follow ? podChoice.length : length);
    return { from: m, to: m, t: 1, next: -1, drawn: -1 };
  }, [follow, length]);

  // A choice made: go to it (after the change under way, if one is).
  useEffect(() => {
    if (!follow) return;
    const go = () => {
      const m = podBays(podChoice.length);
      if (morph.t < 1) morph.next = m;
      else if (m !== morph.to) Object.assign(morph, { from: morph.to, to: m, t: 0 });
      // A layout chosen: the same length, its rooms laid out again.
      morph.drawn = -1;
      invalidate();
    };
    podChoice.listeners.add(go);
    return () => {
      podChoice.listeners.delete(go);
    };
  }, [follow, morph, invalidate]);

  // A fixed length changed: no change shown, it is simply that length.
  useEffect(() => {
    if (follow) return;
    const m = podBays(length);
    Object.assign(morph, { from: m, to: m, t: 1, drawn: -1 });
    invalidate();
  }, [follow, length, morph, invalidate]);

  const lastLit = useRef(-1);
  const interiorFor = useRef({ shown: -1, L: -1, layout: '' as string });
  // Ahead of the rest of the frame: a camera that keeps the pod whole reads its length (`track`, podReach).
  useFrame((_, dt) => {
    // The lights: the rooms, the frosted window and the light lines together.
    const v = dusk ? (getLit ? getLit() : 1) : 0;
    if (v !== lastLit.current) {
      lastLit.current = v;
      glow?.set(v);
      frost.emissiveIntensity = 0.45 * v;
      led.emissiveIntensity = 2.4 * v;
      if (light.current) light.current.intensity = lamp * v;
    }

    // A change of length under way: on its own clock.
    const grow = morph.to > morph.from;
    if (morph.t < 1) {
      morph.t = Math.min(1, morph.t + Math.min(dt, 0.05) / (grow ? MORPH.grow : MORPH.shrink));
      if (morph.t >= 1 && morph.next >= 0) {
        if (morph.next !== morph.to) Object.assign(morph, { from: morph.to, to: morph.next, t: 0 });
        morph.next = -1;
      }
      invalidate();
    }
    const t = morph.t;
    const { from, to } = morph;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    // How many bays the far end stands past: it slides out first when growing, last when shrinking.
    const slide = grow ? win(t, 0, 0.5, ease.inOut) : win(t, 0.45, 0.95, ease.inOut);
    const m = from + (to - from) * (from === to ? 1 : slide);
    const L = 2 * E + D + m * B;
    if (track) {
      track.length = L;
      track.settled = 2 * E + D + to * B;
    }
    const key = t >= 1 ? to : -2 - t;
    if (key === morph.drawn && !getDrop && !unitOffset) return;
    morph.drawn = key;

    const g = root.current;
    if (g) {
      g.position.x = -L / 2;
      const d = getDrop ? getDrop() : 1;
      g.position.y = (1 - ease.outQuart(d)) * DROP_H;
    }
    // The cladding's units, each where the film has it (the layers film), else in place.
    const units = 3 + to;
    const unitY = (i: number) => (unitOffset ? unitOffset(i, units) : 0);
    const place1 = (o: { position: { y: number }; visible: boolean } | null, y: number) => {
      if (!o) return;
      o.position.y = y > 40 ? 0 : y;
      o.visible = y <= 40;
    };
    place1(headUnit.current, unitY(0));
    place1(doorUnit.current, unitY(1));
    if (tail.current) {
      tail.current.position.x = L;
      place1(tail.current, unitY(units - 1));
    }
    // The far end takes the form of the length it is going to as soon as it moves (the 12 m's balcony, or the glazed end).
    const shown = 2 * E + D + (slide > 0 ? to : from) * B;
    const bal = podBalcony(shown);
    if (glazedTail.current) glazedTail.current.visible = !bal;
    if (balconyTail.current) balconyTail.current.visible = bal;
    // The rooms behind the glass: the layout of the length it is going to, its far end where the end stands. Laid out
    // again only when one of those changes: a film that hangs the cladding redraws the pod every frame.
    const layout = follow ? podChoice.layout : 'A';
    const room = interiorFor.current;
    if (glow && (room.shown !== shown || room.L !== L || room.layout !== layout)) {
      setInterior(plan, shown, L, layout);
      Object.assign(room, { shown, L, layout });
    }
    // The bays: the ones both lengths have stand; the others come down into the gap, or go up out of it, a little after one another.
    const bayState = (k: number): [number, boolean] => {
      if (k < lo) return [0, true];
      if (k >= hi) return [0, false];
      const n = k - lo;
      if (grow) return [(1 - win(t, 0.3 + 0.1 * n, 0.82 + 0.1 * n, ease.outQuart)) * MORPH.drop, t > 0.3 + 0.1 * n];
      const back = hi - 1 - k;
      return [win(t, 0.04 * back, 0.42 + 0.04 * back, ease.in) * MORPH.lift, t < 0.42 + 0.04 * back];
    };
    const place = (mesh: InstancedMesh | null, list: number[]) => {
      if (!mesh) return;
      list.forEach((k, i) => {
        const [y, on] = bayState(k);
        const u = unitY(2 + k);
        const shown = on && u <= 40;
        setInst(mesh, i, bayAt(k), shown ? y + u : -40, 0, 0, shown ? 1 : 0.0001);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(panels.current, PANEL_BAYS);
    place(windows.current, WINDOW_BAYS);
    // The feet: a pair under each end, under the door bay and under the middle bays that carry them, each with its bay.
    const f = feet.current;
    if (f) {
      let i = 0;
      const pair = (x: number, y: number, on: boolean) => {
        for (const z of [HW - POD.feetAt.z, -(HW - POD.feetAt.z)]) setInst(f, i++, x, on ? y : -40, z, 0, on ? 1 : 0.0001);
      };
      pair(POD.feetAt.x, 0, true);
      pair(E + 0.05, 0, true);
      for (const k of FOOT_BAYS) pair(bayAt(k) + 0.05, ...bayState(k));
      pair(L - POD.feetAt.x, 0, true);
      f.instanceMatrix.needsUpdate = true;
    }
  }, -1);

  return (
    <group ref={root}>
      {/* The head end: the plan's bedroom behind its glass. */}
      <mesh ref={headUnit} geometry={endModuleGeometry(1, false, layered)} material={shown} castShadow receiveShadow />
      <mesh ref={doorUnit} geometry={doorBayGeometry(layered)} material={shown} castShadow receiveShadow />
      <instancedMesh ref={panels} args={[bayGeometry('panel', layered), imats, PANEL_BAYS.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={windows} args={[bayGeometry('window', layered), imats, WINDOW_BAYS.length]} castShadow receiveShadow frustumCulled={false} />
      {!layered && <instancedMesh ref={feet} args={[footGeometry(), imats[S.concrete], FEET_N]} castShadow receiveShadow frustumCulled={false} />}
      <group ref={tail}>
        {/* The far end: the living room behind its glass; on the 12 m, its balcony. */}
        <mesh ref={glazedTail} geometry={endModuleGeometry(0, false, layered)} material={shown} scale-x={-1} castShadow receiveShadow />
        <mesh ref={balconyTail} geometry={endModuleGeometry(0, true, layered)} material={shown} scale-x={-1} castShadow receiveShadow visible={false} />
      </group>
      {lamp > 0 && !layered && <pointLight ref={light} position={[E + D / 2, POD.floor + POD.doorLeaf.h - 0.05, HW + 0.55]} intensity={0} color="#ffc98a" distance={8} decay={2} />}
    </group>
  );
}

/** Writes the plan's interior for a length into the glass's room (kit/materials.ts, roomPlan). */
function setInterior(u: RoomPlan, shown: number, L: number, layout: PodLayout) {
  const it = podInterior(shown, L, layout);
  u.uPodLength.value = L;
  u.uBedLo.value.set(...it.bed.lo);
  u.uBedHi.value.set(...it.bed.hi);
  u.uLiveLo.value.set(...it.live.lo);
  u.uLiveHi.value.set(...it.live.hi);
  u.uBedLamp.value.set(...it.bed.lamp);
  u.uLiveLamp.value.set(...it.live.lamp);
  for (let k = 0; k < POD_PIECES; k++) {
    const p = it.pieces[k];
    if (p) {
      u.uPieceLo.value[k].set(p[0], p[1], p[2], p[7]);
      u.uPieceHi.value[k].set(p[3], p[4], p[5], p[6]);
    } else u.uPieceHi.value[k].w = 0;
  }
}

/** The label of a length, as the films name them (`pod-8`, `pod-10`, `pod-12`). */
export const podLabelId = (length: number) => `pod-${Math.round(length)}`;

/** Geometry the pod needs, for a scene to build in idle time before it mounts (film/prefetch.ts). */
export const preparePod = [() => endModuleGeometry(1), () => endModuleGeometry(0), () => endModuleGeometry(0, true), () => doorBayGeometry(), () => bayGeometry('panel'), () => bayGeometry('window'), footGeometry];
/** The skin's walls and top apart, for the layers film. */
export const preparePodLayered = [() => endModuleGeometry(1, false, true), () => endModuleGeometry(0, false, true), () => endModuleGeometry(0, true, true), () => doorBayGeometry(true), () => bayGeometry('panel', true), () => bayGeometry('window', true)];

/** The skin's own shapes, for the layers film's frame, insulation and lining (kit/podLayers.ts), which follow the same plan. */
export { endOutline, fillet, panel, plate, rectProf, roundRect, slab, sweep, ROUND, ROUND_T, SPLIT };
