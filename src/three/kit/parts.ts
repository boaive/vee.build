/**
 * Reusable geometry for the VEE.BUILD kit of parts. Every builder returns a
 * cached BufferGeometry in metres; a multi-material geometry documents its
 * group order.
 */
import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, SphereGeometry, TorusGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DOOR_AT, type DoorFace, type ModuleType } from '../../data/system';
import { box, cyl, memo, merge, mergeGroups } from './geometry';
import { boxUV } from './textures';

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

/** Module storey height and the parts of its section, in metres. */
export const MODULE = { H: 3, base: 0.14, fascia: 0.26, inset: 0.035 } as const;

type Face = 'front' | 'back' | 'left' | 'right';
export interface Opening {
  face: Face;
  /** Centre along the face (x on front/back, z on the ends). */
  u: number;
  w: number;
  sill: number;
  h: number;
  door?: boolean;
}

/*
 * Openings follow the client's single shell (notes H8), clear sizes inside
 * a 60 mm frame: on the 6 m front a two-pane window and, on the right
 * third, the door between two gridded sidelights, every head 2.1 m above
 * the underside; a clerestory on the +x end; a window and a small high
 * window on the back; the −x end blank.
 *
 * A shell has one door. It is on the front unless the front is built
 * against, in which case it moves to a free face (build/model.ts,
 * doorFaces): an end takes the door with a small window beside it, the
 * back takes it in line with where it stood on the front.
 */
const WINDOW = { sill: 0.94, h: 1.1 };
const DOOR = { w: 0.81, sill: 0.2, h: 1.84, door: true };
const HIGH = { sill: 2.06, h: 0.38 };

export function moduleOpenings(type: ModuleType, door: DoorFace = 'front'): Opening[] {
  const at = DOOR_AT[type];
  const o: Opening[] = [];
  if (type === 'A') {
    o.push({ face: 'front', u: -0.51, w: 1.38, ...WINDOW });
    if (door === 'front')
      o.push({ face: 'front', u: 0.95, w: 0.28, sill: 0.36, h: 1.68 }, { face: 'front', u: at.front, ...DOOR }, { face: 'front', u: 2.5, w: 0.3, sill: 0.36, h: 1.68 });
    else o.push({ face: 'front', u: 1.72, w: 1.38, ...WINDOW });
    o.push({ face: 'back', u: -0.6, w: 1.28, sill: 0.96, h: 1.08 }, { face: 'back', u: -2.325, w: 0.43, sill: 1.56, h: 0.53 });
    if (door === 'back') o.push({ face: 'back', u: at.back, ...DOOR });
    if (door === 'left') o.push({ face: 'left', u: at.left, ...DOOR }, { face: 'left', u: 0.75, w: 0.7, ...WINDOW });
    if (door === 'right') o.push({ face: 'right', u: at.right, ...DOOR }, { face: 'right', u: -0.75, w: 0.7, ...WINDOW });
    else o.push({ face: 'right', u: -0.4, w: 1.28, ...HIGH });
    return o;
  }
  if (door === 'front') o.push({ face: 'front', u: -0.62, w: 1.0, ...WINDOW }, { face: 'front', u: at.front, ...DOOR });
  else o.push({ face: 'front', u: 0, w: 1.5, ...WINDOW });
  if (door === 'back') o.push({ face: 'back', u: -0.62, w: 1.0, ...HIGH }, { face: 'back', u: at.back, ...DOOR });
  else o.push({ face: 'back', u: 0, w: 1.28, ...HIGH });
  if (door === 'left') o.push({ face: 'left', u: at.left, ...DOOR });
  if (door === 'right') o.push({ face: 'right', u: at.right, ...DOOR });
  else o.push({ face: 'right', u: 0, w: 1.28, ...HIGH });
  return o;
}

/**
 * Finished module. Origin: centre of the footprint, underside at y = 0.
 * Groups: 0 shell, 1 fascia (base recess, roof band, handles), 2 glass,
 * 3 frames, door leaves and glazing bars, 4 galvanised fittings (hook &
 * cleat: a lifting lug at each top corner and cleats along the long roof
 * edges, after the client's model, notes H4). `door` is the face that
 * carries the shell's one door.
 */
