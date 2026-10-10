/**
 * Section 5, the configurator: add-on names, finishes and starting points.
 * Add-on names are the brief's (narrative.ts). Presets are the catalogue's
 * five models and the three stacked configurations from "How it works".
 */
import { models } from './catalogue';
import { addOns } from './narrative';
import { stacks } from './system';

export type ShellType = 'A' | 'B';
/** Quarter turns about the vertical axis. 0: glazed front faces +z (the street). */
export type Turn = 0 | 1 | 2 | 3;
/** Side of the building a deck runs along, as a Turn (0 = street side), or chosen automatically. */
export type DeckSide = 'auto' | Turn;

export interface UnitSpec {
  t: ShellType;
  /** Grid cell of the footprint's minimum corner, and the floor (0 = ground). */
  x: number;
  z: number;
  y: number;
  r: Turn;
}

/** A plot in 3 m cells. The visitor can extend it within PLOT_LIMITS. */
export interface Plot {
  x: number;
  z: number;
}
export const DEFAULT_PLOT: Plot = { x: 6, z: 4 };
export const PLOT_LIMITS = { min: { x: 3, z: 3 }, max: { x: 12, z: 10 } } as const;

/**
 * Foundation (client's model, notes H1–H2): the height the pedestals and
 * plinths stand above ground, and whether L plinths run between the footings.
 */
export type FoundationType = 'footings' | 'plinth';
export interface Foundation {
  /** Index into FOUNDATION_HEIGHTS. */
  h: 0 | 1 | 2;
  type: FoundationType;
}
export const FOUNDATION_HEIGHTS = [300, 600, 900] as const;
export const DEFAULT_FOUNDATION: Foundation = { h: 1, type: 'plinth' };
export const foundationTypes: { id: FoundationType; name: string; hint: string }[] = [
  { id: 'footings', name: 'Footings', hint: 'A precast footing at every corner.' },
  { id: 'plinth', name: 'Footings + L plinth', hint: 'L plinth pieces close the edges between footings.' },
];

/** Add-ons placed one by one instead of laid out automatically. */
export type ManualKind = 'deck' | 'steps' | 'shade' | 'roof' | 'solar';
export interface ManualAddOn {
  k: ManualKind;
  /** Unit id it attaches to. */
  u: number;
  /** World side (a Turn) for deck, steps and shade. */
  s?: Turn;
}
export const manualKinds: { id: ManualKind; name: string; hint: string }[] = [
  { id: 'deck', name: addOns[0], hint: 'Click the side of a ground-floor shell.' },
  { id: 'steps', name: addOns[4], hint: 'Click a deck, or a ground-floor wall to place a deck with its steps.' },
  { id: 'shade', name: addOns[5], hint: 'Click a wall with a window or door.' },
  { id: 'roof', name: addOns[6], hint: 'Click the roof of a top shell.' },
  { id: 'solar', name: addOns[7], hint: 'Click the roof of a top shell.' },
];
/** Brief, 2.3: the tallest stack is five floors. G+4 is the ceiling. */
export const MAX_FLOORS = 5;
export const MAX_UNITS = 32;

export const addOnIds = ['deck', 'posts', 'spandrel', 'handrail', 'steps', 'shades', 'roof', 'solar'] as const;
export type AddOnId = (typeof addOnIds)[number];

/** Deck details that follow the decks in manual mode. */
export const deckDetails: AddOnId[] = ['posts', 'spandrel', 'handrail'];

export const addOnInfo: Record<AddOnId, { name: string; hint: string; needs?: AddOnId }> = {
  deck: { name: addOns[0], hint: 'Outside every ground-floor door.' },
  posts: { name: addOns[1], hint: 'Carry the deck.', needs: 'deck' },
  spandrel: { name: addOns[2], hint: 'Closes the deck edge.', needs: 'deck' },
  handrail: { name: addOns[3], hint: 'On the deck edge and around open roof terraces.' },
  steps: { name: addOns[4], hint: 'From each deck down to the ground, at a door.', needs: 'deck' },
  shades: { name: addOns[5], hint: 'Over every exposed glazed front.' },
  roof: { name: addOns[6], hint: 'A mono-pitch roof on each top shell.' },
  solar: { name: addOns[7], hint: 'Panels on every top roof.' },
};

