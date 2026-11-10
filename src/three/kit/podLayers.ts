/**
 * The pod's layers, for the film that takes it apart and builds it again
 * on the POD page (developer, 2026-11-09): "the pod starts with galvanized
 * steel frames welded together. then followed by wiring works in place
 * then ... rockwool + fire barrier. then, there comes the cladding part ...
 * and for interior walls it can use any interior wall panels". Its skin is
 * the pod's own (kit/pod.tsx, `part`); what is under it is here: the
 * galvanised steel frame (in the order it is welded: chassis, posts,
 * rails, roof, and where each is welded), the plumbing fixed under the
 * floor where the open kicker lets a plumber reach it, the floor's boards,
 * the interior panels (walls, the core's partitions, the floor's finish,
 * the ceiling) with the wiring laid on their backs, and the rockwool and
 * its fire barrier.
 *
 * The wiring (developer, 2026-11-10: "we dont need to show wires hanging,
 * no one does like that ... the wiring follows only the interior panels,
 * not on random places"; "it is hidden with the requirement and floor
 * plan"): it runs on the back of the panels, in the wall's cavity, and over
 * the ceiling, never through the air, to the points the plan needs: a light
 * in each room, a switch by each room's way in, sockets under the windows,
 * the board in the entry (`wiringPlan`). Once the rockwool is in, none of it
 * is seen.
 *
 * Heights: the ceiling where the plan has it (2.9 m, a room 2.4 m high:
 * the glass's rooms are drawn to it), the frame's ring round the top over
 * it, the roof's bows on the ring, all of it under the roof band.
 *
 * All of it on the pod's own plan, x from its head end (0) to its length,
 * z to its front, y up from the ground, as the skin is drawn: the scene
 * puts each layer where the pod stands. No texture maps: plain finishes,
 * the services and the panels in vertex colours. Geometry only, built once
 * a length and kept. The rooms' furniture is not a layer: it is behind the
 * glass once the lights are on (kit/materials.ts, the plan's rooms); the
 * plans' 3D (PodPlanScene) draws it from `podFurniture`.
 */
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { memo } from './geometry';
import { POD_CORE, POD, bayAt, isWindowBay, podBalcony, podBays, podInterior, type PodLayout } from './podPlan';
import { ROUND, ROUND_T, endOutline, fillet, plate, rectProf, slab, sweep } from './pod';

type P2 = [number, number];
type V3 = [number, number, number];

const { W, chamfer: C, end: E, door: D, bay: B, kick: KICK, floor: FLOOR, sill: SILL, head: HEAD, jamb: JAMB, balcony: BAL } = POD;
const HW = W / 2;
/** Where the frame's members stand in from the skin's face. */
const IN = 0.09;
/** The ceiling, where the plan has it. */
export const CEIL = 2.9;
/** The top of the frame: its ring round the top, over the ceiling, under the roof band. */
export const RING = 3.0;
/** The rockwool over the ceiling, between the roof's bows: its top. */
export const ROOF_WOOL = RING + 0.06;
/** Where an end module's flat side begins, past its rounded corner. */
const XS = C + ROUND_T;
/** The wiring: in from the skin's face on the back of the wall panels (between the frame and the panel), and over the ceiling. */
const WIRE_IN = 0.138;
const WIRE_R = 0.011;
const WIRE_Y = CEIL + 0.015 + WIRE_R;
/** Heights over the floor of a socket and a switch, and the board's middle. */
const SOCKET = FLOOR + 0.22;
const SWITCH = FLOOR + 1.1;
const BOARD = FLOOR + 1.6;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Non-indexed, position and normal only (no maps here), and in one colour if given: ready to merge. */
function prep(g: BufferGeometry, color?: string): BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  for (const name of Object.keys(n.attributes)) if (name !== 'position' && name !== 'normal') n.deleteAttribute(name);
  if (!n.getAttribute('normal')) n.computeVertexNormals();
  if (color) {
    const c = new Color(color).convertSRGBToLinear();
    const k = n.getAttribute('position').count;
    const a = new Float32Array(k * 3);
    for (let i = 0; i < k; i++) a.set([c.r, c.g, c.b], i * 3);
    n.setAttribute('color', new Float32BufferAttribute(a, 3));
  }
  return n;
}

