/**
 * The shell in the three parts the client names (2026-10-09): structural
 * frame, insulated panels, micro concrete. One description of it, in metres
 * from the middle of its underside, for every scene that puts a shell
 * together part by part: "Componentized building" (section 3), where each
 * piece arrives on its own, and the factory (section 7), where the same
 * pieces arrive a stage at a time. The client's instruction for the factory
 * (2026-10-10) is that sections 3.2 and 3.3 are the source of truth for the
 * frame: so both are drawn from this file.
 *
 * The frame: a ring at the floor with its joists, a column at each corner
 * with a lifting hook on its head, and a ring at the top on the four sides
 * with nothing across the middle (developer, 2026-10-10).
 * The openings are the standard shell's (parts.ts, moduleOpenings).
 */
import type { BufferGeometry } from 'three';
import type { DoorFace } from '../../data/system';
import { box, memo, merge } from './geometry';
import { joineryGeometry, lugGeometry, moduleOpenings, wallGeometry, type Hole } from './parts';
import { boxUV } from './textures';

type V3 = [number, number, number];
type Face = 'front' | 'back' | 'left' | 'right';

export const SHELL = {
  L: 6,
  /** Floor top, foot of the wall panels, roof underside, roof top under the concrete, top of the concrete: above the underside. */
  floor: 0.14,
  foot: 0.22,
  roofUnder: 2.86,
  roofTop: 3.06,
  top: 3.11,
  /** Wall height from the floor's top. */
  wall: 2.72,
  /** The frame's ring at the top; the wall panels stand up to its underside. */
  ring: 0.12,
  /** Insulated panel and concrete coat, as drawn. */
  eps: 0.12,
  coat: 0.035,
  /** A wall panel's width along the long sides, and along the ends. */
  bay: 0.96,
  endBay: 0.92,
  /** Where the walls' faces stand for the joinery: just behind the face of the concrete. */
  face: { x: 3.0, z: 1.5 },
  /** Outer faces of the concrete. */
  outer: { x: 3.035, z: 1.535 },
} as const;

const PANEL_H = SHELL.roofTop - SHELL.ring - SHELL.foot;
/** Middle of the b-th of the six bays along the shell. */
export const bayX = (b: number) => -2.4 + b * SHELL.bay;

/* ------------------------------------------------------------------ */
/* Structural frame                                                    */
/* ------------------------------------------------------------------ */

export interface FrameMember {
  key: string;
  kind: 'joist' | 'ring' | 'column' | 'hook' | 'top';
  /** A box of this size; a hook is the kit's lifting lug instead. */
  size?: V3;
  pos: V3;
  rotY?: number;
  /** The side of the shell it stands on (−1, 0, 1 along x and z). */
  side: [number, number];
}

/** Every member of the frame, where it stands. */
export function frameMembers(): FrameMember[] {
  const { L, floor, roofTop, ring } = SHELL;
  const out: FrameMember[] = [];
  for (let k = 0; k < 9; k++) out.push({ key: `joist${k}`, kind: 'joist', size: [0.07, 0.06, 2.84], pos: [-2.8 + k * 0.7, 0.03, 0], side: [0, 0] });
  for (const sz of [-1, 1]) out.push({ key: `ring-l${sz}`, kind: 'ring', size: [L - 0.08, 0.14, 0.1], pos: [0, 0.07, sz * 1.45], side: [0, sz] });
  for (const sx of [-1, 1]) out.push({ key: `ring-s${sx}`, kind: 'ring', size: [0.1, 0.14, 2.8], pos: [sx * 2.95, 0.07, 0], side: [sx, 0] });
  const col = roofTop - floor;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      out.push({ key: `column${sx}${sz}`, kind: 'column', size: [0.1, col, 0.1], pos: [sx * 2.95, floor + col / 2, sz * 1.45], side: [sx, sz] });
      // The hook: a lug on the column's head, set on the corner's diagonal.
      out.push({ key: `hook${sx}${sz}`, kind: 'hook', pos: [sx * 2.92, roofTop, sz * 1.42], rotY: Math.atan2(sx, sz), side: [sx, sz] });
    }
  // The top ring, between the columns' heads: four sides, nothing across the middle.
  for (const sz of [-1, 1]) out.push({ key: `top-l${sz}`, kind: 'top', size: [L - 0.2, ring, 0.1], pos: [0, roofTop - ring / 2, sz * 1.45], side: [0, sz] });
  for (const sx of [-1, 1]) out.push({ key: `top-s${sx}`, kind: 'top', size: [0.1, ring, 2.8], pos: [sx * 2.95, roofTop - ring / 2, 0], side: [sx, 0] });
  return out;
}

