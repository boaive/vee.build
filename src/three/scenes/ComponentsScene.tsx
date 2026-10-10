import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, Fog, MeshStandardMaterial, type Group, type LineBasicMaterial, type LineSegments, type Material, type Mesh } from 'three';
import { ADDONS, BURST, FOUNDATION, MODULE, addOnWindow, clock } from '../../film/componentsTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, hold, sampleCamera, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { UNIT_BOX, box, memo, merge, mergeGroups } from '../kit/geometry';
import { mat } from '../kit/materials';
import {
  FOUNDATION as PRECAST,
  carriedStair,
  carriedStairGeometry,
  cleatGeometry,
  footingGeometry,
  footingReach,
  jackBaseGeometry,
  jackNutGeometry,
  jackScrewGeometry,
  joineryGeometry,
  lugGeometry,
  plinthGeometry,
  railGeometry,
  slopedRoofGeometry,
} from '../kit/parts';
import { PARTITIONS, SHELL, bayX, coatAt, coatPanel, epsPanel, frameMembers, partitionPanel, wallBays, type WallBay } from '../kit/shell';

/**
 * Componentized building: one 6 m × 3 m shell, modelled on the supplied
 * render, shown as the three things it is made of and then put together in
 * the brief's three steps. Each part is a mesh with a home position, a
 * place in the opening's burst and an arrival move.
 *
 * The opening (developer, 2026-10-10: "easy to view and understand for very
 * common people"): the finished house stands whole, is lifted off its
 * foundation, and its add-ons come off it. Three things, each still whole
 * and each named as it is shown. Then each of the three comes apart in
 * turn (the same day: "after fully bursting, we can burst further… easy
 * for normal people to see"): the footings and the plinth stand apart; the
 * module is drawn apart upwards into the three things it is made of, each
 * still a whole box, the steel frame, the white panels over it and the
 * concrete over them, with the door and the glass in front; the add-ons
 * come apart piece by piece. Nothing stands in front of anything else. No
 * outlines.
 *
 * Every time in this file is on the film's clock (componentsClock.ts), not
 * scroll progress.
 *
 * The module goes up in the three parts the client names (2026-10-09): a
 * structural frame in black steel, insulated panels in white (walls, floor
 * and roof, in segments), and micro-concrete in grey, sprayed over them
 * from one end of the shell to the other. Its openings and joinery are the
 * standard shell's (kit/parts.ts), so the house it becomes is the one seen
 * everywhere else on the page.
 *
 * Foundation and corner fittings are simplified stand-ins (notes C1, C2).
 *
 * The shell's own measures, its frame and its walls come from kit/shell.ts:
 * the factory film puts the same shell together from the same description
 * (client, 2026-10-10: sections 3.2 and 3.3 are the source of truth).
 */

type V3 = [number, number, number];

/** Which of the three a part belongs to in the opening, and how its add-ons leave the module. */
type Group3 = 'foundation' | 'module' | 'roof' | 'shade' | 'deck';

interface Part {
  key: string;
  geo?: BufferGeometry;
  mat: Material | Material[];
  size?: V3;
  pos: V3;
  rotY?: number;
  rotX?: number;
  group: Group3;
  from: V3;
  win: [number, number];
  /** The opening's second burst: how far the part goes from its place in its group. */
  apart?: V3;
  /**
   * screw: a jack's nut or head, turned to height once it stands.
   * slide: joinery, pushed in from outside, never scaled.
   * coat: sprayed on, growing along the part's own length (`span`, metres) from one end.
   */
  kind?: 'screw' | 'slide' | 'coat';
  span?: number;
  /**
   * Inside the shell: once the concrete is on and the door and glass are in,
   * nothing of it can be seen (the glazing is not see-through), so it is not
   * drawn; in the opening, not until the module opens. Fifty meshes, each
   * drawn three times a frame (picture, shadow, occlusion).
   */
  inner?: boolean;
  tag?: number;
}

/* ---------- Dimensions (metres) ---------- */

const L = SHELL.L;
/** Ground level: the footing pads stand on the studio floor, 620 mm below it. */
const GL = 0.62;
/** Pedestal and plinth tops above ground (600 mm, notes H1–H2). */
const ABOVE = 0.6;
const FB = GL + ABOVE; // floor underside: the module sits on the pedestals and the plinth
const FT = FB + SHELL.floor; // floor top
const RB = FB + SHELL.roofUnder; // roof underside
const RT = FB + SHELL.roofTop; // roof top, under the concrete
const TOP = FB + SHELL.top;
const BAY = SHELL.bay;
const COAT_H = SHELL.roofTop;
const ROOF = { len: 6.3, depth: 3.3, rise: 0.92, eave: 0.27 };
/** Where the walls' faces stand for the joinery: just behind the face of the concrete. */
const FACE = SHELL.face;

