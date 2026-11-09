/**
 * The capsule home (POD), as the developer set it out on 2026-11-08 and
 * 2026-11-09 (notes W; `.claude/pod-draft.md`): the market's usual capsule,
 * a galvanised steel frame with rockwool, a lining and the usual fit-out,
 * whose one innovation is its skin: 20 mm TRC panels made with RTARIUM by
 * HEMISPHERE ONE, fixed as their stud-frame cladding is. The same on both
 * long sides and at both ends (mirrored). It grows by panels added in the
 * middle ("increase in length, introduce new panels in here"): two end
 * modules, a door bay, and one, three or five middle bays for 8, 10 or
 * 12 m. The electrics run in the roof band, the plumbing in the kicker at
 * the base ("we don't cover the bottom as we cover the top").
 *
 * The form follows the developer's four reference pages (layout and style
 * only): a box whose plan corners are cut at 45°, a roof band with a cut
 * edge all round, a panoramic window at each end that wraps round the cut
 * corners onto the glazed end, the door between them, a grid of panel
 * joints. Every size here is ours unless the developer gave it: CONFIRM
 * (notes W).
 *
 * No three.js in here: the opening card's row (row.ts), the phone's
 * framings and the drawings read it; kit/pod.tsx draws it. Metres; x along
 * the pod from its head end (0) to its length, z across it (+z the front,
 * the door's side), y up from the ground.
 */

import { podDefault, podLengths, type PodLengthM } from '../../data/pod';

export const POD = {
  /** Outside width, wall face to wall face (the references' 3050). */
  W: 3.05,
  /** Plan corners cut at 45°, this much each way. */
  chamfer: 0.6,
  /** An end module: the cut corners, the glazed end and the panoramic window on each side. */
  end: 3.0,
  /** The door bay, and a middle bay: a panel's width. */
  door: 1.0,
  bay: 1.0,
  /*
   * Heights from the ground. The end modules stand on feet; under the
   * middle the base is left open behind a kicker set back from the face.
   * The floor inside is at FLOOR; the ceiling at 2.9 leaves a room 2.4 m
   * high, and the roof band covers the void over it, where the electrics
   * run. The references give 3050 overall; ours is 3.2 for that room
   * (CONFIRM, notes W).
   */
  feet: 0.2,
  kick: 0.48,
  floor: 0.5,
  wallTop: 2.8,
  bandFace: 3.02,
  top: 3.2,
  /** How far the roof band's cut edge steps in at the top. */
  bandCut: 0.18,
  /** The end modules' skirts: their foot is cut in this much. */
  skirtCut: 0.1,
  /** How far the kicker stands back from the wall face. */
  kickBack: 0.16,
  /** The panoramic windows: sill, head, and the cut of their inner corners. */
  sill: 0.82,
  head: 2.5,
  cut: 0.55,
  /** How far a panoramic window stops short of the door bay. */
  jamb: 0.3,
  /** The 12 m's balcony at its far end (the draft's plan, notes W3): this much of its end module, open under the roof band. */
  balcony: 1.4,
  /** A window bay's window: a rounded rectangle in the middle of its panel. */
  win: { w: 0.7, sill: 0.95, head: 2.33, r: 0.12 },
  /** The bathroom's frosted window in the door bay on the back: high, for privacy. */
  frost: { w: 0.62, sill: 1.78, head: 2.5 },
  /** The entrance door. */
  doorLeaf: { w: 0.95, h: 2.15 },
  /** TRC panel: 20 mm (RTARIUM's own: the 10 mm mesh, 5 mm of cover each side); and the joint between two. */
  skin: 0.02,
  joint: 0.014,
  /** The precast steps at the door: risers and goings, and their width. */
  steps: { rise: 0.165, going: 0.29, w: 1.2 },
  /** Feet under the end modules: in from each end, in from each side. */
  feetAt: { x: 0.95, z: 0.55 },
} as const;

/** The three lengths (developer, 2026-11-08), and the one shown first (2026-11-09: "by default it will be in 10m"); data/pod.ts. */
export const POD_LENGTHS = podLengths;
export type PodLength = PodLengthM;
export const POD_DEFAULT: PodLength = podDefault;

/** Has this length the balcony at its far end? The 12 m, as both its layouts have it in the draft. */
export const podBalcony = (length: number) => length >= 12;