function join(list: BufferGeometry[]): BufferGeometry {
  const out = mergeGeometries(list, false);
  if (!out) throw new Error('podLayers: merge failed');
  list.forEach((g) => g.dispose());
  return out;
}

/** The same geometry, at the far end: x turned about the pod's length, its faces kept facing out. */
function mirror(g: BufferGeometry, L: number): BufferGeometry {
  const m = g.index ? g.toNonIndexed() : g.clone();
  g.dispose();
  m.applyMatrix4(new Matrix4().makeScale(-1, 1, 1).setPosition(L, 0, 0));
  for (const name of Object.keys(m.attributes)) {
    const a = m.getAttribute(name);
    const s = a.itemSize;
    const arr = a.array as Float32Array;
    for (let t = 0; t < a.count; t += 3) {
      for (let k = 0; k < s; k++) {
        const i1 = (t + 1) * s + k;
        const i2 = (t + 2) * s + k;
        const v = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = v;
      }
    }
    a.needsUpdate = true;
  }
  return m;
}

/** A square or box member from a to b, `w` wide across it and `h` deep (its height, for a horizontal one). */
function beam(a: V3, b: V3, w: number, h = w): BufferGeometry {
  const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const g = new BoxGeometry(len, h, w);
  d.normalize();
  const yaw = Math.abs(d.y) > 0.999 ? 0 : Math.atan2(-d.z, d.x);
  const pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
  const m = new Matrix4().makeRotationY(yaw).multiply(new Matrix4().makeRotationZ(pitch));
  m.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g.applyMatrix4(m);
}

/** A pipe or a conduit along x, z or y, from `from` to `to`; `at` is its place across (y and z, x and y, or x and z). Its ends run on by its radius, so two meet at a corner without a notch. */
function tube(axis: 'x' | 'y' | 'z', from: number, to: number, at: P2, r: number, segs = 10): BufferGeometry {
  const lo = Math.min(from, to) - r;
  const hi = Math.max(from, to) + r;
  const g = new CylinderGeometry(r, r, hi - lo, segs, 1, true);
  const mid = (lo + hi) / 2;
  if (axis === 'x') g.rotateZ(Math.PI / 2).translate(mid, at[0], at[1]);
  else if (axis === 'z') g.rotateX(Math.PI / 2).translate(at[0], at[1], mid);
  else g.translate(at[0], mid, at[1]);
  return g;
}

/** The plan line round the pod, `d` in from its face: the head end, the back, the far end, the front. */
function ring(L: number, d: number): P2[] {
  const head = endOutline(d, E);
  const tail = head.map(([x, z]): P2 => [L - x, z]).reverse();
  return [...head, ...tail];
}

/** The bays the length has, and where the side's posts stand: at each joint from the door bay to the far end module. */
function stations(L: number): number[] {
  const m = podBays(L);
  const out = [E, E + D];
  for (let k = 1; k <= m; k++) out.push(bayAt(k));
  return out;
}

/** The posts at each end: at each cut corner and in the middle of the end. */
function endPosts(): P2[] {
  const z0 = HW - IN;
  const k = IN * (Math.SQRT2 - 1);
  return [
    [C + k, z0],
    [IN, HW - C - k],
    [IN, 0],
    [IN, -(HW - C - k)],
    [C + k, -z0],
  ];
}

/* ------------------------------------------------------------------ */
/* The frame                                                           */
/* ------------------------------------------------------------------ */

/** The frame, in the order it is welded: the chassis (with its joists and feet), the posts, the rails and the ring round the top, the roof. */
export interface FrameParts {
  chassis: BufferGeometry;
  posts: BufferGeometry;
  rails: BufferGeometry;
  roof: BufferGeometry;
}

/** Where the pod's feet stand (as kit/pod.tsx sets them): a pair under each end, the door bay and the bays that carry them. */
export function footStations(L: number): number[] {
  const m = podBays(L);
  const out = [POD.feetAt.x, E + 0.05];
  for (const k of [1, 4]) if (k < m) out.push(bayAt(k) + 0.05);
  out.push(L - POD.feetAt.x);
  return out;
}

/** The roof's bows across the ring stop this far in from the skin's face: clear of the roof band's cut edge. */
const BOW_IN = 0.13;