/**
 * The steps: four risers up to the deck, climbing towards +x. They do not
 * come down to the ground: the flight hangs from the deck at its head and
 * its frame stands on two jack piers at its foot, each stringer's level
 * sole on a jack's head, `STEPS.seat` above the ground (client,
 * 2026-10-09: "the jack pier has to come where deck post, stair frame
 * land"; developer, 2026-10-10: "jack pier should hold the staircase, not
 * let it down"). Before, the stringers ran on down into the ground and the
 * piers stood under their middle.
 */
const STEPS = { x: -1.1, z: 2.2, width: 1.2, run: 1.2, rise: FT - GL, risers: 4, seat: 0.16 };
const SOLE = carriedStair(STEPS.rise, STEPS.run, STEPS.risers, STEPS.seat);
/** Where a pier stands under a stringer: the middle of its sole. */
const STEP_BEAR = (SOLE.nose + SOLE.soleTo) / 2;
/** Each jack pier: where it stands and how high its head is above ground. Four under the deck's posts, two under the steps. */
const DECK_POSTS: [number, number][] = [0.2, 2.7].flatMap((x) => [1.66, 2.78].map((z) => [x, z] as [number, number]));
const PIER_DECK = 0.26;
const PIERS: { x: number; z: number; top: number; tag: number }[] = [
  ...DECK_POSTS.map(([x, z]) => ({ x, z, top: PIER_DECK, tag: 1 })),
  ...[-1, 1].map((s) => ({ x: STEPS.x + STEP_BEAR, z: STEPS.z + (s * STEPS.width) / 2, top: STEPS.seat, tag: 4 })),
];

/**
 * The second burst: how far each kind of part goes from its place (metres).
 * The module is drawn apart upwards: the frame stays, with the floor on
 * its joists; the panels, walls, partitions and roof together, rise clear
 * of its lifting hooks; the concrete rises clear of the panels, and the door
 * and the glass stand a little out of it. (Opened outwards instead, the
 * near walls hid the frame: tried first.)
 */
const OPEN = { panels: 3.4, concrete: 6.8, joinery: 0.45, footing: 0.8, plinth: 0.45 };

const FRAME_STEEL = mat.frameSteel;

const seq = (from: number, to: number, i: number, n: number, span = 0.5): [number, number] => {
  const w = (to - from) * span;
  const a = from + ((to - from - w) * i) / Math.max(1, n - 1);
  return [a, a + w];
};
/** A stretch of a window: [a, b] as fractions of it. */
const part = ([from, to]: readonly [number, number], a: number, b: number): [number, number] => [from + (to - from) * a, from + (to - from) * b];

/** A jack pier's pad and the jack's fixed part, as one piece. Origin on the ground. Groups: 0 the pad, 1 the jack. */
function pierGeometry(pad: number) {
  return memo(`jack-pier-${pad.toFixed(3)}`, () => {
    const base = jackBaseGeometry().clone();
    base.translate(0, pad, 0);
    return mergeGroups([[box(0.34, pad, 0.34, 0, pad / 2, 0)], [base]]);
  });
}

/** The roof-edge cleats, as one piece. Origin at the middle of the roof's top. */
function cleatsGeometry() {
  return memo('cleats-6m', () =>
    merge(
      [-1, 1].flatMap((sz) =>
        [-2, -1, 0, 1, 2].map((x) => {
          const g = cleatGeometry().clone();
          g.translate(x, 0, sz * 1.47);
          return g;
        }),
      ),
    ),
  );
}

/** Six panels in two rows on the sloped roof, as one piece. Origin at the middle of the shell's top. */
function solarGeometry() {
  return memo('components-solar', () => {
    const pitch = Math.atan2(ROOF.rise - ROOF.eave, ROOF.depth);
    const panels: BufferGeometry[] = [];
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 2; r++) {
        const z = -0.72 + r * 1.3;
        const g = box(1.72, 0.035, 1.16);
        g.rotateX(pitch);
        g.translate(-1.85 + c * 1.85, ROOF.eave + (ROOF.rise - ROOF.eave) * (0.5 - z / ROOF.depth) + 0.035, z);
        panels.push(g);
      }
    return merge(panels);
  });
}