export function moduleGeometry(type: ModuleType, door: DoorFace = 'front'): BufferGeometry {
  return memo(`module-v4-${type}-${door}`, () => {
    const L = type === 'A' ? 6 : 3;
    const D = 3;
    const { H, base, fascia: F, inset } = MODULE;
    const bodyH = H - base - F;
    const xf = L / 2 - inset;
    const zf = D / 2 - inset;

    const body = new RoundedBoxGeometry(L - inset * 2, bodyH, D - inset * 2, 2, 0.035);
    body.translate(0, base + bodyH / 2, 0);
    boxUV(body, 1.5);
    const roof = box(L - 0.06, 0.02, D - 0.06, 0, H + 0.005, 0);
    boxUV(roof, 1.5);
    const shell: BufferGeometry[] = [body, roof];
    const dark: BufferGeometry[] = [box(L - 0.44, base, D - 0.44, 0, base / 2, 0), box(L - 0.02, F, D - 0.02, 0, H - F / 2, 0)];
    const glass: BufferGeometry[] = [];
    const frames: BufferGeometry[] = [];
    const fittings: BufferGeometry[] = [];

    // A box on a face: (along, up, out) in face coordinates → world.
    const onFace = (f: Face, u: number, y: number, out: number, w: number, h: number, t: number) => {
      if (f === 'front') return box(w, h, t, u, y, zf + out);
      if (f === 'back') return box(w, h, t, u, y, -zf - out);
      if (f === 'right') return box(t, h, w, xf + out, y, u);
      return box(t, h, w, -xf - out, y, u);
    };

    const FT = 0.06; // frame bar
    for (const o of moduleOpenings(type, door)) {
      const cy = o.sill + o.h / 2;
      const bar = (u: number, y: number, w: number, h: number, out = 0.022) => frames.push(onFace(o.face, u, y, out, w, h, 0.05));
      bar(o.u, o.sill + o.h + FT / 2, o.w + FT * 2, FT);
      bar(o.u, o.sill - FT / 2, o.w + FT * 2, FT);
      bar(o.u - o.w / 2 - FT / 2, cy, FT, o.h);
      bar(o.u + o.w / 2 + FT / 2, cy, FT, o.h);
      if (o.door) {
        // Leaf: glazed upper half, a letterbox under it, two raised panels below (H8).
        frames.push(onFace(o.face, o.u, cy, 0.012, o.w, o.h, 0.03));
        glass.push(onFace(o.face, o.u, o.sill + o.h * 0.7, 0.03, o.w * 0.7, o.h * 0.5, 0.012));
        dark.push(onFace(o.face, o.u, o.sill + o.h * 0.385, 0.031, 0.26, 0.04, 0.012));
        for (const side of [-1, 1]) frames.push(onFace(o.face, o.u + side * o.w * 0.19, o.sill + o.h * 0.19, 0.034, o.w * 0.27, o.h * 0.27, 0.012));
        dark.push(onFace(o.face, o.u + o.w * 0.4, o.sill + 0.98, 0.05, 0.03, 0.17, 0.04));
      } else {
        glass.push(onFace(o.face, o.u, cy, 0.006, o.w, o.h, 0.012));
        if (o.w > 1.1) bar(o.u, cy, FT * 0.7, o.h);
        // Tall sidelights carry glazing bars (H6).
        if (o.w < 0.5 && o.h > 1.5) {
          for (let k = 1; k < 5; k++) bar(o.u, o.sill + (o.h * k) / 5, o.w, 0.02, 0.016);
          bar(o.u, cy, 0.02, o.h, 0.016);
        }
      }
    }

    // Hook: a tapered lug with an oblong eye, set diagonally on each top corner.
    const lug = lugGeometry();
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const g = lug.clone();
        // Plate faces out along the corner's diagonal.
        g.rotateY(Math.atan2(sx, sz));
        g.translate(sx * (L / 2 - 0.13), H + 0.012, sz * (D / 2 - 0.13));
        fittings.push(g, box(0.17, 0.012, 0.17, sx * (L / 2 - 0.13), H + 0.006, sz * (D / 2 - 0.13)));
        for (const k of [-1, 1]) fittings.push(cyl(0.011, 0.011, 0.05, 6, sx * (L / 2 - 0.13 - 0.1) + k * 0.03 * sz, H + 0.03, sz * (D / 2 - 0.13 - 0.1) - k * 0.03 * sx));
      }
    // Cleats: small blocks with two eyes, about a metre apart along the long edges.
    const cleat = cleatGeometry();
    const xs = type === 'A' ? [-2, -1, 0, 1, 2] : [-0.75, 0.75];
    for (const sz of [-1, 1])
      for (const x of xs) {
        const g = cleat.clone();
        g.translate(x, H + 0.012, sz * (D / 2 - 0.07));
        fittings.push(g);
      }

    return mergeGroups([shell, dark, glass, frames, fittings]);
  });
}

