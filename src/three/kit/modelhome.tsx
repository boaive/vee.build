/**
 * The hero's house: one 6 × 3 m shell as the client drew it (assets/new
 * assets/CAPSULE HOUSE.pdf, notes H8), with the kit's sloped roof and solar
 * panels kept on top. Rendered walls, a two-pane window, a glazed door
 * between two gridded sidelights, a clerestory on the end, a low landing
 * with a lattice deck, a black rail of rectangular loops and timber steps,
 * and a precast footing under each corner.
 *
 * Used by the hero only. Every other scene keeps the kit's own shell
 * (parts.ts) and its rule-based add-ons (house.tsx).
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DoubleSide, MeshStandardMaterial, type BufferGeometry, type Group, type Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { baseOf, type Unit } from '../../build/model';
import type { Foundation } from '../../data/build';
import { ease, win } from '../../film/timeline';
import type { BuildingProps } from './buildings';
import { box, memo, merge, mergeGroups } from './geometry';
import { FoundationParts } from './house';
import { deckMat, mat, shellMat, trimMat } from './materials';
import { MODULE, slopedRoofGeometry, stairGeometry } from './parts';
import { latticeCard, tile } from './pbr';
import { boxUV } from './textures';

/** Shell A: 6 × 3 m on plan. */
const L = 6;
const D = 3;
const { H, inset: INSET } = MODULE;
/** Height of the plain bands that run round the top and the foot of the walls. */
const BAND = { top: 0.15, foot: 0.14 };

/** Low footings, no plinth: the house sits close to the ground, as drawn. */
export const HOME_FOUNDATION: Foundation = { h: 0, type: 'footings' };
const UNDERSIDE = baseOf(HOME_FOUNDATION);
const HOME_UNITS: Unit[] = [{ id: 1, t: 'A', x: 0, z: 0, y: 0, r: 0 }];

/** Footprint the set keeps clear of grass, in metres from the shell's centre. */
export const HOME_FOOTPRINT = { x0: -L / 2, x1: L / 2, z0: -D / 2, z1: D / 2 };
/** A porch light over the door. */
export const HOME_LAMP: [number, number, number] = [1.715, UNDERSIDE + 2.42, D / 2 + 0.1];

/* ------------------------------------------------------------------ */
/* Openings (measured on the client's front elevation, notes H8)       */
/* ------------------------------------------------------------------ */

type Face = 'front' | 'back' | 'right';
interface Opening {
  face: Face;
  /** Outer edge of the white frame along the face (x on the front and back, z on the end) and above the underside. */
  u0: number;
  u1: number;
  y0: number;
  y1: number;
  /** Width of the white frame. */
  f: number;
  kind: 'window' | 'sidelight' | 'door' | 'light';
}

/*
 * On the 6 m front the client's window takes 1.5 m and the door with its two
 * sidelights under 2 m; every head lines up 0.9 m below the roof edge. The
 * wall is mostly wall, which is what makes the shell read as long.
 */
const HEAD = 2.1;
const DOOR = { u0: 1.25, u1: 2.18, y0: BAND.foot };
const OPENINGS: Opening[] = [
  { face: 'front', u0: -1.26, u1: 0.24, y0: 0.88, y1: HEAD, f: 0.09, kind: 'window' },
  { face: 'front', u0: 0.75, u1: 1.15, y0: 0.3, y1: HEAD, f: 0.05, kind: 'sidelight' },
  { face: 'front', u0: DOOR.u0, u1: DOOR.u1, y0: DOOR.y0, y1: HEAD, f: 0.05, kind: 'door' },
  { face: 'front', u0: 2.29, u1: 2.71, y0: 0.3, y1: HEAD, f: 0.05, kind: 'sidelight' },
  { face: 'right', u0: -1.1, u1: 0.3, y0: 2.0, y1: 2.5, f: 0.07, kind: 'light' },
  { face: 'back', u0: -1.3, u1: 0.1, y0: 0.9, y1: HEAD, f: 0.09, kind: 'window' },
  { face: 'back', u0: -2.6, u1: -2.05, y0: 1.5, y1: 2.15, f: 0.07, kind: 'light' },
];

/**
 * The shell. Origin: centre of the footprint, underside at y = 0. Rendered
 * from the ground line to the roof edge, with a plain band at the top and
 * the foot, as drawn.
 * Groups: 0 rendered walls, 1 dark trim, 2 glass, 3 white joinery.
 */