function buildParts(): Part[] {
  const P: Part[] = [];
  const F = FOUNDATION;

  /* --- 3.1 Foundation: footings and L plinth pieces (client's model, notes H1–H2) --- */
  let i = 0;
  const corners: [number, number][] = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  for (const [sx, sz] of corners) {
    // The shell lies away from each corner: the pad reaches under it.
    const q: [boolean, boolean, boolean, boolean] = [sx < 0 && sz < 0, sx > 0 && sz < 0, sx > 0 && sz > 0, sx < 0 && sz > 0];
    P.push({
      key: `footing${sx}${sz}`,
      geo: footingGeometry(ABOVE, footingReach(q)),
      mat: mat.concrete,
      pos: [sx * 3, GL, sz * 1.5],
      group: 'foundation',
      from: [0, 2.2, 0],
      win: seq(F.from, F.from + 0.07, i++, 4, 0.6),
      apart: [sx * OPEN.footing, 0, sz * OPEN.footing],
    });
  }
  // Plinth pieces between the pedestals: 4 × 1425 on each long side, 2 × 1350 on each end.
  const pieces: { key: string; len: number; pos: V3; rotY: number; apart: V3 }[] = [];
  const run6 = (L - PRECAST.pedestal) / 4;
  const run3 = (3 - PRECAST.pedestal) / 2;
  for (const sz of [1, -1])
    for (let k = 0; k < 4; k++)
      pieces.push({ key: `pl6${sz}${k}`, len: run6, pos: [-L / 2 + PRECAST.pedestal / 2 + run6 * (k + 0.5), GL, sz * 1.5], rotY: sz > 0 ? Math.PI : 0, apart: [(k - 1.5) * 0.16, 0, sz * OPEN.plinth] });
  for (const sx of [1, -1])
    for (let k = 0; k < 2; k++)
      pieces.push({ key: `pl3${sx}${k}`, len: run3, pos: [sx * 3, GL, -1.5 + PRECAST.pedestal / 2 + run3 * (k + 0.5)], rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2, apart: [sx * OPEN.plinth, 0, (k - 0.5) * 0.16] });
  pieces.forEach((pc, k) =>
    P.push({
      key: pc.key,
      geo: plinthGeometry(pc.len, ABOVE, pc.len),
      mat: mat.concrete,
      pos: pc.pos,
      rotY: pc.rotY,
      group: 'foundation',
      from: [0, 1.6, 0],
      win: seq(F.from + 0.06, F.from + 0.135, k, pieces.length, 0.35),
      apart: pc.apart,
    }),
  );

  /*
   * --- 3.2 Module, part one: the structural frame, in black steel ---
   * A ring at the floor with its joists, a column at each corner carrying
   * a lifting hook, and a ring at the top on the four sides with nothing
   * across the middle (developer, 2026-10-10: "top steel bar in structural
   * frame, only 4 sides, not in centre"; that morning's "no bars in top"
   * had taken the ring away with the cross beam).
   */
  const fr = MODULE.frame;
  for (const m of frameMembers()) {
    const base = { key: m.key, mat: FRAME_STEEL, size: m.size, pos: [m.pos[0], FB + m.pos[1], m.pos[2]] as V3, group: 'module' as const };
    if (m.kind === 'joist') P.push({ ...base, from: [0, 4.5, 0], win: part(fr, 0, 0.5), inner: true });
    // The ring clamps in from outside.
    else if (m.kind === 'ring') P.push({ ...base, from: [m.side[0] * 1.5, 0, m.side[1] * 1.5], win: part(fr, 0.1, 0.6), inner: true });
    else if (m.kind === 'column') P.push({ ...base, from: [0, 4.5, 0], win: part(fr, 0.42, 0.86), inner: true });
    // The hook: a lug on the column's head, set on the corner's diagonal.
    else if (m.kind === 'hook') P.push({ ...base, geo: lugGeometry(), rotY: m.rotY, from: [0, 3.6, 0], win: part(fr, 0.7, 1) });
    // The top ring, between the columns' heads.
    else P.push({ ...base, from: [0, 3.2, 0], win: part(fr, 0.6, 0.94), inner: true });
  }

  /* --- 3.2 Module, part two: the insulated panels, in white --- */
  const pn = MODULE.panels;
  // The floor, in segments, on the joists.
  for (let b = 0; b < 6; b++)
    P.push({ key: `eps-floor${b}`, mat: mat.panel, size: [BAY - 0.02, 0.08, 2.7], pos: [bayX(b), FB + 0.1, 0], group: 'module', from: [0, 3.2, 0], win: seq(pn[0], part(pn, 0, 0.22)[1], b, 6, 0.5), inner: true });

  /* --- and part three: micro-concrete, sprayed over them from the −x end to the +x end --- */
  const [X0, X1] = part(pn, 0.14, 0.72);
  const [C0, C1] = MODULE.concrete;
  const stretch = (C1 - C0) / 6;
  const bayCoat = (b: number): [number, number] => [C0 + b * stretch, C0 + (b + 1) * stretch];

  /*
   * The walls, a bay at a time, with the standard shell's openings cut in
   * them (kit/shell.ts). The spray starts at the −x end and finishes on the
   * +x end: each bay's coat goes on as the spray passes it.
   */
  const coatWin = (w: WallBay): [number, number] => (w.face === 'right' ? [C1 - stretch * 0.7, C1] : w.face === 'left' ? [C0, C0 + stretch * 0.7] : bayCoat(w.order % 6));
  for (const w of wallBays('front')) {
    P.push({
      key: w.key,
      geo: epsPanel(w),
      mat: mat.panel,
      pos: [w.pos[0], FB + w.pos[1], w.pos[2]],
      rotY: w.rotY,
      group: 'module',
      from: w.rotY ? [0, 0, 5.5] : [7.5, 0, 0],
      win: seq(X0, X1, w.order, 18, 0.45),
      // A panel with no opening is wholly behind its coat; one with an opening shows its reveal.
      inner: !w.cut.length,
      apart: [0, OPEN.panels, 0],
    });
    // The coat of concrete on its outer face, floor edge to roof edge, with the same openings left in it.
    const at = coatAt(w);
    P.push({
      key: `${w.key}-coat`,
      geo: coatPanel(w),
      mat: mat.cast,
      pos: [at[0], FB, at[2]],
      rotY: w.rotY,
      group: 'module',
      from: [0, 0, 0],
      win: coatWin(w),
      kind: 'coat',
      span: w.width,
      apart: [0, OPEN.concrete, 0],
    });
  }
  const OUT: Record<WallBay['face'], V3> = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0] };
  // The corners, where two coats meet.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      P.push({
        key: `coat-corner${sx}${sz}`,
        mat: mat.cast,
        size: [0.17, COAT_H, 0.17],
        pos: [sx * 2.95, FB + COAT_H / 2, sz * 1.45],
        group: 'module',
        from: [0, 0, 0],
        win: sx < 0 ? [C0, C0 + stretch * 0.5] : [C1 - stretch * 0.5, C1],
        apart: [0, OPEN.concrete, 0],
      });

  // Interior panels (thinner): drop in from above, with internal access openings.
  PARTITIONS.forEach((pt, k) =>
    P.push({
      key: `int${k}`,
      geo: partitionPanel(pt),
      mat: mat.panel,
      pos: [pt.x, FB + SHELL.foot, 0],
      rotY: Math.PI / 2,
      group: 'module',
      from: [0, 4.2, 0],
      win: part(pn, 0.58 + k * 0.08, 0.84 + k * 0.08),
      inner: true,
      // They are panels: they go up with the panels.
      apart: [0, OPEN.panels, 0],
    }),
  );

  // The roof, in white segments like the floor, inside the top ring; then its coat. The floor's topping is sprayed with them.
  const seg = (L + 0.1) / 6;
  for (let b = 0; b < 6; b++) {
    P.push({ key: `eps-roof${b}`, mat: mat.panel, size: [BAY - 0.02, 0.16, 2.78], pos: [bayX(b), RB + 0.11, 0], group: 'module', from: [0, 3.6, 0], win: seq(part(pn, 0.72, 1)[0], pn[1], b, 6, 0.45), inner: true, apart: [0, OPEN.panels, 0] });
    P.push({ key: `coat-roof${b}`, mat: mat.cast, size: [seg, 0.05, 3.14], pos: [-(L + 0.1) / 2 + seg * (b + 0.5), RT + 0.025, 0], group: 'module', from: [0, 0, 0], win: bayCoat(b), kind: 'coat', span: seg, apart: [0, OPEN.concrete, 0] });
  }
  P.push({ key: 'coat-floor', mat: mat.cast, size: [5.7, 0.02, 2.7], pos: [0, FT + 0.01, 0], group: 'module', from: [0, 0, 0], win: [C0, C1], kind: 'coat', span: 5.7 });

  // Last: the standard shell's door, panes and frames go in, and the cleats along the roof's long edges.
  const fit: [number, number] = [MODULE.fit[0], MODULE.fit[1]];
  const joinery = [mat.fascia, mat.glass, mat.frame];
  for (const face of ['front', 'back', 'right'] as const) {
    const geo = joineryGeometry('A', 'front', face, FACE.x, FACE.z);
    if (!geo) continue;
    const [dx, , dz] = OUT[face];
    P.push({ key: `joinery-${face}`, geo, mat: joinery, pos: [0, FB, 0], group: 'module', from: [dx * 0.9, 0, dz * 0.9], win: fit, kind: 'slide', apart: [dx * OPEN.joinery, OPEN.concrete, dz * OPEN.joinery] });
  }
  P.push({ key: 'cleats', geo: cleatsGeometry(), mat: mat.galv, pos: [0, TOP, 0], group: 'module', from: [0, 1.2, 0], win: fit, kind: 'slide', apart: [0, OPEN.concrete, 0] });

  /* --- 3.3 Add-ons: drop from the top, in the brief's order --- */
  const drop: V3 = [0, 7, 0];
  const add = (tag: number, p: Omit<Part, 'win' | 'from' | 'tag'> & { from?: V3; win?: [number, number] }) => P.push({ from: drop, win: addOnWindow(tag), ...p, tag });

  add(0, { key: 'deck', mat: mat.deck, size: [2.7, 0.1, 1.36], pos: [1.45, FT - 0.05, 2.2], group: 'deck' });
  /*
   * The jack piers are set with the add-on that lands on them, not with
   * the foundation (developer, 2026-10-10): a pad and a jack under each
   * deck post just before the posts, two under the steps just before the
   * steps. Then the jack is turned up to its load.
   */
  PIERS.forEach((pr, k) => {
    const pad = pr.top - PRECAST.jack;
    const [a] = addOnWindow(pr.tag);
    const w: [number, number] = [a - 0.022, a + 0.012];
    // In the second burst the deck's piers go down from under its posts, the steps' with the steps and down from under them.
    const apart: V3 = pr.tag === 4 ? [-0.9, -0.6, 0] : [0, -1.3, 0];
    const base = { group: 'deck' as const, from: [0, 1.4, 0] as V3, win: w, apart };
    P.push({ key: `pier${k}`, geo: pierGeometry(pad), mat: [mat.concrete, mat.galv], pos: [pr.x, GL, pr.z], ...base });
    P.push({ key: `pier-nut${k}`, geo: jackNutGeometry(), mat: mat.accentInk, pos: [pr.x, GL + pad + 0.055, pr.z], ...base, kind: 'screw' });
    P.push({ key: `pier-screw${k}`, geo: jackScrewGeometry(), mat: mat.galv, pos: [pr.x, GL + pr.top, pr.z], ...base, kind: 'screw' });
  });
  // Each post stands on the head of its jack pier.
  const post = FT - 0.1 - GL - PIER_DECK;
  for (const [x, z] of DECK_POSTS) add(1, { key: `dpost${x}${z}`, mat: mat.trim, size: [0.09, post, 0.09], pos: [x, GL + PIER_DECK + post / 2, z], group: 'deck', apart: [0, -0.75, 0] });
  add(2, { key: 'span-f', mat: mat.trim, size: [2.74, 0.18, 0.04], pos: [1.45, FT - 0.11, 2.9], group: 'deck', apart: [0, -0.3, 0] });
  for (const x of [0.08, 2.82]) add(2, { key: `span-s${x}`, mat: mat.trim, size: [0.04, 0.18, 1.36], pos: [x, FT - 0.11, 2.2], group: 'deck', apart: [0, -0.3, 0] });
  add(3, { key: 'rail', geo: railGeometry('home-deck', [[0.12, 2.84], [2.78, 2.84], [2.78, 1.56]], 0.95, 0.9), mat: mat.steel, pos: [0, FT, 0], group: 'deck', apart: [0, 0.9, 0] });
  add(4, { key: 'steps', geo: carriedStairGeometry('home-4', STEPS.width, STEPS.rise, STEPS.run, STEPS.risers, STEPS.seat), mat: [mat.deck, mat.trim], pos: [STEPS.x, GL, STEPS.z], group: 'deck', apart: [-0.9, 0, 0] });
  // A shade over the window and one over the door and its sidelights.
  for (const [x, w] of [
    [-0.51, 1.7],
    [1.73, 2.1],
  ])
    add(5, { key: `shade${x}`, mat: mat.polycarb, size: [w, 0.03, 0.55], pos: [x, FB + 2.26, FACE.z + 0.3], rotX: 0.2, group: 'shade' });
  add(6, { key: 'sloped-roof', geo: slopedRoofGeometry(ROOF.len, ROOF.depth, ROOF.rise, ROOF.eave), mat: mat.plate, pos: [0, TOP, 0], group: 'roof' });
  add(7, { key: 'solar', geo: solarGeometry(), mat: mat.solar, pos: [0, TOP, 0], group: 'roof', apart: [0, 0.75, 0] });

  return P;
}