export function podFrame(L: number): FrameParts {
  const key = `pod-layer-frame-v2-${L}`;
  const part = (name: string, make: () => BufferGeometry[]) => memo(`${key}-${name}`, () => join(make().map((g) => prep(g))));
  const R = ring(L, IN);
  const edges = R.map((p, i): [P2, P2] => [p, R[(i + 1) % R.length]]);
  const z0 = HW - IN;
  return {
    chassis: part('chassis', () => {
      const out = edges.map(([a, b]) => beam([a[0], KICK - 0.075, a[1]], [b[0], KICK - 0.075, b[1]], 0.08, 0.15));
      // Joists across the floor, every half metre, as wide as the plan is there.
      for (let x = 0.35; x < L - 0.3; x += 0.5) {
        const hz = z0 - Math.max(0, C - x, C - (L - x));
        if (hz > 0.3) out.push(beam([x, KICK - 0.08, -hz], [x, KICK - 0.08, hz], 0.05, 0.1));
      }
      for (const x of footStations(L))
        for (const z of [HW - POD.feetAt.z, -(HW - POD.feetAt.z)]) {
          const h = KICK - 0.15;
          out.push(new CylinderGeometry(0.15, 0.1, h, 14).translate(x, h / 2, z));
        }
      return out;
    }),
    posts: part('posts', () => {
      const out: BufferGeometry[] = [];
      for (const x of stations(L)) for (const z of [z0, -z0]) out.push(beam([x, KICK, z], [x, RING, z], 0.06));
      // The ends: the glass's mullions stand on these.
      for (const [x, z] of endPosts()) for (const xx of [x, L - x]) out.push(beam([xx, KICK, z], [xx, RING, z], 0.06));
      return out;
    }),
    rails: part('rails', () => {
      // The ring round the top, which carries the roof and the top's cladding.
      const out = edges.map(([a, b]) => beam([a[0], RING - 0.04, a[1]], [b[0], RING - 0.04, b[1]], 0.06, 0.08));
      // The rails the cladding is fixed to, at the windows' sills and heads; across the door, its head instead.
      for (const y of [SILL, HEAD])
        for (const [a, b] of edges) {
          const front = a[1] > z0 - 0.01 && b[1] > z0 - 0.01;
          if (front && Math.min(a[0], b[0]) < E + D && Math.max(a[0], b[0]) > E) {
            const lo = Math.min(a[0], b[0]);
            const hi = Math.max(a[0], b[0]);
            if (hi > E + D) out.push(beam([E + D, y, z0], [hi, y, z0], 0.05));
            if (lo < E) out.push(beam([lo, y, z0], [E, y, z0], 0.05));
            continue;
          }
          out.push(beam([a[0], y, a[1]], [b[0], y, b[1]], 0.05));
        }
      out.push(beam([E, FLOOR + POD.doorLeaf.h + 0.04, z0], [E + D, FLOOR + POD.doorLeaf.h + 0.04, z0], 0.05));
      return out;
    }),
    roof: part('roof', () => {
      // Bows across the ring at each post and at the ends, and three purlins along, welded flush with them.
      const out: BufferGeometry[] = [];
      const zb = HW - BOW_IN;
      for (const x of [C, ...stations(L), L - C]) out.push(beam([x, RING + 0.04, -zb], [x, RING + 0.04, zb], 0.06, 0.08));
      for (const z of [-0.75, 0, 0.75]) out.push(beam([0.6, RING + 0.04, z], [L - 0.6, RING + 0.04, z], 0.05, 0.07));
      return out;
    }),
  };
}

/**
 * Where the frame is welded, a group at a time (the scene's sparks,
 * developer, 2026-11-10: "a minute spark that lets user understand it is
 * welded"): the posts at their feet on the chassis, the ring at the posts'
 * heads, the bows where they sit on the ring. Along the pod from the head
 * end, front and back in turn.
 */
export interface Welds {
  posts: V3[];
  rails: V3[];
  roof: V3[];
}

export function podWelds(L: number): Welds {
  const z0 = HW - IN;
  const posts: V3[] = [];
  const rails: V3[] = [];
  for (const x of stations(L)) for (const z of [z0, -z0]) posts.push([x, KICK + 0.01, z]);
  for (const [x, z] of endPosts()) for (const xx of [x, L - x]) posts.push([xx, KICK + 0.01, z]);
  for (const [x, , z] of posts) rails.push([x, RING - 0.08, z]);
  const zb = HW - BOW_IN;
  const roof: V3[] = [];
  for (const x of [C, ...stations(L), L - C]) for (const z of [zb, -zb]) roof.push([x, RING, z]);
  const order = (a: V3, b: V3) => a[0] - b[0] || b[2] - a[2];
  return { posts: posts.sort(order), rails: rails.sort(order), roof: roof.sort(order) };
}