function homeShellGeometry(): BufferGeometry {
  return memo('model-home-shell-v2', () => {
    const xf = L / 2 - INSET;
    const zf = D / 2 - INSET;

    const body = new RoundedBoxGeometry(L - INSET * 2, H, D - INSET * 2, 2, 0.035);
    body.translate(0, H / 2, 0);
    const walls: BufferGeometry[] = [body, box(L, BAND.top, D, 0, H - BAND.top / 2, 0), box(L, BAND.foot, D, 0, BAND.foot / 2, 0), box(L - 0.06, 0.02, D - 0.06, 0, H + 0.005, 0)];
    walls.forEach((g) => boxUV(g, 1.5));
    const dark: BufferGeometry[] = [];
    const glass: BufferGeometry[] = [];
    const white: BufferGeometry[] = [];

    // A box on a face: (along, up, out) in face coordinates.
    const on = (f: Face, u: number, y: number, out: number, w: number, h: number, t: number) => {
      if (f === 'front') return box(w, h, t, u, y, zf + out);
      if (f === 'back') return box(w, h, t, u, y, -zf - out);
      return box(t, h, w, xf + out, y, u);
    };

    for (const o of OPENINGS) {
      const put = (list: BufferGeometry[], u: number, y: number, w: number, h: number, out: number, t: number) => list.push(on(o.face, u, y, out, w, h, t));
      const cu = (o.u0 + o.u1) / 2;
      const cy = (o.y0 + o.y1) / 2;
      const w = o.u1 - o.u0;
      const h = o.y1 - o.y0;
      // Clear opening inside the frame.
      const iw = w - o.f * 2;
      const ih = h - o.f * 2;
      // Frame: head, sill, jambs.
      put(white, cu, o.y1 - o.f / 2, w, o.f, 0.024, 0.05);
      put(white, cu, o.y0 + o.f / 2, w, o.f, 0.024, 0.05);
      put(white, o.u0 + o.f / 2, cy, o.f, ih, 0.024, 0.05);
      put(white, o.u1 - o.f / 2, cy, o.f, ih, 0.024, 0.05);

      if (o.kind === 'door') {
        // Leaf: glazed upper half, a letterbox under it, two raised panels below.
        const y = o.y0 + o.f;
        put(white, cu, cy, iw, ih, 0.012, 0.03);
        put(glass, cu, y + ih * 0.7, iw * 0.7, ih * 0.5, 0.03, 0.012);
        put(dark, cu, y + ih * 0.385, 0.26, 0.04, 0.031, 0.012);
        for (const side of [-1, 1]) put(white, cu + side * iw * 0.19, y + ih * 0.19, iw * 0.27, ih * 0.27, 0.034, 0.012);
        put(dark, cu + iw * 0.4, y + 0.98, 0.03, 0.17, 0.05, 0.04);
        continue;
      }
      put(glass, cu, cy, iw, ih, 0.006, 0.012);
      if (o.kind === 'window') {
        // Two sliding panes: sash rims, a meeting stile and a projecting sill.
        put(white, cu, cy, 0.06, ih, 0.02, 0.04);
        put(white, cu, o.y0 + o.f + 0.018, iw, 0.036, 0.02, 0.04);
        put(white, cu, o.y1 - o.f - 0.018, iw, 0.036, 0.02, 0.04);
        for (const side of [-1, 1]) put(white, cu + side * (iw / 2 - 0.018), cy, 0.036, ih, 0.02, 0.04);
        put(white, cu, o.y0 - 0.015, w + 0.08, 0.03, 0.05, 0.1);
      } else if (o.kind === 'sidelight') {
        for (let k = 1; k < 5; k++) put(white, cu, o.y0 + o.f + (ih * k) / 5, iw, 0.022, 0.016, 0.03);
        put(white, cu, cy, 0.022, ih, 0.016, 0.03);
      }
    }
    return mergeGroups([walls, dark, glass, white]);
  });
}

/* ------------------------------------------------------------------ */
/* Landing: lattice deck, loop rail, timber steps                      */
/* ------------------------------------------------------------------ */

/**
 * Plan of the landing, from the shell's centre: three bays in front of the
 * door, from under the window's edge to just past the corner, as drawn.
 */
const LAND = { x0: -0.1, x1: 3.14, z0: D / 2 + 0.02, z1: D / 2 + 1.07, bay: 1.08 };
const DECK_Y = UNDERSIDE + DOOR.y0 - 0.02;
const RAIL_H = 0.95;
const STEP = { w: 0.9, run: 0.62, risers: 3 };
/** Where the steps meet the ground, for the path. */
export const HOME_STEP_FOOT: [number, number] = [LAND.x1 - LAND.bay / 2, LAND.z1 + STEP.run];
/** Everything the landing covers on plan, steps included. */
export const HOME_LANDING = { x0: LAND.x0, x1: LAND.x1, z0: LAND.z0, z1: LAND.z1 + STEP.run };