let PARTS: Part[] | null = null;
const parts = () => (PARTS ??= buildParts());

/**
 * The opening's burst: how far each of the three stands from home once it
 * has come apart. `lift`: the house leaves its foundation. `out`: the
 * add-ons leave the module (the roof and its panels upwards, the shades
 * forwards, the deck with its steps and piers to the side, clear of the
 * house's end). The deck goes up with the house first: left on the ground
 * it read as part of the foundation. The second burst: `follow`, how far
 * a group goes as the module opens (the roof and the shades keep their
 * places over the concrete as it rises), and `parts`, how far when its
 * own turn comes; `of`: which of the three it comes apart with.
 */
type Layer = 'foundation' | 'module' | 'addons';
const BURST_AT: Record<Group3, { lift: V3; out: V3; follow: V3; parts: V3; of: Layer }> = {
  foundation: { lift: [0, 0, 0], out: [0, 0, 0], follow: [0, 0, 0], parts: [0, 0, 0], of: 'foundation' },
  module: { lift: [0, 1.9, 0], out: [0, 0, 0], follow: [0, 0, 0], parts: [0, 0, 0], of: 'module' },
  roof: { lift: [0, 1.9, 0], out: [0, 1.7, 0], follow: [0, OPEN.concrete - 1.3, 0], parts: [0, 0, 0], of: 'addons' },
  shade: { lift: [0, 1.9, 0], out: [0, 0.25, 1.5], follow: [0, OPEN.concrete, 0.5], parts: [0, 0, 0], of: 'addons' },
  deck: { lift: [0, 1.9, 0], out: [4.5, 0, 0.3], follow: [0, 0, 0], parts: [0.8, 0, 0.4], of: 'addons' },
};
const NONE: V3 = [0, 0, 0];
const opened = { foundation: 0, module: 0, addons: 0 };

