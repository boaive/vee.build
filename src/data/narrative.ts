/**
 * Copy for the pinned films. `at` is where a step becomes the active
 * caption (0–1 of the film's scroll), `pose` is the progress at which its
 * scene is settled (used for step buttons and reduced motion), and `cue` is
 * where its card crosses the reading line (defaults to `pose`).
 * Text is taken from the VEE.BUILD brief; edits are logged in
 * .claude/vee-build-notes.md section E.
 */
import { scrollAt } from '../film/componentsClock';
import { FACTORY_STEPS as FS } from '../film/factoryTimeline';
import { HERO_CUTS } from '../film/heroTimeline';
import { INSTALL_STEPS as IS } from '../film/installTimeline';
import { filmStacks, footprints, shells } from './system';

export interface FilmStep {
  id: string;
  at: number;
  pose: number;
  cue?: number;
  kicker: string;
  title: string;
  body?: string;
  note?: string;
  link?: { label: string; href: string };
  tags?: string[];
  /** A small tag beside the kicker ("Coming soon"). */
  badge?: string;
  /** Caption theme while this step is active, when the scene behind it needs it. */
  theme?: 'light' | 'dark';
}

/* ---------- 01 Hero ---------- */

/**
 * The three kinds of building (client, 2026-10-09): the opening card shows
 * one of each, and each has a statement for a heading and a line of text.
 * `code` is the top menu's name for the line. Wording is the client's;
 * only the capitals are ours. `soon`: not on sale yet, and tagged so
 * wherever it is shown (the capsule since 2026-10-09, the prefab building
 * since 2026-10-10).
 */
const SOON = 'Coming soon';
export const kinds = [
  {
    id: 'mod',
    code: 'MOD',
    word: 'Modular.',
    name: 'Modular house',
    line: 'Factory made insulated concrete homes.',
    // CONFIRM: on-site installation time (notes B4).
    punch: 'Installed in one day!',
    href: '/',
    soon: false,
  },
  {
    id: 'pod',
    code: 'POD',
    word: 'Capsule.',
    name: 'Capsule home',
    line: 'Luxury spaceship pod.',
    // CONFIRM: the capsule's shell is concrete (notes B8).
    punch: 'Enveloped in concrete!',
    href: '/capsule/',
    soon: true,
  },
  {
    id: 'fab',
    code: 'FAB',
    word: 'Prefab building.',
    name: 'Prefab building',
    line: 'Comfort accommodation.',
    // CONFIRM: construction time, and for what size of building (notes B9).
    punch: 'Built in days!',
    href: '/prefab/',
    soon: true,
  },
] as const;

const [MOD, POD, FAB] = kinds;

/*
 * `at` is the cut between the hero's sets itself (film/heroTimeline.ts):
 * the picture, the step's mark and the caption change in the same frame
 * (client, 2026-10-10: "a noticeable delay between the tab changing and its
 * text"; before, a caption came a ninth of a screen after its set). No
 * figures in the headings (client, 2026-10-09): the objects carry them (pod
 * lengths, the 36′ panel).
 */
export const heroSteps: FilmStep[] = [
  {
    id: 'farmhouse',
    at: 0,
    pose: 0,
    kicker: MOD.code,
    title: `${MOD.name}.`,
    body: MOD.line,
    note: MOD.punch,
  },
  {
    id: 'capsule',
    at: HERO_CUTS[0],
    pose: 0.3,
    theme: 'dark',
    kicker: POD.code,
    badge: SOON,
    title: `${POD.name}.`,
    body: POD.line,
    note: POD.punch,
    link: { label: 'Capsule — coming soon', href: '/capsule/' },
  },
  {
    id: 'workforce',
    at: HERO_CUTS[1],
    pose: 0.6,
    kicker: `${FAB.code} · Workforce housing`,
    badge: SOON,
    title: `${FAB.name}.`,
    body: FAB.line,
    note: FAB.punch,
    link: { label: 'Prefab — coming soon', href: '/prefab/' },
  },
  {
    id: 'institutional',
    at: HERO_CUTS[2],
    pose: 1,
    kicker: `${FAB.code} · Institutional`,
    badge: SOON,
    // The brief's line, set as statements like the other three (notes E).
    title: 'Lean. Clean. Resilient.',
    body: 'Environmentally friendly buildings for future generations.',
    link: { label: 'Prefab — coming soon', href: '/prefab/' },
  },
];

