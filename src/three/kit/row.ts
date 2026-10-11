/**
 * The opening card's three kinds of building, as an arrangement: where the
 * capsule home and the prefab building stand beside the farm set's house
 * (client, 2026-10-09: "one system, many buildings" is shown by three
 * objects, a modular home, a capsule home and a prefab building, to one
 * scale). No three.js and no React in here: the camera is fitted to it
 * (rowfit.ts) and the scene draws it (sets.tsx).
 *
 * Since the client's second brief of 2026-10-11 ("back to one another, in
 * diagonal form", with a reference picture) the three stand parallel and
 * one behind another on a diagonal, back to back: the capsule behind the
 * house and a slab to its right, the block behind the capsule and farther
 * right. Seen on the diagonal too, they stand side by side across the
 * screen, each showing its front and one end: the house nearest and
 * largest, the block farthest.
 *
 * One arrangement does not suit every screen. On a wide one they are seen
 * from eye level, as in the reference. Where the picture has more height
 * than that fills, the camera rises and the block moves along behind the
 * house, so the three climb the screen instead of leaving it empty. `s`, 0
 * to 1.5, is how far that has gone; which `s` a screen gets is decided by
 * trying them (rowfit.ts). The places come from trying every place on the
 * floor's joints for the largest house whose neighbours are not dwarfed
 * (notes O).
 */

export type P3 = [number, number, number];

/**
 * The house stands a little turned towards the low sun (client, 2026-10-07),
 * so its steps point out into the meadow. Everything that belongs to the
 * house turns with it, and on the card so do the other two and the floor's
 * slabs.
 */
export const FARM_YAW = -0.24;
/**
 * The camera's bearing on the three. The house stands at the left of the
 * picture and the stage's lens looks well to the right of the middle
 * (HeroScene, focus), so the house is seen some 25° more from its side than
 * the bearing says: from here, about as the reference has it, front and
 * end, and near enough as the film's first shot sees it (SETS.farm, 25°),
 * so the way to that shot is a move round the house and no turn of it.
 */
export const ROW_AZ = 0.17;

export interface Row {
  capsule: { at: P3; turn: number; feet: number };
  prefab: { at: P3; turn: number; bays: number };
  /** Each one's place on the floor and how far its shadow is kept (x, z, from, to), for the bare floor of the opening. */
  spots: [number, number, number, number][];
  /** The corners of each one's box, in the set's metres: what the camera frames. House, capsule, block. */
  hull: P3[][];
  /** How tall each stands, in metres: what its size on the screen is told by. */
  heights: [number, number, number];
  /** The camera's bearing on the three: azimuth from +z towards +x and elevation, radians. */
  view: { az: number; el: number };
}

/** The card's block: two floors of four bays, the brief's G+1 at a length that sits in a row with the other two. */
export const ROW_BAYS = 4;

type Box = [number, number, number, number, number];

/** A point on the house's own plan (x along it, z out of its front), as it lies in the set. */
export function onPlan(x: number, z: number): P3 {
  const c = Math.cos(FARM_YAW);
  const s = Math.sin(FARM_YAW);
  return [x * c + z * s, 0, -x * s + z * c];
}

/** Corners of a box given on a building's own plan (x0, x1, z0, z1, height), turned by `turn` and set at `at`. */
function hullOf(at: P3, turn: number, [x0, x1, z0, z1, h]: Box): P3[] {
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  const out: P3[] = [];
  for (const x of [x0, x1])
    for (const z of [z0, z1])
      for (const y of [0, h]) out.push([at[0] + x * c + z * sn, at[1] + y, at[2] - x * sn + z * c]);
  return out;
}

/** The house's box on its own plan: roof overhang, landing and steps included, up to the ridge. */
const HOUSE_BOX: Box = [-3.2, 3.25, -1.7, 3.25, 4.2];
/** The 20′ capsule's, steps included. */
const CAPSULE_BOX: Box = [-3.08, 3.08, -1.55, 2.2, 3.2];
/** The block's: its staircase stands against its left flank, its gallery along the front. */
const blockBox = (bays: number): Box => [-bays * 1.5 - 2.15, bays * 1.5 + 0.1, -3.05, 4.65, 6.2];

const mix = (p: number, q: number, t: number) => p + (q - p) * t;
/** To the floor's joints: the slabs are 3 m, laid from the house's own walls. */
const snap = (v: number, to: number, off = 0) => Math.round((v - off) / to) * to + off;

export function rowOf(capsule: P3, prefab: P3, view: Row['view']): Row {
  const bays = ROW_BAYS;
  const block = blockBox(bays);
  return {
    capsule: { at: capsule, turn: FARM_YAW, feet: 20 },
    prefab: { at: prefab, turn: FARM_YAW, bays },
    /*
     * The card's light is low: a shadow is kept for about its building's own
     * height beyond it and then let go, so none lies across the next
     * building's ground.
     */
    spots: [
      [0, 0, 6, 13],
      [capsule[0], capsule[2], 6, 12],
      [prefab[0], prefab[2], 12, 22],
    ],
    hull: [hullOf([0, 0, 0], FARM_YAW, HOUSE_BOX), hullOf(capsule, FARM_YAW, CAPSULE_BOX), hullOf(prefab, FARM_YAW, block)],
    heights: [HOUSE_BOX[4], CAPSULE_BOX[4], block[4]],
    view,
  };
}

/**
 * The three for a picture of a given shape: `s` 0 where it is wide and
 * low, 1 where it is taller than wide, up to 1.5 on a phone. Places are on
 * the house's own plan and on the floor's joints (walls on a joint, as the
 * house's are): the capsule 9 m behind the house and a slab to its right,
 * the block 34.5 m behind it and two slabs to the right; as `s` grows the
 * block moves across behind the house to its left, and the camera rises
 * from eye level to look down on them. `wide`, 0 to 3: the two behind
 * stand that many half slabs farther to the right, for a picture that has
 * width to spare (a low window, where the height is what limits them):
 * they then stand clear of each other instead of one before the other.
 */
export function rowFor(s: number, wide = 0): Row {
  const capsule = onPlan(snap(mix(3, 5, s), 1.5) + (wide > 1 ? 1.5 : 0), -9);
  const prefab = onPlan(snap(mix(6, -3, s), 1.5) + wide * 1.5, -34.5);
  return rowOf(capsule, prefab, { az: ROW_AZ, el: mix(0.012, 0.45, s) });
}