/** Corner lifting lug: a tapered plate with an oblong eye, 0.22 m tall. Origin at its base centre, plate in x–y. */
export function lugGeometry() {
  return memo('lug', () => {
    const s = new Shape();
    s.moveTo(-0.1, 0);
    s.lineTo(0.1, 0);
    s.lineTo(0.06, 0.17);
    s.quadraticCurveTo(0, 0.235, -0.06, 0.17);
    s.closePath();
    const eye = new Shape();
    eye.moveTo(-0.035, 0.1);
    eye.lineTo(0.035, 0.1);
    eye.quadraticCurveTo(0.052, 0.12, 0.035, 0.14);
    eye.lineTo(-0.035, 0.14);
    eye.quadraticCurveTo(-0.052, 0.12, -0.035, 0.1);
    s.holes.push(eye);
    const g = new ExtrudeGeometry(s, { depth: 0.024, bevelEnabled: false, curveSegments: 5 });
    g.translate(0, 0, -0.012);
    return g;
  });
}

/** Roof-edge cleat: a block with two small eyes. Origin at its base centre, long along x. */
export function cleatGeometry() {
  return memo('cleat', () => {
    const parts: BufferGeometry[] = [box(0.2, 0.045, 0.075, 0, 0.0225, 0)];
    for (const x of [-0.05, 0.05]) {
      const eye = new TorusGeometry(0.022, 0.006, 5, 10, Math.PI);
      eye.translate(x, 0.045, 0);
      parts.push(eye);
    }
    return merge(parts);
  });
}

/* ------------------------------------------------------------------ */
/* Site furniture                                                      */
/* ------------------------------------------------------------------ */

/** Handrail along a polyline on plan. Posts, top rail, mid rail. One material. */
export function railGeometry(key: string, pts: [number, number][], height = 1, spacing = 1.25): BufferGeometry {
  return memo(`rail-${key}`, () => {
    const parts: BufferGeometry[] = [];
    const post = (x: number, z: number) => parts.push(box(0.045, height, 0.045, x, height / 2, z));
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const n = Math.max(1, Math.round(len / spacing));
      for (let k = 0; k < n; k++) post(x0 + (dx * k) / n, z0 + (dz * k) / n);
      const along = Math.abs(dx) > Math.abs(dz);
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      for (const y of [height - 0.02, height * 0.52]) {
        parts.push(along ? box(len + 0.045, 0.04, 0.05, mx, y, mz) : box(0.05, 0.04, len + 0.045, mx, y, mz));
      }
    }
    const [lx, lz] = pts[pts.length - 1];
    post(lx, lz);
    return merge(parts);
  });
}

/** Straight flight climbing along +x from the origin. Groups: 0 treads, 1 stringers. */
export function stairGeometry(key: string, width: number, rise: number, run: number, steps: number): BufferGeometry {
  return memo(`stair-${key}`, () => {
    const treads: BufferGeometry[] = [];
    const dr = rise / steps;
    const dx = run / steps;
    for (let i = 0; i < steps; i++) treads.push(box(dx * 0.92, 0.05, width, dx * (i + 0.5), dr * (i + 1) - 0.025, 0));
    const len = Math.hypot(rise, run);
    const ang = Math.atan2(rise, run);
    const stringers = [-1, 1].map((s) => {
      const g = box(len, 0.2, 0.05);
      g.rotateZ(ang);
      g.translate(run / 2, rise / 2 - 0.1, (s * width) / 2);
      return g;
    });
    return mergeGroups([treads, stringers]);
  });
}

/** Maquette tree: a ball on a stick, about 1 unit tall. Scale per instance. */
export function treeGeometry(): BufferGeometry {
  return memo('tree', () => {
    const crown = new SphereGeometry(0.34, 12, 9);
    crown.translate(0, 0.72, 0);
    return merge([cyl(0.022, 0.03, 0.5, 6, 0, 0.25, 0), crown]);
  });
}

