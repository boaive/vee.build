/**
 * The capsule home (POD): its lengths and the words of its page. The pod's
 * model is kit/podPlan.ts (no three.js), which takes its lengths from here.
 *
 * Lengths: 8, 10 and 12 m (developer, 2026-11-08), in place of the brief's
 * 10′, 16′ and 20′ (notes W1: the latest instruction is followed); 10 m is
 * the one shown first (2026-11-09: "by default it will be in 10m").
 */
export const podLengths = [8, 10, 12] as const;
export type PodLengthM = (typeof podLengths)[number];
export const podDefault: PodLengthM = 10;

/** A length's name on its button and under the pod. */
export const podLengthName = (m: number) => `${m} m`;

/**
 * The POD page opens on the pod (developer, 2026-11-09: "mimic the mod page,
 * start with the pod in plain background ... after that plain background, we
 * show the animated background"): the pod alone on the studio floor, then
 * its land at blue hour as the page scrolls. The visitor chooses its length
 * all the while; one pod, never three at once. Only what was given: the
 * kind's line and point, the three lengths, how it grows (notes W).
 */
export const podOpening = {
  kicker: 'POD',
  line: ['Capsule', 'home.'],
  sub: 'Luxury capsule living. Enveloped in concrete.',
} as const;

/**
 * The land's step (developer, 2026-11-09: "grow by the panel, that is not
 * professional ... we don't have to show the end stays, and sizes in that
 * line since we have size options in below ... a high professional and
 * economical tone, and also smaller"): what the pod is made of, in a line.
 */
export const podSteps = [
  {
    id: 'land',
    at: 0,
    pose: 0.5,
    kicker: 'Capsule home',
    title: 'Steel frame. Concrete skin.',
    // CONFIRM: the skin's thickness, "around 20mm" (developer, 2026-11-08; notes W4).
    body: 'Galvanised steel, clad in 20 mm TRC panels.',
  },
];

/** The length buttons' group name, for a screen reader. */
export const podPickLabel = 'Capsule length';

/* ---------- 02 Built in layers (the POD page) ---------- */

/**
 * The pod taken apart, then built again in the order it is made
 * (developer, 2026-11-09: "the pod starts with galvanized steel frames ...
 * then ... wiring works ... then rockwool + fire barrier ... then, there
 * comes the cladding part ... and for interior walls it can use any
 * interior wall panels"; "burst first, like MOD"). As in MOD's components
 * film, the heading's words arrive as their layers are shown. Short, by
 * the copy rule.
 */
export const podLayerWords = ['Frame', 'Services', 'Insulation', 'Skin', 'Interior'] as const;

/** The call-outs in the picture, a box each, as each part is shown. */
export const podLayerCallouts = {
  frame: 'Galvanised steel frame',
  plumbing: 'Plumbing, under the floor',
  insulation: 'Rockwool and fire barrier',
  skin: 'TRC panels, 20 mm',
  interior: 'Interior panels',
  wiring: 'Wiring, in the panels',
  /** The opening's one call-out for the panels with their wiring. */
  panels: 'Interior panels, wired',
  rolls: 'Rockwool, from the roll',
  walls: 'Side cladding',
  top: 'Top cladding',
} as const;