/** Where the pointer-highlight lands for each add-on tag. */
const TAG_ANCHOR: V3[] = [
  [1.45, FT, 2.2],
  [2.7, GL + 0.5, 2.78],
  [1.45, FT - 0.11, 2.92],
  [2.78, FT + 0.95, 2.2],
  [STEPS.x + 0.5, GL + 0.42, 2.2],
  [1.73, FB + 2.26, 2.0],
  [0, RT + 0.65, 0.4],
  [0, RT + 0.8, -0.1],
];

const CAM: CameraKey[] = [
  { p: 0, look: [0.3, 2.75, 0.4], pos: [11.5, 7.4, 15] },
  { p: BURST.lift[1], look: [0.4, 3.5, 0.8], pos: [14.6, 8.6, 19] },
  { p: BURST.out[1], look: [1.7, 4.0, 1.1], pos: [19.2, 9.8, 23.2] },
  { p: BURST.parts.foundation[0], look: [1.7, 4.0, 1.1], pos: [19.5, 9.8, 23.0] },
  // The second burst reaches fifteen metres up: the camera stands back for it, and lower, so that each box is seen from its side.
  { p: BURST.parts.addons[1], look: [1.2, 7.5, 0.6], pos: [25.8, 14.5, 32.6] },
  { p: BURST.holdTo, look: [1.2, 7.5, 0.6], pos: [26.2, 14.4, 32.3] },
  { p: 0.3, look: [0, 0.9, 0.3], pos: [7.4, 4.9, 10.2] },
  { p: 0.42, look: [0, 1.0, 0.3], pos: [8.2, 4.6, 9.6] },
  { p: 0.52, look: [0, 2.7, 0], pos: [11, 8.2, 14] },
  { p: 0.7, look: [0, 2.8, 0.2], pos: [9.6, 8.6, 15] },
  { p: 0.8, look: [0.3, 2.7, 1.0], pos: [11.6, 7.2, 16.8] },
  { p: 1, look: [0.3, 2.9, 1.0], pos: [13.2, 8.0, 17.4] },
];