/* ---------- 02 How it works ---------- */

/*
 * Wording of 2.1 to 2.5 as the client set it on 2026-10-09 (notes J7); the
 * capitals are ours. `at` and `pose` follow film/systemTimeline.ts.
 */
const [VILLA, MIDRISE] = filmStacks;

export const systemSteps: FilmStep[] = [
  {
    id: 'shells',
    at: 0,
    pose: 0.1,
    cue: 0.04,
    kicker: '2.1 — The 2 core shells',
    title: 'Two standardized shells.',
    body: `${shells.A.name} is ${shells.A.label}. ${shells.B.name} is ${shells.B.label}. VEE.BUILD modules are made from these 2 shell frames.`,
  },
  {
    id: 'hook-cleat',
    at: 0.15,
    pose: 0.225,
    kicker: '2.2 — Lift & shift',
    title: 'Building as a product.',
    body: 'VEE have componentized the modules while maintaining complete architectural freedom.',
    note: 'VEE.BUILD fully finished “LIFT & SHIFT” modules.',
  },
  {
    id: 'footprints',
    at: 0.3,
    pose: 0.48,
    kicker: '2.3 — Multiple footprints',
    title: 'Single system. Multiple footprints.',
    body: `The shells duplicate, array and fuse side by side: ${footprints.map((f) => f.sqft).join(' → ')} sq.ft.`,
  },
  {
    id: VILLA.id,
    at: 0.62,
    pose: 0.74,
    kicker: '2.4 — Multi-floor. Multiple roofing options.',
    // CONFIRM: "net zero" and "off-grid capability" (notes B10).
    title: 'Net zero.',
    body: 'A multi-family house with off-grid capability.',
  },
  {
    id: MIDRISE.id,
    at: 0.82,
    pose: 1,
    kicker: '2.5 — Stack up to 5 floors',
    title: 'Mid-rise apartment.',
    body: MIDRISE.description,
    note: `Ideal for: ${MIDRISE.idealFor}`,
  },
];

/* ---------- 03 Componentized building ---------- */

export const addOns = [
  'Deck platform',
  'Deck post',
  'Spandrel',
  'Handrail',
  'Steps',
  'Window / door shades',
  'Sloped roof option',
  'Roof solar arrays',
] as const;

/*
 * Wording as the client set it on 2026-10-09 (notes J9). "Add-ons" is the
 * brief's spelling; the client's capitals read "ADD-ON's".
 *
 * `at` and `pose` are places on the scroll, given as times on the film's
 * clock (film/componentsClock.ts): the opening has more scroll than its
 * share of the clock.
 */
export const componentSteps: FilmStep[] = [
  {
    id: 'overview',
    at: 0,
    // Settled once all three have come apart into their own parts (componentsTimeline, BURST.pose).
    pose: scrollAt(0.2),
    cue: 0.04,
    kicker: 'Building-kit-as-parts',
    title: 'Foundation. Module. Add-ons.',
    body: 'This is just like car manufacturing. See how they all connect together.',
  },
  {
    id: 'foundation',
    at: scrollAt(0.24),
    pose: scrollAt(0.4),
    kicker: '3.1 — Foundation',
    title: 'Foundation',
    // The jack pier is set when the add-ons are (developer, 2026-10-10), so two of the brief's three are shown here.
    body: 'Plug footings and L plinths set the building on the ground. Further adjustments can be done with the jack, which comes with the add-ons.',
    tags: ['Plug footing', 'L plinth'],
  },
  {
    id: 'module',
    at: scrollAt(0.44),
    // Settled once the door and the glass are in (componentsTimeline, MODULE.fit).
    pose: scrollAt(0.735),
    kicker: '3.2 — Module',
    title: 'Insulated concrete shell',
    // CONFIRM: "eco-friendly" and the materials named (notes B11).
    body: 'The ultimate fusion of strength and sustainability. Discover how high-grade steel, 3D EPS insulation, and advanced micro-concrete unite to create the next generation of eco-friendly concrete shells.',
  },
  {
    id: 'addons',
    at: scrollAt(0.74),
    pose: 1,
    kicker: '3.3 — Add-ons',
    title: 'Add-ons',
    // "Optional" is the client's point of 2026-10-10: the deck, the steps and the roof are add-ons too, not standard parts.
    body: 'With the home built, the options drop into place. The deck, the steps and the sloped roof are add-ons too, chosen for each building. Deck posts and steps land on jack piers.',
    tags: [...addOns],
  },
];

