/**
 * The modular system. Everything spatial on the site derives from this file:
 * the 3D scenes, the catalogue isometrics and the plans.
 */

/** Grid cell in metres. Shell B is one cell, Shell A is two. */
export const CELL = 3;
/** Module height in metres. */
export const STOREY = 3;

export type ModuleType = 'A' | 'B';
/** The face of a shell that carries its one door. `none`: it is reached through the shell beside it. */
export type DoorFace = 'front' | 'left' | 'right' | 'back' | 'none';
/**
 * Where the door stands along each face, in metres from the shell's centre
 * (x on the front and back, z on the ends). The front position is measured
 * on the client's single-shell model (notes H8).
 */
export const DOOR_AT: Record<ModuleType, Record<Exclude<DoorFace, 'none'>, number>> = {
  A: { front: 1.715, back: 1.715, left: -0.55, right: 0.55 },
  B: { front: 0.72, back: 0.72, left: -0.4, right: 0.4 },
};

export interface Placement {
  t: ModuleType;
  /** Grid coordinates of the module's minimum corner. y is the storey. */
  x: number;
  y: number;
  z: number;
  /** 1 turns Shell A so its 6 m side runs along z. */
  r?: 0 | 1;
}

export const shells = {
  A: { name: 'Shell A', size: [6, 3, 3] as const, label: '6 m × 3 m × 3 m', sqft: 200, sqm: 18 },
  B: { name: 'Shell B', size: [3, 3, 3] as const, label: '3 m × 3 m × 3 m', sqft: 100, sqm: 9 },
} as const;

/** Cells covered on plan: [cellsX, cellsZ]. */
export function span(p: Placement): [number, number] {
  if (p.t === 'B') return [1, 1];
  return p.r ? [1, 2] : [2, 1];
}

export function sqm(list: Placement[]): number {
  return list.reduce((s, p) => s + shells[p.t].sqm, 0);
}

const A = (x: number, z: number, y = 0, r: 0 | 1 = 0): Placement => ({ t: 'A', x, y, z, r });
const B = (x: number, z: number, y = 0): Placement => ({ t: 'B', x, y, z });

/**
 * Brief, step 2.2: the footprint counter. Areas are the brief's nominal
 * sq.ft. figures; `sqm` is the true module area.
 * Slots are [A0, A1, A2, A3, B0]; null = module not in this footprint.
 */
export interface Footprint {
  sqft: number;
  recipe: string;
  slots: [Placement | null, Placement | null, Placement | null, Placement | null, Placement | null];
}

export const footprints: Footprint[] = [
  { sqft: 300, recipe: 'A + B', slots: [A(0, 0), null, null, null, B(2, 0)] },
  { sqft: 400, recipe: '2 × A', slots: [A(0, 0), A(0, 1), null, null, null] },
  { sqft: 500, recipe: '2 × A + B', slots: [A(0, 0), A(0, 1), null, null, B(2, 1)] },
  // From here the shells stand side by side, short end to the street: the row grows by a shell at a time into the 800.
  { sqft: 600, recipe: '3 × A', slots: [A(0, 0, 0, 1), A(1, 0, 0, 1), A(2, 0, 0, 1), null, null] },
  { sqft: 700, recipe: '3 × A + B', slots: [A(0, 0, 0, 1), A(1, 0, 0, 1), A(2, 0, 0, 1), null, B(3, 1)] },
  { sqft: 800, recipe: '4 × A', slots: [A(0, 0, 0, 1), A(1, 0, 0, 1), A(2, 0, 0, 1), A(3, 0, 0, 1), null] },
];

/**
 * Brief, step 2.3: three stacked configurations. Massing studies, not designs.
 * Ground floor is the 800 sq.ft. footprint so the stack grows out of step 2.2.
 * All three are presets of the configurator. "How it works" shows two of
 * them (client, 2026-10-09: "let us remove The Apartment", and the
 * five-floor block is a mid-rise, not a high-rise): `film`.
 */
export interface Stack {
  id: 'villa' | 'apartment' | 'midrise';
  name: string;
  floors: string;
  description: string;
  idealFor: string;
  modules: Placement[];
  film: boolean;
}

const row = (y: number, from = 0, to = 4) =>
  Array.from({ length: to - from }, (_, i) => A(from + i, 0, y, 1));

export const stacks: Stack[] = [
  {
    id: 'villa',
    name: 'The Villa',
    floors: 'Ground + terrace level',
    description: 'One roofed residential floor and an expansive flat open terrace.',
    idealFor: 'Vacation home seekers, suburb living and farmhouses.',
    modules: [...row(0), ...row(1, 0, 2)],
    film: true,
  },
  {
    id: 'apartment',
    name: 'The Apartment',
    floors: '2 floors',
    description: 'A two-floor apartment with a stair lobby module and a shared upper terrace.',
    idealFor: 'Urban infill, multi-family investors and co-living spaces.',
    modules: [...row(0), ...row(1), B(4, 0, 0), B(4, 0, 1), B(4, 0, 2)],
    film: false,
  },
  {
    id: 'midrise',
    name: 'Mid-Rise Apartment',
    floors: '5 floors',
    description: 'A five-floor complex with lobbies, cantilevered balconies and a penthouse terrace.',
    idealFor: 'Commercial developers, student housing and high-density real estate.',
    modules: [
      ...row(0),
      ...row(1),
      ...row(2),
      ...row(3),
      ...row(4, 0, 2),
      B(4, 0, 0),
      B(4, 0, 1),
      B(4, 0, 2),
      B(4, 0, 3),
      B(4, 0, 4),
    ],
    film: true,
  },
];

/** The stacks "How it works" shows, in the order it shows them. */
export const filmStacks = stacks.filter((s) => s.film);