export interface Finish {
  id: string;
  name: string;
  hex: string;
}

// CONFIRM: finishes are indicative. None were supplied by the client (notes G).
export const shellFinishes: Finish[] = [
  { id: 'stone', name: 'Stone grey', hex: '#a29f97' },
  { id: 'white', name: 'Warm white', hex: '#e4e0d7' },
  { id: 'sand', name: 'Sand', hex: '#c6b597' },
  { id: 'terracotta', name: 'Terracotta', hex: '#b9765c' },
  { id: 'ochre', name: 'Ochre', hex: '#c39a52' },
  { id: 'sage', name: 'Sage green', hex: '#8e9c84' },
  { id: 'slate', name: 'Slate blue', hex: '#6f7f8d' },
  { id: 'graphite', name: 'Graphite', hex: '#505357' },
];
export const deckFinishes: Finish[] = [
  { id: 'teak', name: 'Natural teak', hex: '#a9784b' },
  { id: 'honey', name: 'Honey oak', hex: '#c48d55' },
  { id: 'cedar', name: 'Red cedar', hex: '#9c5b3d' },
  { id: 'ash', name: 'Weathered ash', hex: '#a39c90' },
  { id: 'walnut', name: 'Dark walnut', hex: '#5f4330' },
  { id: 'charred', name: 'Charred black', hex: '#3b3430' },
];
/** Roof fascia and trim. */
export const trimFinishes: Finish[] = [
  { id: 'black', name: 'Black', hex: '#2f3236' },
  { id: 'anthracite', name: 'Anthracite', hex: '#4a4e53' },
  { id: 'bronze', name: 'Bronze', hex: '#5d4b3b' },
  { id: 'white', name: 'White', hex: '#e6e4df' },
];
export const finishNote = 'Finishes are indicative. Confirm availability with VEE.BUILD.';

export interface Preset {
  id: string;
  name: string;
  note: string;
  units: UnitSpec[];
  addOns: AddOnId[];
  deckSide: DeckSide;
}

const U = (t: ShellType, x: number, z: number, y = 0, r: Turn = 0): UnitSpec => ({ t, x, z, y, r });

const HOME: AddOnId[] = ['deck', 'posts', 'spandrel', 'handrail', 'steps', 'shades'];

/** Catalogue models, re-oriented so their glazed fronts face the street. */
const fromCatalogue: Record<string, UnitSpec[]> = {
  'the-pod': [U('A', 0, 0)],
  'studio-max': [U('A', 0, 0), U('B', 1, 1)],
  'urban-suite': [U('A', 0, 0, 0, 1), U('A', 1, 0, 0, 1)],
  'the-homestead': [U('A', 0, 0, 0, 2), U('A', 0, 1), U('B', 2, 1)],
  'duplex-prime': [U('A', 0, 0, 0, 2), U('A', 0, 1), U('A', 0, 0, 1)],
};

export const presets: Preset[] = [
  ...models.map((m) => ({
    id: m.id,
    name: m.name,
    note: `${m.sqft} sq.ft. · ${m.floors === 1 ? 'single floor' : `${m.floors} floors`}`,
    units: fromCatalogue[m.id] ?? m.levels.flatMap((l) => l.modules.map((p) => U(p.t, p.x, p.z, p.y, p.r ?? 0))),
    addOns: m.floors > 1 ? [...HOME, 'solar' as const] : HOME,
    deckSide: 'auto' as DeckSide,
  })),
  ...stacks.map((s) => ({
    id: s.id,
    name: s.name,
    note: s.floors,
    // Rows of turned shells: every door ends up on the street end (build/model.ts, doorFaces).
    units: s.modules.map((p) => U(p.t, p.x, p.z, p.y, p.t === 'A' ? 1 : 0)),
    addOns: (s.id === 'midrise' ? ['handrail', 'shades', 'solar'] : ['deck', 'posts', 'spandrel', 'handrail', 'steps', 'shades']) as AddOnId[],
    deckSide: 0 as DeckSide,
  })),
];

/** Shown wherever "your house" appears before the visitor has built one. */
export const SAMPLE_PRESET = 'the-homestead';
