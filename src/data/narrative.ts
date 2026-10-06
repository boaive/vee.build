/**
 * Copy for the pinned films. `at` is where a step becomes the active
 * caption (0–1 of the film's scroll), `pose` is the progress at which its
 * scene is settled (used for step buttons and reduced motion), and `cue` is
 * where its card crosses the reading line (defaults to `pose`).
 * Text is taken from the VEE.BUILD brief; edits are logged in
 * .claude/vee-build-notes.md section E.
 */
import { footprints, shells, stacks } from './system';

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
  /** Caption theme while this step is active, when the scene behind it needs it. */
  theme?: 'light' | 'dark';
}

/* ---------- 01 Hero ---------- */

export const heroSteps: FilmStep[] = [
  {
    id: 'farmhouse',
    at: 0,
    pose: 0,
    kicker: 'Modular home',
    // CONFIRM: on-site installation time (notes B4).
    title: 'Get your house installed in one day!',
    body: 'Off-site construction with absolute minimum site impact.',
  },
  {
    id: 'capsule',
    at: 0.2,
    pose: 1 / 3,
    theme: 'dark',
    kicker: 'Capsule pods · 10′ · 16′ · 20′',
    title: 'Live a sci-fi life.',
    body: 'Experience luxury pods engineered for tomorrow.',
    link: { label: 'Capsule — coming soon', href: '/capsule/' },
  },
  {
    id: 'workforce',
    at: 0.53,
    pose: 2 / 3,
    kicker: 'Workforce housing · G+1',
    title: 'Insulated and comfortable living for your workforce.',
    body: 'Rapidly deployed, heavy-duty employee living infrastructure.',
    link: { label: 'Prefab building', href: '/prefab/' },
  },
  {
    id: 'institutional',
    at: 0.86,
    pose: 1,
    kicker: 'Institutional · G+2 · 36′ wall panels',
    title: 'Lean, clean, resilient, environmentally friendly buildings for future generations.',
    link: { label: 'Prefab building', href: '/prefab/' },
  },
];

/* ---------- 02 How it works ---------- */

export const systemSteps: FilmStep[] = [
  {
    id: 'shells',
    at: 0,
    pose: 0.1,
    cue: 0.04,
    kicker: '2.1 — The two core shells',
    title: 'Two standardised shells.',
    body: `${shells.A.name} is ${shells.A.label}. ${shells.B.name} is ${shells.B.label}. Every VEE.BUILD building is made from these two.`,
  },
  {
    id: 'hook-cleat',
    at: 0.15,
    pose: 0.22,
    kicker: '2.1 — Hook & cleat',
    // CONFIRM: "patented" (notes B3).
    title: 'Complete architectural freedom built on strict, patented, standardised structural principles.',
    body: 'A hook & cleat system sits at the corners of every shell.',
  },
  {
    id: 'footprints',
    at: 0.3,
    pose: 0.48,
    kicker: '2.2 — Multiple footprints',
    title: 'Configured for different footprints.',
    body: `The shells duplicate, array and fuse side by side: ${footprints.map((f) => f.sqft).join(' → ')} sq.ft.`,
  },
  ...stacks.map((s, i) => ({
    id: s.id,
    at: [0.62, 0.76, 0.89][i],
    pose: [0.71, 0.84, 1][i],
    kicker: `2.3 — Multi-floor · ${s.floors}`,
    title: s.name,
    body: s.description,
    note: `Ideal for: ${s.idealFor}`,
  })),
];

/* ---------- 03 Building components ---------- */

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

export const componentSteps: FilmStep[] = [
  {
    id: 'overview',
    at: 0,
    pose: 0.14,
    cue: 0.04,
    kicker: 'Componentised assembly',
    title: 'Three simple steps.',
    body: 'One 6 m × 3 m shell, taken apart: foundation, insulated shell, add-ons.',
  },
  {
    id: 'foundation',
    at: 0.24,
    pose: 0.4,
    kicker: '3.1 — Foundation',
    title: 'Foundation',
    body: 'Three components set the building on the ground. Height is adjusted on the jack thread.',
    tags: ['Plug footing', 'L plinth', 'Jack pier'],
  },
  {
    id: 'insulation',
    at: 0.44,
    pose: 0.7,
    kicker: '3.2 — Insulation',
    title: 'Insulated shell',
    body: 'The structural shell locks in. A perimeter metal frame clamps along its edges and white panels slide into the frame tracks.',
    tags: [
      'Thicker panels → exterior face',
      'Thinner panels → interior partitions',
      'Openings: main door, windows, internal access',
    ],
  },
  {
    id: 'addons',
    at: 0.74,
    pose: 1,
    kicker: '3.3 — Add-ons',
    title: 'Add-ons',
    body: 'With the home built, peripheral options drop into place.',
    tags: [...addOns],
  },
];