/* ------------------------------------------------------------------ */
/* Foundation (after the client's model, notes H1–H3; layout C2)       */
/* ------------------------------------------------------------------ */

/**
 * Precast footing and L plinth dimensions from the client's model:
 * pedestal 0.3 m square, its top 300 / 600 / 900 mm above ground with
 * 220 mm below; L plinth pieces 1425 mm on the 6 m side and 1350 mm on the
 * 3 m side. Pad, collar and toe sizes are read off the images (illustrative).
 */
export const FOUNDATION = {
  heights: [0.3, 0.6, 0.9] as const,
  pedestal: 0.3,
  below: 0.22,
  collar: 0.42,
  collarH: 0.1,
  slopeH: 0.15,
  padH: 0.15,
  /** Pad reach from the pedestal centre: toward the building and away from it. */
  reach: 0.79,
  back: 0.21,
  piece6: 1.425,
  piece3: 1.35,
  wall: 0.12,
  toe: 0.32,
  /** Screw jack between pedestal and shell. */
  jack: 0.1,
} as const;

/** Pad reach from the pedestal centre on each side (−x, +x, −z, +z). */
export interface Reach {
  nx: number;
  px: number;
  nz: number;
  pz: number;
}

/** A closed box-like hull from a bottom rectangle at y0 to a top rectangle at y1. */
function hull(b: [number, number, number, number], t: [number, number, number, number], y0: number, y1: number) {
  const [bx0, bz0, bx1, bz1] = b;
  const [tx0, tz0, tx1, tz1] = t;
  const v = [
    [bx0, y0, bz0],
    [bx1, y0, bz0],
    [bx1, y0, bz1],
    [bx0, y0, bz1],
    [tx0, y1, tz0],
    [tx1, y1, tz0],
    [tx1, y1, tz1],
    [tx0, y1, tz1],
  ];
  const quads = [
    [0, 1, 2, 3], // bottom
    [7, 6, 5, 4], // top
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [3, 7, 4, 0],
  ];
  const pos: number[] = [];
  for (const [a, b2, c, d] of quads) for (const i of [a, b2, c, a, c, d]) pos.push(...v[i]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Precast footing (H1): pad, sloped top, collar, pedestal. Origin: pedestal
 * centre at ground level. Pedestal top at `above`. The pad reaches `reach`
 * from the pedestal: eccentric at an outside corner, wider where shells
 * share it (a combined footing).
 */
export function footingGeometry(above: number, reach: Reach): BufferGeometry {
  const key = `footing-${above}-${reach.nx}-${reach.px}-${reach.nz}-${reach.pz}`;
  return memo(key, () => {
    const F = FOUNDATION;
    const yPedBase = -F.below;
    const yCollar = yPedBase - F.collarH;
    const ySlope = yCollar - F.slopeH;
    const yPad = ySlope - F.padH;
    const c = F.collar / 2;
    const pad: [number, number, number, number] = [-reach.nx, -reach.nz, reach.px, reach.pz];
    const parts = [
      box(pad[2] - pad[0], F.padH, pad[3] - pad[1], (pad[0] + pad[2]) / 2, yPad + F.padH / 2, (pad[1] + pad[3]) / 2),
      hull(pad, [-c, -c, c, c], ySlope, yCollar),
      box(F.collar, F.collarH, F.collar, 0, yCollar + F.collarH / 2, 0),
      box(F.pedestal, above + F.below, F.pedestal, 0, yPedBase + (above + F.below) / 2, 0),
    ].map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      n.deleteAttribute('uv');
      return n;
    });
    const g = merge(parts);
    boxUV(g, 1);
    return g;
  });
}

/** Pad reach for a footing serving the given quadrants around a grid point (+x+z, −x+z, −x−z, +x−z). */
export function footingReach(q: [boolean, boolean, boolean, boolean]): Reach {
  const F = FOUNDATION;
  const px = q[0] || q[3];
  const nx = q[1] || q[2];
  const pz = q[0] || q[1];
  const nz = q[2] || q[3];
  const side = (here: boolean, there: boolean) => (here && there ? 0.6 : here ? F.reach : F.back);
  return { px: side(px, nx), nx: side(nx, px), pz: side(pz, nz), nz: side(nz, pz) };
}