/** Timber: the deck frame and the steps. Origin on the ground under the shell's centre. */
function landingTimberGeometry(): BufferGeometry {
  return memo('model-home-landing-timber-v2', () => {
    const { x0, x1, z0, z1, bay } = LAND;
    const y = DECK_Y - 0.07;
    const cz = (z0 + z1) / 2;
    const d = z1 - z0;
    const parts: BufferGeometry[] = [box(x1 - x0, 0.14, 0.07, (x0 + x1) / 2, y, z0 + 0.035), box(x1 - x0, 0.14, 0.07, (x0 + x1) / 2, y, z1 - 0.035)];
    for (let x = x0; x <= x1 + 1e-6; x += bay) parts.push(box(0.07, 0.14, d - 0.14, Math.min(x1 - 0.035, Math.max(x0 + 0.035, x)), y, cz));
    const frame = merge(parts);
    const steps = stairGeometry('model-home-steps-v2', STEP.w, DECK_Y, STEP.run, STEP.risers).clone();
    steps.clearGroups();
    // The flight climbs along its own +x: turn it to climb towards the house.
    steps.rotateY(Math.PI / 2);
    steps.translate(HOME_STEP_FOOT[0], 0, HOME_STEP_FOOT[1]);
    const g = merge([frame, steps]);
    boxUV(g, 1);
    return g;
  });
}

/** Black metal: handrails, rectangular loop balusters, their legs, the feet of the deck. */
function landingRailGeometry(): BufferGeometry {
  return memo('model-home-landing-rail-v2', () => {
    const { x0, x1, z0, z1, bay } = LAND;
    const parts: BufferGeometry[] = [];
    const top = DECK_Y + RAIL_H;
    const BAR = 0.032;
    const loopTop = top - 0.16;
    const loopBottom = DECK_Y + 0.07;
    const loopW = 0.16;
    // A loop hung from the rail, with a leg down to the ground. `alongX`: the rail runs along x.
    const loop = (x: number, z: number, alongX: boolean) => {
      const cy = (loopTop + loopBottom) / 2;
      const h = loopTop - loopBottom;
      for (const s of [-1, 1]) parts.push(alongX ? box(BAR, h, BAR, x + (s * loopW) / 2, cy, z) : box(BAR, h, BAR, x, cy, z + (s * loopW) / 2));
      for (const yy of [loopTop, loopBottom]) parts.push(alongX ? box(loopW + BAR, BAR, BAR, x, yy, z) : box(BAR, BAR, loopW + BAR, x, yy, z));
      parts.push(box(BAR, top - loopTop, BAR, x, (top + loopTop) / 2, z), box(0.034, loopBottom, 0.034, x, loopBottom / 2, z));
    };
    const post = (x: number, z: number) => parts.push(box(0.045, top, 0.045, x, top / 2, z));

    // Front: the two bays left of the steps.
    const zr = z1 + 0.03;
    const xe = x1 - bay;
    parts.push(box(xe - x0 + 0.16, 0.07, 0.1, (x0 + xe) / 2, top + 0.035, zr));
    post(x0, zr);
    post(xe, zr);
    for (let i = 0; i < 6; i++) loop(x0 + 0.19 + (i * (xe - x0 - 0.38)) / 5, zr, true);
    // Ends: back to the wall on both sides.
    for (const x of [x0 - 0.03, x1 + 0.03]) {
      parts.push(box(0.1, 0.07, z1 - z0 + 0.12, x, top + 0.035, (z0 + z1) / 2 + 0.02));
      post(x, z0 + 0.06);
      if (x > x0) post(x, zr);
      for (let j = 0; j < 3; j++) loop(x, z0 + 0.25 + j * 0.28, false);
    }
    return merge(parts);
  });
}

/** The deck surface: an open diagonal grating, seen through to the ground. */
function landingDeckGeometry(): BufferGeometry {
  return memo('model-home-landing-deck-v2', () => {
    const { x0, x1, z0, z1 } = LAND;
    const g = box(x1 - x0 - 0.1, 0.012, z1 - z0 - 0.1, (x0 + x1) / 2, DECK_Y - 0.012, (z0 + z1) / 2);
    boxUV(g, 0.34);
    return g;
  });
}

let grating: MeshStandardMaterial | null = null;
function gratingMat() {
  if (!grating) {
    grating = new MeshStandardMaterial({ color: '#1c1d1f', map: tile(latticeCard(), 1), alphaTest: 0.5, side: DoubleSide, roughness: 0.6, metalness: 0.4 });
    grating.map?.repeat.set(1, 1);
  }
  return grating;
}

/* ------------------------------------------------------------------ */
/* Roof and solar (the kit's add-ons, kept)                            */
/* ------------------------------------------------------------------ */