/* ------------------------------------------------------------------ */
/* The services under the floor, and the floor                         */
/* ------------------------------------------------------------------ */

/** The floor's boards on the joists, and the plumbing under them. */
export interface ServiceParts {
  deck: BufferGeometry;
  plumbing: BufferGeometry;
}

const SERVICE = { board: '#b9b3a8', drain: '#c9cdd1', cold: '#4f7ea8', hot: '#b0574a', cap: '#6f7377' };

/** Where the plumbing runs: the drain, the cold and the hot supply, along the pod under the floor, at the back (the bathroom's side). */
export const PIPES = { drain: { y: KICK - 0.11, z: -0.55, r: 0.055 }, cold: { y: KICK - 0.07, z: -0.9 }, hot: { y: KICK - 0.07, z: -0.8 } } as const;

export function podServices(L: number): ServiceParts {
  const key = `pod-layer-services-v2-${L}`;
  return {
    deck: memo(`${key}-deck`, () => join([prep(plate(ring(L, 0.1), FLOOR - 0.04, FLOOR), SERVICE.board)])),
    plumbing: memo(`${key}-plumbing`, () => {
      const out: BufferGeometry[] = [];
      // Fixed under the floor, in the open kicker's reach: the drain, the cold and the hot supply; up into the core's bathroom, each capped at the floor for its fitting.
      out.push(prep(tube('x', 0.7, L - 0.7, [PIPES.drain.y, PIPES.drain.z], PIPES.drain.r), SERVICE.drain));
      out.push(prep(tube('x', 0.7, L - 0.7, [PIPES.cold.y, PIPES.cold.z], 0.018), SERVICE.cold));
      out.push(prep(tube('x', 0.7, L - 0.7, [PIPES.hot.y, PIPES.hot.z], 0.018), SERVICE.hot));
      const zb = -(HW - 0.165);
      // The shower's and the WC's drains, the basin's supplies (as the bathroom's fixtures stand, podFurniture).
      for (const [x, z] of [
        [E + 0.53, zb + 0.45],
        [E + 1.39, zb + 0.3],
      ] as P2[]) {
        out.push(prep(tube('z', PIPES.drain.z, z, [x, PIPES.drain.y], 0.04), SERVICE.drain));
        out.push(prep(tube('y', PIPES.drain.y, FLOOR + 0.02, [x, z], 0.04), SERVICE.drain));
        out.push(prep(new CylinderGeometry(0.05, 0.05, 0.02, 12).translate(x, FLOOR + 0.022, z), SERVICE.cap));
      }
      // The basin's supplies: up in the back wall's cavity, out through its panel at the basin's height (the hot under the cold where they cross).
      const zc = -(HW - 0.14);
      for (const [x, c, run, dy] of [
        [E + 1.98, SERVICE.cold, PIPES.cold.z, 0],
        [E + 2.1, SERVICE.hot, PIPES.hot.z, -0.045],
      ] as [number, string, number, number][]) {
        const y = PIPES.cold.y + dy;
        out.push(prep(tube('z', run, zc, [x, y], 0.012), c));
        out.push(prep(tube('y', y, FLOOR + 0.5, [x, zc], 0.012), c));
        out.push(prep(tube('z', zc, zb + 0.035, [x, FLOOR + 0.5], 0.012), c));
        out.push(prep(new BoxGeometry(0.035, 0.035, 0.02).translate(x, FLOOR + 0.5, zb + 0.04), SERVICE.cap));
      }
      return join(out);
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Walls in layers: the insulation, its barrier, the panels            */
/* ------------------------------------------------------------------ */

/**
 * A wall layer all round the pod, `u0` to `u1` in from the skin's face and
 * `y0` to `y1` high, open where the skin is: the windows, the door, the
 * frosted window, the glazed ends (or, on the 12 m, the balcony).
 */
function wallLayer(L: number, u0: number, u1: number, y0: number, y1: number): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  const rect = (x0: number, x1: number, ya: number, yb: number, s: 1 | -1) => {
    if (x1 - x0 < 0.01 || yb - ya < 0.01) return;
    const za = s * (HW - u1);
    const zb = s * (HW - u0);
    out.push(slab(x0, x1, ya, yb, Math.min(za, zb), Math.max(za, zb)));
  };
  const m = podBays(L);
  const { w, sill, head } = POD.win;
  const { w: qw, sill: qs, head: qh } = POD.frost;
  for (const s of [1, -1] as const) {
    // The door bay: over the door in front; round the frosted window behind.
    if (s > 0) rect(E, E + D, FLOOR + POD.doorLeaf.h + 0.06, y1, s);
    else {
      const qx = E + (D - qw) / 2;
      rect(E, qx, y0, y1, s);
      rect(qx + qw, E + D, y0, y1, s);
      rect(qx, qx + qw, y0, qs, s);
      rect(qx, qx + qw, qh, y1, s);
    }
    for (let k = 0; k < m; k++) {
      const bx = bayAt(k);
      if (!isWindowBay(k)) {
        rect(bx, bx + B, y0, y1, s);
        continue;
      }
      const wx = bx + (B - w) / 2;
      rect(bx, wx, y0, y1, s);
      rect(wx + w, bx + B, y0, y1, s);
      rect(wx, wx + w, y0, sill, s);
      rect(wx, wx + w, head, y1, s);
    }
  }
  // An end module's sides round its window, and the bands round its glazed end under the glass and over it.
  const end = (balcony: boolean): BufferGeometry[] => {
    const before = out.length;
    for (const s of [1, -1] as const) {
      const from = balcony ? BAL : XS;
      rect(from, E - JAMB, y0, SILL, s);
      rect(from, E - JAMB, HEAD, y1, s);
      rect(E - JAMB, E, y0, y1, s);
    }
    if (!balcony) {
      const path = fillet(
        [
          [XS, HW],
          [C, HW],
          [0, HW - C],
          [0, -(HW - C)],
          [C, -HW],
          [XS, -HW],
        ],
        ROUND,
      );
      out.push(sweep(path, [1.5, 0], rectProf(-u1, -u0, y0, SILL)));
      out.push(sweep(path, [1.5, 0], rectProf(-u1, -u0, HEAD, y1)));
    }
    return out.splice(before);
  };
  out.push(...end(false));
  out.push(...end(podBalcony(L)).map((g) => mirror(g, L)));
  return out;
}

/** The insulation: rockwool in the walls and over the ceiling, and the fire barrier outside it. */
export interface InsulationParts {
  rockwool: BufferGeometry;
  barrier: BufferGeometry;
  /** The roof's own: over the ceiling between the bows, and the barrier over the bows. */
  rockwoolRoof: BufferGeometry;
  barrierRoof: BufferGeometry;
}

export function podInsulation(L: number): InsulationParts {
  const key = `pod-layer-insulation-v3-${L}`;
  return {
    rockwool: memo(`${key}-rockwool`, () => join(wallLayer(L, 0.035, 0.13, KICK, RING).map((g) => prep(g)))),
    barrier: memo(`${key}-barrier`, () => join(wallLayer(L, 0.024, 0.032, KICK, RING).map((g) => prep(g)))),
    rockwoolRoof: memo(`${key}-rockwool-roof`, () => join([prep(plate(ring(L, 0.13), CEIL + 0.015, ROOF_WOOL))])),
    barrierRoof: memo(`${key}-barrier-roof`, () => join([prep(plate(ring(L, BOW_IN), RING + 0.08, RING + 0.09))])),
  };
}

/* ------------------------------------------------------------------ */
/* The interior panels, their wiring, and the rooms                    */
/* ------------------------------------------------------------------ */

const ROOM = { lining: '#cdb79a', partition: '#ece9e2', floor: '#a07a55', ceiling: '#d8d3c9', sanitary: '#f1f0ec' };
const WIRE = { conduit: '#d0762a', box: '#e4e2dc', junction: '#8d9194', board: '#f1f0ec' };
/** The rooms' furniture by its finish (podPlan.ts ROOM_FINISH): the colours the glass's rooms are drawn in. */
const FINISH_COLOUR = ['', '#7a5034', '#e6e3dc', '#c4bba9', '#8f6750', '#e2ded6', '#3f2e22', '#d8d5ce', '#f6e7c8', '#151515', '#7c6146'];

/**
 * The interior panels round the inside (developer, 2026-11-09: "for
 * interior walls it can use any interior wall panels to make it look nice
 * from the inner side"), the core's partitions round the bathroom and the
 * entry (draft section 3), and the floor's finish. The ceiling's panels are
 * apart (`podPanels`): the plans' 3D shows the rooms from above without them.
 */
export function podLining(L: number): BufferGeometry {
  return memo(`pod-layer-lining-v4-${L}`, () => {
    const out: BufferGeometry[] = wallLayer(L, 0.15, 0.165, FLOOR, CEIL).map((g) => prep(g, ROOM.lining));
    out.push(prep(plate(ring(L, 0.165), FLOOR, FLOOR + 0.012), ROOM.floor));
    const zb = -(HW - 0.165);
    const part = (x0: number, x1: number, z0: number, z1: number) => out.push(prep(slab(x0, x1, FLOOR, CEIL, z0, z1), ROOM.partition));
    const zEnd = HW - 0.165 - 0.95;
    part(E - 0.04, E + 0.04, zb, zEnd);
    part(E + POD_CORE - 0.04, E + POD_CORE + 0.04, zb, zEnd);
    const zf = -HW + 1.75;
    part(E + 0.04, E + 1.0, zf - 0.04, zf + 0.04);
    part(E + 1.75, E + POD_CORE - 0.04, zf - 0.04, zf + 0.04);
    return join(out);
  });
}

/**
 * The points the plan needs and the wiring is laid to (ours, CONFIRM;
 * notes Y): a light in the middle of each room's ceiling (the bedroom or
 * office or kitchen at the head end, the bathroom, the entry, one or two in
 * the far room by its length, the 12 m's balcony), the board on the front
 * wall of the entry by the door, a switch by the way into each room on the
 * front wall, and sockets under the windows of the head room and the far
 * room. The rest of the plan's points (by the bed, over the counter) are on
 * the back wall: their wiring is in its panels, out of the picture.
 */
export function wiringPlan(L: number) {
  const a = E + POD_CORE;
  const balcony = podBalcony(L);
  const b = balcony ? L - BAL : L - 0.12;
  const n = b - a > 3.6 ? 2 : 1;
  const lights: number[] = [1.5, ...Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 0.5)) / n)];
  if (balcony) lights.push(L - BAL / 2);
  const farEnd = Math.min(b, L - XS) - 0.3;
  const farSockets: number[] = [];
  for (let x = a + 0.45; x < farEnd - 0.1; x += 1.4) farSockets.push(x);
  return {
    /** Ceiling lights along the middle, the trunk's run (x). */
    lights,
    /** The bathroom's and the entry's lights, off the trunk (x, z). */
    bath: [E + 1.2, -0.62] as P2,
    entry: [E + 1.55, 0.8] as P2,
    /** The board (x), and the front wall's drops: the head room's switch, the entry's, the far room's (x). */
    board: E + 1.72,
    drops: { head: E - 0.15, entry: E + 1.12, far: a - 0.15 },
    /** Socket runs under the windows (from, to) and their sockets (x). */
    headRun: [XS + 0.3, E - 0.15] as P2,
    headSockets: [XS + 0.5, (XS + E) / 2 + 0.25],
    farRun: [a - 0.15, farEnd] as P2,
    farSockets,
  };
}