/** The three layers of the exploded view, and the three parts of the module: each call-out is a box in its own colour (film.css). */
export const componentCallouts = {
  layers: { foundation: 'Foundation', module: 'Module', addons: 'Add-ons' },
  parts: { frame: 'Structural frame', panels: 'Insulated panels', concrete: 'Micro concrete' },
  /** The small line over the name of an optional part, in the picture. */
  addOn: 'Add-on',
} as const;

/* ---------- 05 Your house (after the configurator) ---------- */

const revealRest: FilmStep[] = [
  {
    id: 'whole',
    at: 0.5,
    pose: 0.86,
    kicker: 'Made whole',
    title: 'Every shell leaves the factory finished.',
    // The client's sentence of 2026-10-09, with "casted with concrete" set right (notes E).
    body: 'Cast in concrete with its insulation panels in place, then painted, glazed and fitted with doors on the finishing line.',
  },
];

/**
 * Section 6, "3D tour" (client, 2026-10-09: "drag to check top, down, left,
 * right & centre"). The five views, in the order the scene knows them
 * (RevealScene, VIEWS): each is a button too, so a view the drag cannot
 * reach on a touch screen (up and down are the page's scroll there) is one
 * tap away.
 */
export const revealViews = {
  heading: '3D tour',
  hint: 'Drag to check top, down, left, right & centre',
  keys: ['Top', 'Down', 'Left', 'Right', 'Centre'],
} as const;

/** The factory tour's title screen: it takes the whole screen after "your house", then opens onto the yard. */
export const factoryTitle = { kicker: 'Factory tour', line: ['See how VEE', 'manufactures it.'] } as const;

export const revealSteps: FilmStep[] = [
  { id: 'yours', at: 0, pose: 0.14, cue: 0.05, kicker: 'Your build', title: 'Your house, on its own.', body: 'Exactly as you configured it, shell by shell.' },
  ...revealRest,
];

export const revealSample: FilmStep[] = [
  {
    id: 'yours',
    at: 0,
    pose: 0.14,
    cue: 0.05,
    kicker: 'A sample build',
    title: 'This could be your house.',
    body: 'Nothing is placed on the site yet, so The Homestead stands in. Build your own above and it appears here.',
    link: { label: 'Back to the configurator', href: '#configure' },
  },
  ...revealRest,
];

/* ---------- 07 The factory ---------- */

/*
 * The order and the names are the client's (2026-10-10): the line begins
 * with the structural frame, "Structural frame – core shell", and the
 * shell is finished in the bay it is made in. `at` and `pose` are the
 * film's own (film/factoryTimeline.ts). Before, the brief's seven stations
 * began at the gates.
 */