/** `at` and `pose` are places on the film's scroll (film/podLayersTimeline.ts keeps the times they match, CHAPTER). */
export const podLayerSteps = [
  {
    id: 'layers',
    at: 0,
    pose: 0.18,
    kicker: 'Built in layers',
    title: 'Frame. Services. Insulation. Skin. Interior.',
    body: 'From the steel frame out, and the lining in.',
  },
  {
    id: 'frame',
    at: 0.23,
    pose: 0.37,
    kicker: '2.1 — Frame',
    title: 'Galvanised steel frame',
    body: 'Square tube, welded: chassis, posts, rails, roof.',
  },
  {
    id: 'services',
    at: 0.385,
    pose: 0.545,
    kicker: '2.2 — Services',
    title: 'Interior panels, wiring in them',
    // The developer's scheme (notes W7, X, Y): pipes fixed under the floor, reached through the open kicker; the panels come wired, the wiring laid to the plan's points.
    body: 'Pipes under the floor. The panels come wired to the plan: lights, switches, sockets.',
  },
  {
    id: 'insulation',
    at: 0.555,
    pose: 0.68,
    kicker: '2.3 — Insulation',
    title: 'Rockwool and fire barrier',
    // "it comes rolled in market" (developer, 2026-11-09).
    body: 'Rockwool unrolled into the walls and over the ceiling, then the fire barrier.',
  },
  {
    id: 'skin',
    at: 0.69,
    pose: 0.835,
    kicker: '2.4 — Skin',
    title: 'TRC panels, 20 mm',
    // CONFIRM: the thickness, the mesh and the fixing (developer, 2026-11-08 and 09; notes W4, W8).
    body: 'Concrete on RTARIUM mesh, hung panel by panel as stud-frame cladding: walls, then the top.',
  },
  {
    id: 'fitout',
    at: 0.85,
    pose: 1,
    kicker: '2.5 — Fit-out',
    title: 'Fitted and lit',
    // "once the light turns on it comes there automatically" (developer, 2026-11-10): the rooms are not shown going in.
    body: 'Furnished to the plan. Lights on.',
  },
];

/* ---------- 03 Plans (the POD page) ---------- */

/**
 * The plans (developer, 2026-11-09: "we show then 3 options, and there floor
 * plan along with same 3d. the user can view the floor plan in detail, also
 * they can download it as broacher. enquire about them ... we keep simple in
 * the page. we only show more if the user want it to see"; both layouts of
 * each length, the 3D following the one chosen). Layouts, rooms and areas
 * are the draft's (.claude/pod-draft.md section 3), which are ours: CONFIRM
 * (notes W).
 */
export type PodLayoutKey = 'A' | 'B';
export const podLayouts: Record<PodLengthM, Record<PodLayoutKey, { name: string; rooms: string }>> = {
  8: { A: { name: 'One bed', rooms: '1 bed · 1 bath · lounge' }, B: { name: 'Work', rooms: '1 office · 1 bath · lounge' } },
  10: { A: { name: 'One bed and kitchen', rooms: '1 bed · 1 kitchen · 1 bath' }, B: { name: 'Two beds', rooms: '2 beds · 1 bath' } },
  12: {
    A: { name: 'One bed, kitchen and balcony', rooms: '1 bed · 1 kitchen · 1 bath · balcony' },
    B: { name: 'Two beds and balcony', rooms: '2 beds · 1 bath · balcony' },
  },
};
/** Gross area of each length's plan, m² (its outline, the cut corners taken off). CONFIRM. */
export const podAreas: Record<PodLengthM, number> = { 8: 23.7, 10: 29.8, 12: 35.9 };
/**
 * Width and height as the plans state them, m: 3 by 3 (developer, 2026-11-10: "the side are 3 and 3, not 3.05 and
 * 3.2, dont change anything with the model, just change the numbers in 03"). The model is drawn 3.05 wide and 3.2 to
 * the top of its band (podPlan.ts) and stays so; the plans' figures, the large plan's width and the brochures say 3.
 * Notes Y12.
 */
export const podSection = { width: 3, height: 3 } as const;

export const podPlans = {
  index: '03',
  name: 'Plans',
  title: 'Three lengths. Two layouts each.',
  lead: 'Choose a length, then a layout.',
  lengthLabel: 'Length',
  layoutLabel: 'Layout',
  sizeLabel: 'Size',
  areaLabel: 'Area',
  view: 'View plan',
  brochure: 'Download brochure',
  enquire: 'Enquire',
  close: 'Close',
} as const;

/** Each length's brochure, made by scripts/pod-brochure.mjs from the same plans. */
export const podBrochure = (m: number) => `/downloads/veedo-pod-${m}m.pdf`;