/** The interior panels as the film puts them in: the walls with the floor's finish, and the ceiling; the wiring on each. */
export interface PanelParts {
  walls: BufferGeometry;
  ceiling: BufferGeometry;
  wallWiring: BufferGeometry;
  ceilingWiring: BufferGeometry;
}

export function podPanels(L: number): PanelParts {
  const key = `pod-layer-panels-v1-${L}`;
  const zw = HW - WIRE_IN;
  const plan = wiringPlan(L);
  const conduit = (g: BufferGeometry) => prep(g, WIRE.conduit);
  /** A box on the back of a wall panel, in the cavity: what a switch or a socket is fitted to from the room. */
  const backBox = (x: number, y: number, w = 0.075, h = 0.075, c = WIRE.box) => prep(new BoxGeometry(w, h, 0.03).translate(x, y, zw + 0.003), c);
  return {
    walls: podLining(L),
    ceiling: memo(`${key}-ceiling`, () => join([prep(plate(ring(L, 0.15), CEIL, CEIL + 0.015), ROOM.ceiling)])),
    wallWiring: memo(`${key}-wall-wiring`, () => {
      const out: BufferGeometry[] = [];
      const v = (x: number, y0: number, y1: number) => out.push(conduit(tube('y', y0, y1, [x, zw], WIRE_R, 8)));
      const h = (x0: number, x1: number, y: number) => out.push(conduit(tube('x', x0, x1, [y, zw], WIRE_R, 8)));
      const { drops, board, headRun, farRun } = plan;
      // The head room: down by its way in to its switch, on to the sockets under its window.
      v(drops.head, SOCKET, WIRE_Y);
      out.push(backBox(drops.head, SWITCH));
      h(headRun[0], headRun[1], SOCKET);
      for (const x of plan.headSockets) out.push(backBox(x, SOCKET));
      // The entry's switch by the door.
      v(drops.entry, SWITCH, WIRE_Y);
      out.push(backBox(drops.entry, SWITCH));
      // The board: the supply up from under the floor, its circuits up to the ceiling.
      const bh = 0.45;
      v(board - 0.08, FLOOR, BOARD - bh / 2);
      v(board + 0.08, BOARD + bh / 2, WIRE_Y);
      v(board - 0.08, BOARD + bh / 2, WIRE_Y);
      out.push(backBox(board, BOARD, 0.36, bh, WIRE.board));
      // The far room: its switch, and the sockets under its windows.
      v(drops.far, SOCKET, WIRE_Y);
      out.push(backBox(drops.far, SWITCH));
      h(farRun[0], farRun[1], SOCKET);
      for (const x of plan.farSockets) out.push(backBox(x, SOCKET));
      return join(out);
    }),
    ceilingWiring: memo(`${key}-ceiling-wiring`, () => {
      const out: BufferGeometry[] = [];
      const { lights, bath, entry, drops, board } = plan;
      // The trunk along the middle, from the head room's light to the last; a box at each light.
      out.push(conduit(tube('x', lights[0], lights[lights.length - 1], [WIRE_Y, 0], WIRE_R, 8)));
      const box = (x: number, z: number) => out.push(prep(new BoxGeometry(0.11, 0.05, 0.11).translate(x, CEIL + 0.04, z), WIRE.junction));
      for (const x of lights) box(x, 0);
      // Off it: the bathroom's and the entry's lights, and the runs to the front wall's drops and the board.
      for (const [x, z] of [bath, entry]) {
        out.push(conduit(tube('z', 0, z, [x, WIRE_Y], WIRE_R, 8)));
        box(x, z);
      }
      for (const x of [drops.head, drops.entry, drops.far, board - 0.08, board + 0.08]) out.push(conduit(tube('z', 0, zw, [x, WIRE_Y], WIRE_R, 8)));
      return join(out);
    }),
  };
}