/** Middle bays for a length: 1, 3 or 5. */
export const podBays = (length: number) => Math.round((length - 2 * POD.end - POD.door) / POD.bay);

/**
 * Which middle bays carry a window, counted from the door. The same index
 * is the same panel in every length, so going from one length to another
 * only adds or takes away panels at the far end of the middle.
 */
export const POD_WINDOW_BAYS = [2, 3] as const;
export const isWindowBay = (k: number) => (POD_WINDOW_BAYS as readonly number[]).includes(k);

/** Where middle bay k begins. */
export const bayAt = (k: number) => POD.end + POD.door + k * POD.bay;

/** The core: bathroom at the back, entry in front, just past the door (draft W3). */
export const POD_CORE = 2.4;

/**
 * How much farther a camera that shows one pod stands for a length, as a
 * factor of its distance: 1 up to the 10 m it is framed for, more for the
 * 12 m, so that it stays whole beside the words. The 8 m is not brought
 * nearer: it is to look shorter.
 */
export const podReach = (length: number) => Math.max(1, 1 + (length - POD_DEFAULT) * 0.065);

/**
 * The interior behind the glass, after the draft's plans (`.claude/pod-draft.md`
 * section 3, drawn in `.claude/review/pod-draft.html`; developer, 2026-11-09:
 * "why it is different when interior just follows the floor plan"): one room
 * a zone, the same through every window. The bedroom behind the head end
 * (layout A of the 8 and 10 m, B of the 12 m): the bed against the back wall,
 * its foot to the front, a nightstand with its lamp, the wardrobe against the
 * core's wall. The core (bathroom and entry) has no clear glass. The far room
 * by length: the 8 m's lounge (sofa, table, floor lamp); the 10 m's kitchen
 * and lounge (counter and wall cupboards, a bar with its pendant, sofa and
 * table); the 12 m's bedroom and lounge, which ends at the balcony's glazed
 * wall (bed, nightstand and lamp, sofa and table). Sizes are the draft's, which
 * are ours; where its drawing overlapped two pieces (the 8 m's pantry and
 * sofa; the 10 m's bar, sofa and table) one was left out or moved. In the
 * pod's own space: x from the head end, y up from the ground, z to the front.
 */
export const POD_PIECES = 24;
/** The pieces' finishes, as the room shader colours them (kit/materials.ts, planFinish). */
export const ROOM_FINISH = { wood: 1, linen: 2, cushion: 3, fabric: 4, white: 5, dark: 6, stone: 7, glow: 8, black: 9, art: 10 } as const;
/** A piece: its box (x0, y0, z0, x1, y1, z1), its finish and its room (1 the bedroom, 0 the far room). */
export type PodPiece = [number, number, number, number, number, number, number, 0 | 1];
export interface PodInterior {
  pieces: PodPiece[];
  bed: { lo: V3; hi: V3; lamp: V3 };
  live: { lo: V3; hi: V3; lamp: V3 };
}
type V3 = [number, number, number];