/* A slimmer edge than the kit's roof: the walls now run up to the roof line, as drawn. */
const ROOF = { rise: 0.74, eave: 0.12, depth: D + 0.34, length: L + 0.3 };
const PITCH = Math.atan2(ROOF.rise - ROOF.eave, ROOF.depth);
const PANEL = { w: 1.66, d: 1.02 };

/** Height of the roof surface above the shell's top at plan depth z. */
const roofY = (z: number) => ROOF.eave + (ROOF.rise - ROOF.eave) * (0.5 - z / ROOF.depth);

/** Mono-pitch roof with standing seams. Origin: centre of the shell's top. Falls to the front. */
function roofGeometry(): BufferGeometry {
  return memo('model-home-roof-v2', () => {
    const wedge = slopedRoofGeometry(ROOF.length, ROOF.depth, ROOF.rise, ROOF.eave).clone();
    const parts: BufferGeometry[] = [wedge.index ? wedge.toNonIndexed() : wedge];
    const len = ROOF.depth / Math.cos(PITCH);
    for (let x = -ROOF.length / 2 + 0.15; x <= ROOF.length / 2 - 0.1; x += 0.5) {
      const seam = box(0.035, 0.03, len - 0.04);
      seam.rotateX(PITCH);
      seam.translate(x, roofY(0) + 0.015, 0);
      parts.push(seam.toNonIndexed());
    }
    return merge(parts);
  });
}

/** Six panels in two rows on rails. Groups: 0 panels, 1 rails. */
function solarGeometry(): BufferGeometry {
  return memo('model-home-solar-v2', () => {
    const panels: BufferGeometry[] = [];
    const rails: BufferGeometry[] = [];
    const up = 0.09;
    for (let k = 0; k < 2; k++) {
      const z = (k - 0.5) * (PANEL.d + 0.12);
      for (let c = 0; c < 3; c++) {
        const p = box(PANEL.w, 0.04, PANEL.d);
        p.rotateX(PITCH);
        p.translate((c - 1) * (PANEL.w + 0.1), roofY(z) + up, z);
        panels.push(p);
      }
      for (const dz of [-0.3, 0.3]) {
        const r = box(3 * PANEL.w + 0.5, 0.04, 0.04);
        r.translate(0, roofY(z + dz) + up - 0.045, z + dz);
        rails.push(r);
      }
    }
    return mergeGroups([panels, rails]);
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface ModelHomeProps extends Omit<BuildingProps, 'x' | 'label' | 'getShow'> {
  shellHex: string;
  deckHex: string;
  trimHex: string;
}

/**
 * `getA` 0–1: the footings are in the ground, the shell is lowered onto
 * them, the roof and panels follow, then the landing.
 */
export function ModelHome({ getA, look, shellHex, deckHex, trimHex }: ModelHomeProps) {
  const shell = useRef<Mesh>(null);
  const top = useRef<Group>(null);
  const landing = useRef<Group>(null);
  const shellMats = useMemo(() => [shellMat(shellHex), trimMat(trimHex), look.windows === 'dusk' ? mat.glassLit : mat.glass, mat.frame], [shellHex, trimHex, look]);
  const timber = deckMat(deckHex);
  const trim = trimMat(trimHex);

  useFrame(() => {
    const a = getA();
    const s = shell.current;
    if (s) {
      const t = win(a, 0, 0.6, ease.linear);
      s.visible = t > 0;
      s.position.y = UNDERSIDE + (1 - ease.outQuart(t)) * 6;
    }
    const arrive = (g: Group | null, from: number, to: number, drop: number) => {
      if (!g) return;
      const t = win(a, from, to, ease.out);
      g.visible = t > 0.001;
      g.position.y = (1 - t) * drop;
    };
    arrive(top.current, 0.56, 0.84, 2.6);
    arrive(landing.current, 0.72, 1, 1.8);
  });

  return (
    <group>
      <group position={[-L / 2, 0, -D / 2]}>
        <FoundationParts units={HOME_UNITS} foundation={HOME_FOUNDATION} />
      </group>
      <mesh ref={shell} geometry={homeShellGeometry()} material={shellMats} position-y={UNDERSIDE} castShadow receiveShadow />
      <group ref={top}>
        <group position-y={UNDERSIDE + H + 0.005}>
          <mesh geometry={roofGeometry()} material={trim} castShadow receiveShadow />
          <mesh geometry={solarGeometry()} material={[mat.solar, mat.galv]} castShadow />
        </group>
      </group>
      <group ref={landing}>
        <mesh geometry={landingTimberGeometry()} material={timber} castShadow receiveShadow />
        <mesh geometry={landingRailGeometry()} material={mat.steel} castShadow />
        <mesh geometry={landingDeckGeometry()} material={gratingMat()} castShadow receiveShadow />
      </group>
    </group>
  );
}