/** The plan's furniture in its rooms (podInterior), and the core's fixtures: shower, WC, basin, the entry's wardrobe. For the plans' 3D. */
export function podFurniture(L: number, layout: PodLayout): BufferGeometry {
  return memo(`pod-layer-furniture-v1-${L}-${layout}`, () => {
    const out: BufferGeometry[] = podInterior(L, L, layout).pieces.map(([x0, y0, z0, x1, y1, z1, finish]) =>
      prep(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), FINISH_COLOUR[finish] || ROOM.partition),
    );
    const zb = -(HW - 0.165);
    const fix = (x0: number, x1: number, y1: number, z0: number, z1: number, c = ROOM.sanitary) =>
      out.push(prep(new BoxGeometry(x1 - x0, y1, z1 - z0).translate((x0 + x1) / 2, FLOOR + y1 / 2, (z0 + z1) / 2), c));
    fix(E + 0.08, E + 0.98, 0.05, zb, zb + 0.9);
    fix(E + 1.15, E + 1.63, 0.42, zb, zb + 0.65);
    fix(E + 1.78, E + 2.3, 0.85, zb, zb + 0.48);
    fix(E + 1.7, E + 2.3, 2.1, -HW + 1.87, -HW + 2.57, FINISH_COLOUR[5]);
    return join(out);
  });
}

/** Everything of the layers for a length, built ahead of its turn (film/prefetch.ts). */
export function preparePodLayers(L: number) {
  podFrame(L);
  podServices(L);
  podInsulation(L);
  podPanels(L);
}