/** `plan`: the length whose layout is shown; `end`: where its far end stands as drawn (the two differ while it changes). */
export function podInterior(plan: number, end: number): PodInterior {
  const F = POD.floor;
  const zb = -(POD.W / 2 - 0.12);
  const top = 2.9;
  const pieces: PodPiece[] = [];
  const { wood, linen, cushion, fabric, white, dark, stone, glow, black, art } = ROOM_FINISH;
  const add = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, finish: number, room: 0 | 1) => {
    pieces.push([x0, F + y0, z0, x1, F + y1, z1, finish, room]);
  };
  // A bed against the back wall, its foot to the front: headboard, base, mattress, pillows.
  const bed = (x0: number, room: 0 | 1) => {
    add(x0, 0, zb, x0 + 1.6, 1.0, zb + 0.07, wood, room);
    add(x0, 0, zb + 0.07, x0 + 1.6, 0.3, zb + 2.0, wood, room);
    add(x0 + 0.03, 0.3, zb + 0.08, x0 + 1.57, 0.52, zb + 1.97, linen, room);
    add(x0 + 0.15, 0.52, zb + 0.12, x0 + 1.45, 0.64, zb + 0.5, cushion, room);
  };
  /** A nightstand and its lamp; where the lamp's light is. */
  const nightstand = (x0: number, room: 0 | 1): V3 => {
    add(x0, 0, zb, x0 + 0.3, 0.48, zb + 0.4, dark, room);
    add(x0 + 0.05, 0.56, zb + 0.1, x0 + 0.25, 0.78, zb + 0.3, glow, room);
    return [x0 + 0.15, F + 0.67, zb + 0.2];
  };
  const picture = (x0: number, x1: number, room: 0 | 1) => {
    add(x0, 1.2, zb, x1, 1.8, zb + 0.014, black, room);
    add(x0 + 0.03, 1.23, zb, x1 - 0.03, 1.77, zb + 0.018, art, room);
  };
  // A sofa against the back wall: seat, back and two arms.
  const sofa = (x0: number, room: 0 | 1) => {
    add(x0, 0, zb, x0 + 1.9, 0.42, zb + 0.8, fabric, room);
    add(x0, 0.42, zb, x0 + 1.9, 0.85, zb + 0.2, fabric, room);
    add(x0, 0.42, zb + 0.2, x0 + 0.16, 0.62, zb + 0.8, fabric, room);
    add(x0 + 1.74, 0.42, zb + 0.2, x0 + 1.9, 0.62, zb + 0.8, fabric, room);
  };
  const table = (x0: number, room: 0 | 1) => add(x0, 0, zb + 1.05, x0 + 0.9, 0.42, zb + 1.5, dark, room);

  // The bedroom behind the head end.
  bed(0.45, 1);
  picture(0.85, 1.65, 1);
  const bedLamp = nightstand(0.12, 1);
  add(2.35, 0, zb, 2.88, 2.2, zb + 1.3, white, 1);

  // The far room, from the core's wall to the far end (or the balcony's glazed wall).
  const a = POD.end + POD_CORE;
  const balcony = podBalcony(plan);
  const b = balcony ? end - POD.balcony : end;
  let liveLamp: V3;
  if (plan < 9) {
    sofa(a + 0.25, 0);
    table(a + 0.7, 0);
    picture(a + 0.75, a + 1.65, 0);
    add(a + 2.3, 0, zb + 0.15, a + 2.33, 1.35, zb + 0.18, black, 0);
    add(a + 2.17, 1.3, zb + 0.02, a + 2.46, 1.6, zb + 0.31, glow, 0);
    liveLamp = [a + 2.31, F + 1.45, zb + 0.17];
  } else if (plan < 11) {
    add(a + 0.2, 0, zb, a + 2.2, 0.86, zb + 0.6, dark, 0);
    add(a + 0.18, 0.86, zb, a + 2.22, 0.9, zb + 0.62, stone, 0);
    add(a + 0.2, 1.5, zb, a + 2.2, 2.2, zb + 0.35, white, 0);
    add(a + 2.3, 0, zb + 0.9, a + 2.75, 0.98, zb + 2.25, wood, 0);
    add(a + 2.28, 0.98, zb + 0.88, a + 2.77, 1.02, zb + 2.27, stone, 0);
    add(a + 2.4, 1.75, zb + 1.45, a + 2.65, 1.95, zb + 1.7, glow, 0);
    add(a + 2.52, 1.95, zb + 1.57, a + 2.53, 2.4, zb + 1.58, black, 0);
    liveLamp = [a + 2.525, F + 1.7, zb + 1.575];
    sofa(b - 2.05, 0);
    table(b - 1.6, 0);
    picture(b - 1.5, b - 0.6, 0);
  } else {
    bed(a + 0.15, 0);
    picture(a + 0.55, a + 1.35, 0);
    liveLamp = nightstand(a + 1.8, 0);
    sofa(b - 2.3, 0);
    table(b - 1.85, 0);
  }
  return {
    pieces: pieces.slice(0, POD_PIECES),
    bed: { lo: [0.12, F, zb], hi: [POD.end, top, -zb], lamp: bedLamp },
    live: { lo: [a, F, zb], hi: [balcony ? b : end - 0.12, top, -zb], lamp: liveLamp },
  };
}

/** Its box on its own plan (x0, x1, z0, z1, height), centred on its length as it is drawn: the steps in front, the feet under it. */
export const podBox = (length: number): [number, number, number, number, number] => [
  -length / 2,
  length / 2,
  -POD.W / 2,
  POD.W / 2 + Math.ceil(POD.floor / POD.steps.rise) * POD.steps.going * 0.75,
  POD.top,
];
