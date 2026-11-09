/**
 * The prefab building's plan (developer, 2026-11-07: "our current prefab
 * i.e g+1 should not exist. the current way of prefab is g+2 ... mostly the
 * factory made panels placed in the site ... with space for windows and
 * doors ... institutions, schools, health centers ... also steps and decks
 * like modular arrangements"). A G+2 block of precast wall panels: each
 * floor's walls are storey-high panels with their openings cast in, the
 * front ones a classroom's door and two windows each six metres; floor
 * slabs between; a roof slab over the building and its galleries, with a
 * parapet. An open gallery along the front of each upper floor on precast
 * columns, one outer staircase at the left flank (the access rule's own,
 * build/model.ts), and at the ground a deck along the front with one flight
 * of steps at a door. Raw precast grey, its joints showing.
 *
 * The panels' real length is not stated anywhere on the site (the
 * developer: "don't mention that any where, just for your info").
 *
 * No three.js in here: the opening card's row (row.ts) and the framings
 * (kit/frame.ts) read it; kit/prefab.tsx draws it.
 */
import { GALLERY_D, STAIR, layoutAddOns, type Stair, type Unit } from '../../build/model';

export const PREFAB = {
  /** A wall panel along the front or the back, and how many floors. */
  panel: 12,
  storey: 3,
  floors: 3,
  /** Front to back, wall face to wall face. */
  depth: 6,
  /** The ground floor's level over the ground: the plinth and the deck. */
  plinth: 0.45,
  gallery: GALLERY_D,
  wall: 0.2,
  slab: 0.22,
  parapet: 0.9,
  /** What is left open between two panels: the joint. */
  joint: 0.03,
  /** The steps at the deck: risers and treads. */
  rise: 0.15,
  tread: 0.3,
} as const;

/** The building's length for a number of panels along the front. */
export const prefabLength = (bays: number) => bays * PREFAB.panel;

/** The roof slab's top, over the building's own ground line. */
export const PREFAB_ROOF = PREFAB.plinth + PREFAB.floors * PREFAB.storey + PREFAB.slab;

/** Its box on its own plan (x0, x1, z0, z1, height): the stair at the left flank, the gallery and the steps at the front, up to the parapet. */
export const prefabBox = (bays: number): [number, number, number, number, number] => [
  -prefabLength(bays) / 2 - STAIR.w - 0.35,
  prefabLength(bays) / 2 + 0.15,
  -PREFAB.depth / 2 - 0.1,
  PREFAB.depth / 2 + PREFAB.gallery + 3 * PREFAB.tread + 0.05,
  PREFAB_ROOF + PREFAB.parapet,
];

/** On the opening card, two panels long: it stands in a row with the house and the capsule. */
export const PREFAB_ROW_BAYS = 2;

/**
 * The outer staircase, where the access rule puts it for this footprint
 * (CLAUDE.md: one dog-leg beside the building, against its flank; never
 * placed by hand): the building as turned Shell As three metres wide, six
 * deep, three floors, in the plot's own metres (x 0 to its length, z 0 to
 * 6). Its landings meet the two galleries.
 */
const stairs = new Map<number, Stair | null>();
export function prefabStair(bays: number): Stair | null {
  let stair = stairs.get(bays);
  if (stair === undefined) {
    const n = Math.round(prefabLength(bays) / 3);
    const units: Unit[] = [];
    for (let y = 0; y < PREFAB.floors; y++) for (let i = 0; i < n; i++) units.push({ id: y * n + i + 1, t: 'A', x: i, z: 0, y, r: 1 });
    const s = layoutAddOns(units, new Set(), 0, [], 0).stairs[0];
    const levels = Array.from({ length: PREFAB.floors - 1 }, (_, k) => PREFAB.plinth + (k + 1) * PREFAB.storey);
    stair = s ? { ...s, levels, open: levels.map(() => true) } : null;
    stairs.set(bays, stair);
  }
  return stair;
}

export interface Opening {
  /** Centre along the panel, its width, its sill over the panel's foot, its height. */
  x: number;
  w: number;
  sill: number;
  h: number;
  door?: boolean;
}

const DOOR = { w: 1.05, sill: 0.04, h: 2.15 } as const;
const WIN = { w: 1.5, sill: 0.95, h: 1.4 } as const;
const HIGH = { w: 1.2, sill: 1.05, h: 1.3 } as const;

/** A front panel: two rooms of six metres, each a door near its left end and two windows. */
export const FRONT_OPENINGS: Opening[] = [-6, 0].flatMap((left) => [
  { x: left + 0.95, ...DOOR, door: true },
  { x: left + 2.95, ...WIN },
  { x: left + 4.85, ...WIN },
]);
/** A back panel: three windows a room. */
export const BACK_OPENINGS: Opening[] = [-6, 0].flatMap((left) => [1.2, 3, 4.8].map((x) => ({ x: left + x, ...HIGH })));
/** An end panel: one window. */
export const END_OPENINGS: Opening[] = [{ x: 0, ...HIGH }];

/** Where the steps come down from the deck: at the front door nearest the middle. */
export function prefabStepsX(bays: number) {
  const L = prefabLength(bays);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < bays; i++)
    for (const o of FRONT_OPENINGS)
      if (o.door) {
        const x = -L / 2 + PREFAB.panel / 2 + i * PREFAB.panel + o.x;
        if (Math.abs(x) < bestD) {
          bestD = Math.abs(x);
          best = x;
        }
      }
  return best;
}