/** Where the studio's floor starts to fall away into the dark, and where it is gone, in metres from the camera. */
const FOG: [number, number] = [30, 80];

function Director({ progress, rig }: Pick<SceneProps, 'progress'> & { rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const c = sampleCamera(CAM, clock(progress.value));
    aim(camera, c.pos, c.look, size.width / size.height, 1.45, 0.5);
    rig.lightTarget.set(0, 0, 0);
    /*
     * The dark falls behind the house, never over it. Where the camera
     * stands farther back than the fog begins (the second burst; any pose
     * on a narrow screen, which stands twice as far), the fog stands back
     * with it. On a phone the opening used to be drawn through it, at
     * half its brightness, and the second burst would not have shown.
     */
    const fog = scene.fog;
    if (fog instanceof Fog) {
      const p = camera.position;
      const near = Math.max(FOG[0], Math.hypot(p.x - c.look[0], p.y - c.look[1], p.z - c.look[2]));
      fog.near = near;
      fog.far = near + FOG[1] - FOG[0];
    }
  });
  return null;
}

function TerrainGrid({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<LineSegments<BufferGeometry, LineBasicMaterial>>(null);
  const geo = useMemo(
    () =>
      memo('grid-1m', () => {
        const pts: number[] = [];
        const R = 14;
        for (let i = -R; i <= R; i++) pts.push(-R, 0, i, R, 0, i, i, 0, -R, i, 0, R);
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pts, 3));
        return g;
      }),
    [],
  );
  useFrame(() => {
    const m = ref.current;
    if (m) m.material.opacity = 0.04 + 0.1 * hold(clock(progress.value), FOUNDATION.from - 0.02, 0.5, 0.04);
  });
  return (
    <lineSegments ref={ref} geometry={geo} position-y={GL + 0.004}>
      <lineBasicMaterial color="#f2f0eb" transparent opacity={0.03} />
    </lineSegments>
  );
}

/**
 * The spray: a portal that travels the length of the shell as the concrete
 * goes on, so the coat has somewhere to come from. No particles.
 */
function SprayArch({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const p = clock(progress.value);
    const [c0, c1] = MODULE.concrete;
    const v = hold(p, c0 - 0.012, c1 + 0.004, 0.01);
    g.visible = v > 0.01;
    if (!g.visible) return;
    g.position.x = -3.35 + 6.7 * clamp01((p - c0) / (c1 - c0));
    g.scale.set(1, Math.max(0.0001, v), 1);
  });
  const h = RT + 0.75 - GL;
  return (
    <group ref={ref} visible={false} position-y={GL}>
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={UNIT_BOX} material={mat.galv} scale={[0.07, h, 0.07]} position={[0, h / 2, sz * 2.05]} />
      ))}
      <mesh geometry={UNIT_BOX} material={mat.galv} scale={[0.07, 0.07, 4.17]} position={[0, h, 0]} />
      {/* The spray bars, facing the walls and the roof. */}
      {[-1, 1].map((sz) => (
        <mesh key={`n${sz}`} geometry={UNIT_BOX} material={mat.steel} scale={[0.05, COAT_H - 0.3, 0.05]} position={[0, FB - GL + COAT_H / 2, sz * 1.9]} />
      ))}
      <mesh geometry={UNIT_BOX} material={mat.steel} scale={[0.05, 0.05, 3]} position={[0, h - 0.22, 0]} />
    </group>
  );
}