export const factorySteps: FilmStep[] = [
  {
    id: 'frame',
    ...FS.frame,
    kicker: 'Station 1',
    title: 'Structural frame – core shell',
    body: 'Four adjustable piers set the level. On them the steel frame goes up: a ring at the floor with its joists, a column at each corner, a ring round the top, and a lifting hook on each column.',
  },
  {
    id: 'panels',
    ...FS.panels,
    kicker: 'Station 2',
    title: 'Insulation panels',
    body: 'The panels are set into the frame: the floor, the four walls with their openings left in them, and the roof on top.',
  },
  {
    id: 'formwork',
    ...FS.formwork,
    kicker: 'Station 3',
    title: 'Formwork installation',
    body: 'Bright green boards close round the panels and are locked.',
  },
  {
    id: 'concreting',
    ...FS.concreting,
    kicker: 'Station 4',
    title: 'Concreting cycle',
    body: 'A compact delivery machine pumps the mix through a hose, into the space between the boards and the panels and over the roof. It forms the walls: the inside stays clear.',
  },
  {
    id: 'deshutter',
    ...FS.deshutter,
    kicker: 'Station 5',
    title: 'De-shuttering',
    body: 'The green boards come away to reveal smooth concrete, with the openings for the door and the windows empty.',
  },
  {
    id: 'joinery',
    ...FS.joinery,
    kicker: 'Station 6',
    title: 'Doors and windows',
    body: 'Doors snap in. Glass is set.',
  },
  {
    id: 'spray',
    ...FS.spray,
    kicker: 'Station 7',
    title: 'Spray finish',
    body: 'Precision spray paint, in the bay the shell was made in.',
  },
  {
    id: 'dispatch',
    ...FS.dispatch,
    kicker: 'Dispatch',
    title: 'Craned onto the truck',
    body: 'A mobile crane lifts the finished shell by its four hooks, sets it on the trailer and lets go. Next stop: your site.',
  },
];

/* ---------- 08 Delivery: on the road ---------- */

/** One shot, one caption. `pose` is the frame a visitor with reduced motion is shown: the truck near, seen from the front and the side. */
export const transitSteps: FilmStep[] = [
  {
    id: 'road',
    at: 0,
    pose: 0.4,
    kicker: 'On the road',
    title: 'On its way to your site.',
    body: 'The finished shell leaves the yard on a truck, ready to be lifted into place when it arrives.',
  },
];

/* ---------- 08 Installation (after delivery) ---------- */

/**
 * The installation film's captions, in the order the client set out on
 * 2026-10-10: the truck arrives with one shell; it is placed on the
 * foundation ("Placed on the foundation" is the client's wording, in place
 * of "Lifted onto the piers"); the rest comes together by itself; the
 * lights come on last. Where each begins is the film's own
 * (film/installTimeline.ts). `shells`: how many the build has.
 */
/**
 * "On site" (client, 2026-10-11: the site preparation and the installation
 * as one continuous film). The first caption is what the separate section
 * "Ready before the shells arrive" said; `plinth`: the build's foundation
 * has L plinths between its footings.
 */
export function installSteps(shells: number, sample: boolean, plinth = true): FilmStep[] {
  const addOns = sample ? 'Deck, posts, spandrel, handrail, steps and shades drop into place.' : 'The add-ons you chose drop into place.';
  return [
    {
      id: 'prep',
      ...IS.prep,
      kicker: 'Site preparation',
      title: 'Ready before the shell arrives.',
      body: plinth
        ? 'Off-site construction with absolute minimum site impact. The plot is marked out, precast plug footings go into the ground and L plinths are laid between them, while the shell is still in the factory.'
        : 'Off-site construction with absolute minimum site impact. The plot is marked out and a precast plug footing goes into the ground at every corner, while the shell is still in the factory.',
    },
    {
      id: 'arrive',
      ...IS.arrive,
      kicker: 'Installation',
      title: 'Delivered to the plot.',
      body: 'The truck pulls in with a finished shell, beside the foundation waiting for it.',
    },
    {
      id: 'place',
      ...IS.place,
      kicker: 'Placement',
      title: 'Placed on the foundation.',
      body: 'A mobile crane lifts the shell off the trailer by its four hooks and sets it down on its footings.',
    },
    {
      id: 'assemble',
      ...IS.assemble,
      kicker: 'Assembly',
      title: shells > 1 ? 'The rest follows.' : 'Finished with the add-ons.',
      body: shells > 1 ? `Shell by shell the building comes together. ${addOns}` : addOns,
    },
    {
      id: 'home',
      ...IS.home,
      kicker: 'Handover',
      title: sample ? 'The house, on its site.' : 'Your house, on its site.',
      body: 'Its lights come on when the last piece is in.',
    },
  ];
}
