/**
 * Section 5. Names, areas and bed/bath/floor counts are from the VEE.BUILD
 * brief. Module compositions are derived from the system (Shell A = 200,
 * Shell B = 100 sq.ft. nominal) — CONFIRM with the client.
 *
 * Room layouts exist only where a supplied drawing supports them (01–03,
 * from the reference layouts in assets/). 04 and 05 show a neutral module
 * plan until drawings are supplied (notes A9).
 */
import type { Placement } from './system';

/** A room on plan, in feet, origin at the plan's top-left. */
export interface Room {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size?: string;
  outdoor?: boolean;
}

export interface Level {
  name: string;
  modules: Placement[];
  rooms?: Room[];
  /** Open terrace cells on this level: [x, z] grid cells. */
  terrace?: [number, number][];
}

export interface Model {
  id: string;
  n: string;
  name: string;
  sqft: number;
  beds: number;
  baths: number;
  floors: number;
  recipe: string;
  footprint: string;
  levels: Level[];
  layoutSource: 'reference' | 'pending';
}

const A = (x: number, z: number, y = 0, r: 0 | 1 = 0): Placement => ({ t: 'A', x, y, z, r });
const B = (x: number, z: number, y = 0): Placement => ({ t: 'B', x, y, z });

export const models: Model[] = [
  {
    id: 'the-pod',
    n: '01',
    name: 'The Pod',
    sqft: 200,
    beds: 1,
    baths: 1,
    floors: 1,
    recipe: '1 × Shell A',
    footprint: '6 m × 3 m',
    layoutSource: 'reference',
    levels: [
      {
        name: 'Ground',
        modules: [A(0, 0)],
        rooms: [
          { name: 'Toilet', x: 0, y: 0, w: 4, h: 10, size: '4′0″ × 9′0″' },
          { name: 'Bed room', x: 4, y: 0, w: 11, h: 10 },
          { name: 'Foyer', x: 15, y: 0, w: 5, h: 10 },
        ],
      },
    ],
  },
  {
    id: 'studio-max',
    n: '02',
    name: 'Studio Max',
    sqft: 300,
    beds: 1,
    baths: 1,
    floors: 1,
    recipe: '1 × Shell A + 1 × Shell B',
    footprint: '6 m × 6 m, L-shaped',
    layoutSource: 'reference',
    levels: [
      {
        name: 'Ground',
        modules: [A(0, 0), B(1, 1)],
        rooms: [
          { name: 'Toilet', x: 0, y: 0, w: 4.5, h: 10, size: '4′6″ × 9′0″' },
          { name: 'Bed room', x: 4.5, y: 0, w: 15.5, h: 10 },
          { name: 'Living', x: 10, y: 10, w: 10, h: 10 },
          { name: 'Outdoor / garden', x: 0, y: 10, w: 10, h: 10, outdoor: true },
        ],
      },
    ],
  },
  {
    id: 'urban-suite',
    n: '03',
    name: 'Urban Suite',
    sqft: 400,
    beds: 2,
    baths: 1,
    floors: 1,
    recipe: '2 × Shell A',
    footprint: '6 m × 6 m',
    layoutSource: 'reference',
    levels: [
      {
        name: 'Ground',
        modules: [A(0, 0, 0, 1), A(1, 0, 0, 1)],
        rooms: [
          { name: 'Bed room', x: 0, y: 0, w: 10, h: 9 },
          { name: 'Wardrobe', x: 0, y: 9, w: 10, h: 2 },
          { name: 'Bed room', x: 0, y: 11, w: 10, h: 9 },
          { name: 'Toilet', x: 10, y: 0, w: 10, h: 6 },
          { name: 'Living', x: 10, y: 6, w: 10, h: 14 },
        ],
      },
    ],
  },
  {
    id: 'the-homestead',
    n: '04',
    name: 'The Homestead',
    sqft: 500,
    beds: 2,
    baths: 2,
    floors: 1,
    recipe: '2 × Shell A + 1 × Shell B',
    footprint: '9 m × 6 m, L-shaped',
    layoutSource: 'pending',
    levels: [{ name: 'Ground', modules: [A(0, 0), A(0, 1), B(2, 1)] }],
  },
  {
    id: 'duplex-prime',
    n: '05',
    name: 'Duplex Prime',
    sqft: 600,
    beds: 2,
    baths: 2,
    floors: 2,
    recipe: '3 × Shell A',
    footprint: '6 m × 6 m over two floors',
    layoutSource: 'pending',
    levels: [
      { name: 'Ground', modules: [A(0, 0), A(0, 1)] },
      { name: 'First', modules: [A(0, 0, 1)], terrace: [[0, 1], [1, 1]] },
    ],
  },
];