function Home({ progress, place, compact }: SceneProps) {
  const refs = useRef<(Mesh | null)[]>([]);
  const list = parts();
  const label = useLabel(place);

  useFrame(() => {
    const p = clock(progress.value);
    const overview = p < BURST.clearTo;
    // The opening: the house off its foundation, then the add-ons off the house; then each of the three into its parts; then all of it away.
    const lifted = win(p, BURST.lift[0], BURST.lift[1], ease.inOutCubic);
    const apart = win(p, BURST.out[0], BURST.out[1], ease.inOutCubic);
    opened.foundation = win(p, BURST.parts.foundation[0], BURST.parts.foundation[1], ease.inOutCubic);
    opened.module = win(p, BURST.parts.module[0], BURST.parts.module[1], ease.inOutCubic);
    opened.addons = win(p, BURST.parts.addons[0], BURST.parts.addons[1], ease.inOutCubic);
    const leave = win(p, BURST.holdTo, BURST.clearTo, ease.in);
    // The shell is closed: what is inside it is no longer drawn.
    const sealed = p >= MODULE.fit[1];

    for (let i = 0; i < list.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const d = list[i];
      const base = d.size ?? ONE;
      let x = d.pos[0];
      let y = d.pos[1];
      let z = d.pos[2];
      let s = 1;
      // How much of its own length is there (a coat being sprayed on).
      let along = 1;

      if (overview) {
        const b = BURST_AT[d.group];
        const o = opened[b.of];
        // The finished house, whole: nothing of its inside, until the module opens.
        if (d.inner && o <= 0) s = 0;
        else {
          const a = d.apart ?? NONE;
          const f = opened.module;
          x += b.lift[0] * lifted + b.out[0] * apart + b.follow[0] * f + (b.parts[0] + a[0]) * o;
          y += b.lift[1] * lifted + b.out[1] * apart + b.follow[1] * f + (b.parts[1] + a[1]) * o + leave * 9;
          z += b.lift[2] * lifted + b.out[2] * apart + b.follow[2] * f + (b.parts[2] + a[2]) * o;
          s = 1 - leave;
          if (d.kind === 'screw') m.rotation.y = 0;
        }
      } else if (sealed && d.inner) {
        s = 0;
      } else {
        const raw = clamp01((p - d.win[0]) / (d.win[1] - d.win[0]));
        if (d.kind === 'coat') {
          s = raw > 0 ? 1 : 0;
          along = raw;
          const back = ((d.span ?? 0) / 2) * (1 - raw);
          // A part turned a quarter runs along z: its own −x end is the +z one.
          if (d.rotY) z += back;
          else x -= back;
        } else {
          const t = ease.outQuart(raw);
          x += d.from[0] * (1 - t);
          y += d.from[1] * (1 - t);
          z += d.from[2] * (1 - t);
          s = raw <= 0 ? 0 : d.kind === 'slide' ? 1 : Math.min(1, raw * 6);
          if (d.kind === 'screw') {
            // Further adjustment is done on the jack: turned up to its load once what it carries has landed.
            const turn = win(p, d.win[1] + 0.012, d.win[1] + 0.05, ease.inOut);
            if (d.geo === SCREW) y -= (1 - turn) * 0.06;
            m.rotation.y = turn * Math.PI * 6;
          }
        }
      }

      m.visible = s > 0.001 && along > 0.001;
      m.position.set(x, y, z);
      m.scale.set(base[0] * s * along, base[1] * s, base[2] * s);
    }

    /* The three, each named as it is shown. */
    const here = 1 - leave;
    const named = (at: number) => clamp01((p - at) / 0.012) * here;
    const b = BURST_AT;
    // Each stays on its own thing as that comes apart: the corner footing, the middle one of the module's three, the roof.
    label('layer-foundation', (compact ? -2.2 : -3.3) - OPEN.footing * opened.foundation, GL + 0.55, 1.62 + OPEN.footing * opened.foundation, named(BURST.words[0]));
    label('layer-module', compact ? -2.2 : -3.06, FB + 1.7 + b.module.lift[1] * lifted + OPEN.panels * opened.module, 1.56, named(BURST.words[1]));
    label('layer-addons', compact ? -1.6 : -2.6, TOP + 0.75 + b.roof.lift[1] * lifted + b.roof.out[1] * apart + b.roof.follow[1] * opened.module, 1.3, named(BURST.words[2]));

    const f = (a: number) => hold(p, a, FOUNDATION.to + 0.005, 0.015);
    label('plug-footing', 3, GL + 0.15, 1.5, f(FOUNDATION.from + 0.075));
    label('l-plinth', -1.2, GL + ABOVE, 1.5, f(FOUNDATION.from + 0.135));
    label('above-ground', 3.55, GL + ABOVE / 2, 1.5, f(FOUNDATION.from + 0.12));

    // The module's three parts, each named while it goes up.
    label('part-frame', -2.95, RT, 1.45, hold(p, MODULE.frame[0] + 0.03, MODULE.frame[1] + 0.006, 0.012));
    label('part-panels', bayX0, FT + 2.0, 1.52, hold(p, MODULE.panels[0] + 0.035, MODULE.panels[1] + 0.008, 0.012));
    label('part-concrete', bayX0 + BAY, FT + 2.1, 1.56, hold(p, MODULE.concrete[0] + 0.018, MODULE.fit[1], 0.012));

    // The jack pier is named when the deck's posts have come down on it.
    const pier = PIERS[1];
    label('jack-pier', pier.x, GL + pier.top, pier.z, hold(p, addOnWindow(1)[1], addOnWindow(3)[1], 0.012));

    // What is optional says so (client, 2026-10-10): the deck, the steps and the roof are each tagged an add-on as they land, and stay tagged.
    const landed = (i: number) => win(p, addOnWindow(i)[1] - 0.004, addOnWindow(i)[1] + 0.01, ease.linear);
    // The deck's tag stands at its far end, the jack pier's name at the near one: the steps' tag has the middle to itself.
    label('addon-deck', 2.62, FT, 2.88, landed(0));
    label('addon-steps', STEPS.x + 0.25, GL + 0.52, STEPS.z + STEPS.width / 2, landed(4));
    label('addon-roof', -2.1, TOP + 0.42, 1.25, landed(6));

    const tag = progress.focus;
    const anchor = tag >= 0 ? TAG_ANCHOR[tag] : null;
    label('addon', anchor?.[0] ?? 0, anchor?.[1] ?? 0, anchor?.[2] ?? 0, anchor && p > ADDONS.from ? 1 : 0);
  });

  return (
    <>
      {list.map((d, i) => (
        <mesh
          key={d.key}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={d.geo ?? UNIT_BOX}
          material={d.mat}
          rotation={[d.rotX ?? 0, d.rotY ?? 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

const ONE: V3 = [1, 1, 1];
const SCREW = jackScrewGeometry();
const bayX0 = bayX(0);

/**
 * The ground the foundation sits in. While the footings and the plinth go
 * in it is see-through, so the 220 mm that is buried reads. Then it closes
 * round them, as backfill does, and stays: the deck's posts, the steps and
 * their jack piers have ground to stand on. Closed, it is a solid block
 * drawn with everything else (a see-through one is drawn again over the
 * picture, about a millisecond a frame on the test laptop).
 */
const GROUND = { color: '#6b5440', size: [9.4, GL, 7.2] as V3, at: [0, GL / 2, 0.75] as V3, closeFrom: 0.47, closeTo: 0.53 };

function GroundBlock({ progress }: Pick<SceneProps, 'progress'>) {
  const glass = useRef<Mesh>(null);
  const solid = useRef<Mesh>(null);
  const seeThrough = useMemo(() => new MeshStandardMaterial({ color: GROUND.color, roughness: 1, transparent: true, opacity: 0, depthWrite: false }), []);
  const closed = useMemo(() => new MeshStandardMaterial({ color: GROUND.color, roughness: 1 }), []);
  useFrame(() => {
    const p = clock(progress.value);
    const isClosed = p >= GROUND.closeTo;
    const o = isClosed ? 0 : win(p, FOUNDATION.from - 0.03, FOUNDATION.from + 0.01, ease.inOut) * (0.42 + 0.58 * win(p, GROUND.closeFrom, GROUND.closeTo, ease.inOut));
    seeThrough.opacity = o;
    if (glass.current) glass.current.visible = o > 0.005;
    if (solid.current) solid.current.visible = isClosed;
  });
  return (
    <>
      <mesh ref={glass} material={seeThrough} position={GROUND.at} renderOrder={5} visible={false} receiveShadow>
        <boxGeometry args={GROUND.size} />
      </mesh>
      <mesh ref={solid} material={closed} position={GROUND.at} visible={false} receiveShadow>
        <boxGeometry args={GROUND.size} />
      </mesh>
    </>
  );
}

function Components(props: SceneProps & { rig: Rig }) {
  return (
    <>
      <Director progress={props.progress} rig={props.rig} />
      <TerrainGrid progress={props.progress} />
      <Home {...props} />
      <SprayArch progress={props.progress} />
      <GroundBlock progress={props.progress} />
    </>
  );
}

export default function ComponentsScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioDark" ground="floor" focus={[0.65, 0.55]} focusCompact={[0.5, 0.38]} shadowExtent={13} fogRange={FOG}>
      {(rig) => <Components {...props} rig={rig} />}
    </Stage>
  );
}