/** Where the four lifting hooks stand: the heads of the corner columns. */
export const HOOKS: V3[] = frameMembers()
  .filter((m) => m.kind === 'hook')
  .map((m) => m.pos);

export type FrameStage = 'floor' | 'columns' | 'top' | 'hooks';
const STAGE_OF: Record<FrameMember['kind'], FrameStage> = { joist: 'floor', ring: 'floor', column: 'columns', top: 'top', hook: 'hooks' };

/** The frame in the stages it goes up in, each as one piece: the floor's ring and joists, the four columns, the top ring, the four hooks. */
export function frameGeometry(stage: FrameStage): BufferGeometry {
  return memo(`shell-frame-${stage}`, () =>
    merge(
      frameMembers()
        .filter((m) => STAGE_OF[m.kind] === stage)
        .map((m) => {
          if (m.size) return box(...m.size, ...m.pos);
          const g = lugGeometry().clone();
          g.rotateY(m.rotY ?? 0);
          g.translate(...m.pos);
          return g;
        }),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Walls: insulated panels and the concrete over them                  */
/* ------------------------------------------------------------------ */

export interface WallBay {
  key: string;
  face: Face;
  width: number;
  /** The middle of the panel's foot. */
  pos: V3;
  rotY: number;
  /** The way the wall faces. */
  out: V3;
  /** The shell's openings that fall in this bay: x from its middle, heights from the shell's underside. */
  cut: Hole[];
  /** Its place in the order the panels go in: the front's six, the back's six, the ends' three and three. */
  order: number;
}

/** The outer walls, a bay at a time, with the standard shell's openings cut in them. */
export function wallBays(door: DoorFace = 'front'): WallBay[] {
  const openings = moduleOpenings('A', door);
  const out: WallBay[] = [];
  const add = (key: string, face: Face, centre: number, width: number, pos: V3, rotY: number, dir: V3, order: number) => {
    // A place along a face, as the bay's own x.
    const along = (u: number) => (rotY ? -(u - centre) : u - centre);
    const cut = openings
      .filter((o) => o.face === face)
      .map((o) => {
        const a = along(o.u - o.w / 2);
        const b = along(o.u + o.w / 2);
        return { x0: Math.min(a, b), x1: Math.max(a, b), y0: o.sill, y1: o.sill + o.h };
      })
      .filter((h) => h.x1 > -width / 2 && h.x0 < width / 2);
    out.push({ key, face, width, pos, rotY, out: dir, cut, order });
  };
  const { bay, endBay, foot } = SHELL;
  for (let b = 0; b < 6; b++) add(`ext-f${b}`, 'front', bayX(b), bay, [bayX(b), foot, 1.44], 0, [0, 0, 1], b);
  for (let b = 0; b < 6; b++) add(`ext-b${b}`, 'back', bayX(b), bay, [bayX(b), foot, -1.44], 0, [0, 0, -1], 6 + b);
  for (let b = 0; b < 3; b++) {
    const z = -endBay + b * endBay;
    add(`ext-r${b}`, 'right', z, endBay, [2.94, foot, z], Math.PI / 2, [1, 0, 0], 12 + b);
    add(`ext-l${b}`, 'left', z, endBay, [-2.94, foot, z], Math.PI / 2, [-1, 0, 0], 15 + b);
  }
  return out;
}

/** A bay's insulated panel. Origin: the middle of its foot. */
export const epsPanel = (w: WallBay) =>
  wallGeometry(
    w.width - 0.012,
    PANEL_H,
    SHELL.eps,
    w.cut.map((h) => ({ ...h, y0: h.y0 - SHELL.foot, y1: h.y1 - SHELL.foot })),
  );
/** The coat of concrete on a bay's outer face, floor edge to roof edge, with the same openings left in it. Origin: the middle of its foot, at the shell's underside. */
export const coatPanel = (w: WallBay) => wallGeometry(w.width, SHELL.roofTop, SHELL.coat, w.cut);
/** Where that coat stands. */
export const coatAt = (w: WallBay): V3 => [w.pos[0] + w.out[0] * (SHELL.eps / 2 + SHELL.coat / 2), 0, w.pos[2] + w.out[2] * (SHELL.eps / 2 + SHELL.coat / 2)];

/** The thinner panels inside: where they stand (x), and where their doorway is (from their middle). */
export const PARTITIONS = [
  { x: -1.8, door: 0.72 },
  { x: 1.3, door: -0.6 },
] as const;
export const partitionPanel = (p: (typeof PARTITIONS)[number]) => wallGeometry(2.74, SHELL.wall - 0.16, 0.06, [{ x0: p.door - 0.39, x1: p.door + 0.39, y0: 0, y1: 2.04 }]);

const placed = (g: BufferGeometry, rotY: number, at: V3) => {
  const c = g.clone();
  if (rotY) c.rotateY(rotY);
  c.translate(...at);
  return c;
};

/** One face's insulated panels, standing in their bays, as one piece (the joints between them show). */
export function epsWallGeometry(face: Face, door: DoorFace = 'front'): BufferGeometry {
  return memo(`shell-eps-${face}-${door}`, () =>
    merge(
      wallBays(door)
        .filter((w) => w.face === face)
        .map((w) => placed(epsPanel(w), w.rotY, w.pos)),
    ),
  );
}

/** The insulated floor, in its six segments on the joists, with the two partitions standing on it: one piece. */
export function epsFloorGeometry(): BufferGeometry {
  return memo('shell-eps-floor', () => {
    const parts: BufferGeometry[] = [];
    for (let b = 0; b < 6; b++) parts.push(box(SHELL.bay - 0.02, 0.08, 2.7, bayX(b), 0.1, 0));
    for (const p of PARTITIONS) parts.push(placed(partitionPanel(p), Math.PI / 2, [p.x, SHELL.foot, 0]));
    return merge(parts);
  });
}

/** The insulated roof, in six segments inside the top ring: one piece. */
export function epsRoofGeometry(): BufferGeometry {
  return memo('shell-eps-roof', () => merge(Array.from({ length: 6 }, (_, b) => box(SHELL.bay - 0.02, 0.16, 2.78, bayX(b), SHELL.roofUnder + 0.11, 0))));
}

/**
 * The concrete of the four walls, with the standard shell's openings left
 * in it, and of the corners where two walls meet: one piece. It is a wall's
 * thickness of concrete round the shell and nothing inside it.
 */
export function castWallsGeometry(door: DoorFace = 'front'): BufferGeometry {
  return memo(`shell-cast-walls-${door}`, () => {
    const parts = wallBays(door).map((w) => placed(coatPanel(w), w.rotY, coatAt(w)));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const c = box(0.17, SHELL.roofTop, 0.17, sx * 2.95, SHELL.roofTop / 2, sz * 1.45);
        boxUV(c, 1);
        parts.push(c);
      }
    return merge(parts);
  });
}

/** The concrete over the roof, as one slab. Origin: the middle of its underside, on the roof's top. */
export function castRoofGeometry(): BufferGeometry {
  return memo('shell-cast-roof', () => {
    const g = box(SHELL.L + 0.1, 0.05, 3.14, 0, 0.025, 0);
    boxUV(g, 1);
    return g;
  });
}

/** The standard shell's door, panes and frames for the faces that have any, where this shell's walls stand. Groups as joineryGeometry: dark, glass, frames. */
export function shellJoinery(door: DoorFace = 'front'): { face: Face; geo: BufferGeometry; out: V3 }[] {
  const OUT: Record<Face, V3> = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0] };
  const list: { face: Face; geo: BufferGeometry; out: V3 }[] = [];
  for (const face of ['front', 'back', 'right', 'left'] as const) {
    const geo = joineryGeometry('A', door, face, SHELL.face.x, SHELL.face.z);
    if (geo) list.push({ face, geo, out: OUT[face] });
  }
  return list;
}