/**
 * L plinth run (H2) along x, centred on the edge line at ground level.
 * The upstand sits on the line; the toe reaches toward +z (under the
 * building), or both ways where two shells share the edge. Split into
 * precast pieces of `piece` metres with 10 mm joints.
 */
export function plinthGeometry(length: number, above: number, piece: number, both = false): BufferGeometry {
  const key = `plinth-${length.toFixed(3)}-${above}-${piece}-${both ? 2 : 1}`;
  return memo(key, () => {
    const F = FOUNDATION;
    const t = F.wall / 2;
    const y0 = -F.below;
    const s = new Shape();
    // Profile in (z, y); the extrusion runs along x.
    if (both) {
      s.moveTo(-t - F.toe, y0);
      s.lineTo(t + F.toe, y0);
      s.lineTo(t + F.toe, y0 + 0.12);
      s.lineTo(t + 0.08, y0 + 0.12);
      s.lineTo(t, y0 + 0.2);
      s.lineTo(t, above);
      s.lineTo(-t, above);
      s.lineTo(-t, y0 + 0.2);
      s.lineTo(-t - 0.08, y0 + 0.12);
      s.lineTo(-t - F.toe, y0 + 0.12);
    } else {
      s.moveTo(-t, y0);
      s.lineTo(t + F.toe, y0);
      s.lineTo(t + F.toe, y0 + 0.12);
      s.lineTo(t + 0.08, y0 + 0.12);
      s.lineTo(t, y0 + 0.2);
      s.lineTo(t, above);
      s.lineTo(-t, above);
    }
    s.closePath();
    const n = Math.max(1, Math.round(length / piece));
    const each = length / n;
    const parts: BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const g = new ExtrudeGeometry(s, { depth: each - 0.01, bevelEnabled: false });
      // Extruded along +z with the profile in x–y; a quarter turn runs it along −x with the toe at +z.
      g.rotateY(-Math.PI / 2);
      g.translate(-length / 2 + (i + 1) * each - 0.005, 0, 0);
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    const g = merge(parts);
    boxUV(g, 1);
    return g;
  });
}