/* ---------- 05 Your house (after the configurator) ---------- */

const revealRest: FilmStep[] = [
  {
    id: 'whole',
    at: 0.4,
    pose: 0.56,
    kicker: 'Made whole',
    title: 'Every shell leaves the factory finished.',
    body: 'Cast with its insulation panels in place, then sprayed, glazed and fitted with doors on the finishing line.',
  },
  {
    id: 'next',
    at: 0.76,
    pose: 1,
    kicker: 'Next',
    title: 'See how we manufacture it.',
    link: { label: 'Enter the factory', href: '#factory' },
  },
];

export const revealSteps: FilmStep[] = [
  { id: 'yours', at: 0, pose: 0.1, cue: 0.05, kicker: 'Your build', title: 'Your house, on its own.', body: 'Exactly as you configured it, shell by shell.' },
  ...revealRest,
];

export const revealSample: FilmStep[] = [
  {
    id: 'yours',
    at: 0,
    pose: 0.1,
    cue: 0.05,
    kicker: 'A sample build',
    title: 'This could be your house.',
    body: 'Nothing is placed on the site yet, so The Homestead stands in. Build your own above and it appears here.',
    link: { label: 'Back to the configurator', href: '#configure' },
  },
  ...revealRest,
];

/* ---------- 06 Factory tour ---------- */

export const factorySteps: FilmStep[] = [
  {
    id: 'gates',
    at: 0,
    pose: 0.09,
    kicker: 'Station 1',
    title: 'Enter the factory gates',
    body: 'An open-air production yard under a clear sky. Finished homes stand by the shed, yours among them.',
  },
  {
    id: 'bays',
    at: 0.11,
    pose: 0.18,
    kicker: 'Station 2',
    title: 'Assembly bays activate',
    body: 'Four adjustable piers position for each shell.',
  },
  {
    id: 'core',
    at: 0.22,
    pose: 0.34,
    kicker: 'Station 3',
    title: 'Core shell placed',
    body: 'Insulation panels drop into the perimeter slots.',
  },
  {
    id: 'formwork',
    at: 0.37,
    pose: 0.42,
    kicker: 'Station 4',
    title: 'Formwork installation',
    body: 'Bright green boards lock the structure.',
  },
  {
    id: 'concreting',
    at: 0.46,
    pose: 0.53,
    kicker: 'Station 5',
    title: 'Concreting cycle',
    body: 'A compact delivery machine pumps the mix through a hose.',
  },
  {
    id: 'deshutter',
    at: 0.57,
    pose: 0.62,
    kicker: 'Station 6',
    title: 'De-shuttering',
    body: 'The green boards drop away to reveal smooth concrete.',
  },
  {
    id: 'finishing',
    at: 0.67,
    pose: 0.8,
    kicker: 'Station 7',
    title: 'Finishing line',
    body: 'Precision spray paint. Doors snap in. Glass is set.',
  },
  {
    id: 'dispatch',
    at: 0.84,
    pose: 1,
    kicker: 'Dispatch',
    title: 'Craned onto the truck',
    body: 'A mobile crane lifts the finished shell onto the trailer. Next stop: your site.',
  },
];

/* ---------- 06 Installation (after delivery) ---------- */

/** The installation film's captions; the stacking beat appears only for multi-floor builds. */
export function installSteps(floors: number, sample: boolean): FilmStep[] {
  const stack = floors > 1;
  const steps: FilmStep[] = [
    {
      id: 'arrive',
      at: 0,
      pose: 0.1,
      kicker: 'Installation',
      title: 'Delivered to the plot.',
      body: 'The truck pulls in beside foundations that are already set.',
    },
    {
      id: 'lift',
      at: 0.14,
      pose: stack ? 0.4 : 0.55,
      kicker: 'Lift',
      title: 'Lifted onto the piers.',
      body: 'A mobile crane sets each shell in place, ground floor first.',
    },
  ];
  if (stack)
    steps.push({
      id: 'stack',
      at: 0.47,
      pose: 0.68,
      kicker: 'Stack',
      title: 'Floors land on floors.',
      body: 'Upper shells sit on the ones below. Hook & cleat fittings sit at every corner.',
    });
  steps.push(
    {
      id: 'finish',
      at: 0.73,
      pose: 0.88,
      kicker: 'Add-ons',
      title: 'Finished with the add-ons.',
      body: sample ? 'Deck, posts, spandrel, handrail, steps and shades drop into place.' : 'The add-ons you chose drop into place.',
    },
    {
      id: 'home',
      at: 0.9,
      pose: 1,
      kicker: 'Handover',
      title: sample ? 'The house, on its site.' : 'Your house, on its site.',
    },
  );
  return steps;
}