/** Screw jack, fixed part: base plate and threaded sleeve. Origin at the plate's underside. */
export function jackBaseGeometry(): BufferGeometry {
  return memo('jack-base-v2', () => {
    const parts = [box(0.22, 0.014, 0.22, 0, 0.007, 0), cyl(0.032, 0.036, 0.05, 12, 0, 0.039, 0)];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(cyl(0.009, 0.009, 0.012, 6, sx * 0.085, 0.02, sz * 0.085));
    return merge(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
}

/** Screw jack, moving part: threaded rod and U-head plate. Head plate top at y = 0. */
export function jackScrewGeometry(): BufferGeometry {
  return memo('jack-screw-v2', () => {
    const parts: BufferGeometry[] = [cyl(0.022, 0.022, 0.1, 10, 0, -0.06, 0), box(0.18, 0.012, 0.18, 0, -0.006, 0)];
    for (const sz of [-1, 1]) parts.push(box(0.18, 0.035, 0.01, 0, 0.0175, sz * 0.085));
    for (let i = 0; i < 9; i++) parts.push(cyl(0.026, 0.026, 0.004, 10, 0, -0.022 - i * 0.009, 0));
    return merge(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
}

/** Screw jack nut with its two turning handles. Origin at its centre. */
export function jackNutGeometry(): BufferGeometry {
  return memo('jack-nut-v2', () => {
    const nut = cyl(0.048, 0.048, 0.028, 6);
    const handles = [-1, 1].map((s) => {
      const h = cyl(0.007, 0.007, 0.075, 6);
      h.rotateZ(Math.PI / 2);
      h.translate(s * 0.08, 0, 0);
      return h;
    });
    return merge([nut, ...handles].map((g) => (g.index ? g.toNonIndexed() : g)));
  });
}

/* ------------------------------------------------------------------ */
/* Hook & cleat (after the client's model, notes H4)                   */
/* ------------------------------------------------------------------ */

/**
 * One top corner's fittings, corner at the origin, body towards −x/−z:
 * the lifting lug set on the diagonal, its base plate, and the nearest
 * roof-edge cleat. Groups: 0 plate and cleat, 1 lug.
 */
export function hookCleatGeometry(): BufferGeometry {
  return memo('hook-cleat-v2', () => {
    const lug = lugGeometry().clone();
    lug.rotateY(Math.PI / 4);
    lug.translate(-0.13, 0.012, -0.13);
    const cleat = cleatGeometry().clone();
    cleat.translate(-1.0, 0.012, -0.07);
    const plate = box(0.17, 0.012, 0.17, -0.13, 0.006, -0.13);
    return mergeGroups([[plate.toNonIndexed(), cleat.index ? cleat.toNonIndexed() : cleat], [lug.index ? lug.toNonIndexed() : lug]]);
  });
}

/* ------------------------------------------------------------------ */
/* Wall panels                                                         */
/* ------------------------------------------------------------------ */

/**
 * A wall panel in the x–y plane with an optional opening, thickness along z,
 * centred on z. Origin bottom-centre.
 */
export function panelGeometry(
  w: number,
  h: number,
  t: number,
  opening?: { w: number; h: number; sill: number; x?: number },
): BufferGeometry {
  const key = `panel-${w}-${h}-${t}-${opening ? `${opening.w}-${opening.h}-${opening.sill}-${opening.x ?? 0}` : 'solid'}`;
  return memo(key, () => {
    if (!opening) return box(w, h, t, 0, h / 2, 0);
    const s = new Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.closePath();
    const ox = opening.x ?? 0;
    const hole = new Shape();
    const y0 = Math.max(opening.sill, 0.001);
    hole.moveTo(ox - opening.w / 2, y0);
    hole.lineTo(ox - opening.w / 2, y0 + opening.h);
    hole.lineTo(ox + opening.w / 2, y0 + opening.h);
    hole.lineTo(ox + opening.w / 2, y0);
    hole.closePath();
    s.holes.push(hole);
    const g = new ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
    return g;
  });
}

/**
 * 36′ (10.97 m) precast wall panel with a window band. Origin bottom-centre,
 * outer face towards +z. Groups: 0 panel, 1 glass.
 */
export function wallPanel36Geometry(): BufferGeometry {
  return memo('wall-panel-36', () => {
    const W = 10.9;
    const H = 3.5;
    const glass: BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) glass.push(box(1.9, 1.75, 0.03, -W / 2 + 1.55 + i * 2.6, 1.95, 0.115));
    return mergeGroups([[box(W, H, 0.22, 0, H / 2, 0)], glass]);
  });
}

/* ------------------------------------------------------------------ */
/* Capsule pod                                                         */
/* ------------------------------------------------------------------ */

/** Flat pane with rounded corners in the x–y plane, 0.07 thick, front face at z = +0.07. */
function roundedPane(w: number, h: number, r: number): BufferGeometry {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 6 });
}

/** Capsule pod body of a given length. Origin bottom-centre. Groups: 0 body, 1 glass, 2 feet. */
export function podGeometry(length: number): BufferGeometry {
  return memo(`pod-${length}`, () => {
    const H = 2.55;
    const D = 2.7;
    const body = new RoundedBoxGeometry(length, H, D, 6, 0.62);
    body.translate(0, 0.3 + H / 2, 0);
    const win = roundedPane(Math.max(1.2, length * 0.56), 1.08, 0.22);
    win.translate(0, 0.3 + H / 2, D / 2 - 0.05);
    const port = roundedPane(1.2, 1.0, 0.22);
    port.rotateY(Math.PI / 2);
    port.translate(length / 2 - 0.05, 0.3 + H / 2, 0);
    const feet = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => cyl(0.07, 0.09, 0.34, 10, sx * (length / 2 - 0.75), 0.17, sz * (D / 2 - 0.55))),
    );
    return mergeGroups([[body], [win, port], feet]);
  });
}

/* ------------------------------------------------------------------ */
/* Roof options                                                        */
/* ------------------------------------------------------------------ */

/** Mono-pitch roof wedge: length along x, falls towards +z. Origin at centre of base. */
export function slopedRoofGeometry(length: number, depth: number, rise: number, eave = 0.08): BufferGeometry {
  return memo(`roof-${length}-${depth}-${rise}-${eave}`, () => {
    const s = new Shape();
    s.moveTo(-depth / 2, 0);
    s.lineTo(depth / 2, 0);
    s.lineTo(depth / 2, eave);
    s.lineTo(-depth / 2, rise);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(length / 2, 0, 0);
    return g;
  });
}
