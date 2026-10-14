/**
 * One building framed alone: the camera as near as the building's box
 * allows inside a picture of a given shape. For the phone's hero
 * (HeroMobileScene) and the product pages' compact stage
 * (ShowcaseStudioScene), where each building stands alone on the polished
 * floor and is the whole subject of the picture (the mobile and tablet
 * round, 2026-10-14: "more on the product itself").
 *
 * Pure geometry on a probe camera: nothing here touches a scene. A picture
 * is composed with the stage's own lens across its height; in a band
 * (Stage, `frame`) the band is that picture.
 */
import { Vector3, type PerspectiveCamera } from 'three';
import { clamp01, ease, lerp } from '../../film/timeline';
import { FARM_YAW, type Box } from './row';

/** The stage's lens (Stage, BASE_FOV). */
export const LENS = 28;

/** The institutional building's box on its own plan (kit/buildings.tsx, InstitutionalBlock), its porch canopy included. */
export const INST_BOX: Box = [-16.7, 16.7, -5.75, 7.0, 11.0];

export interface Shot {
  box: Box;
  /** Its ground line. */
  base: number;
  /** Bearing from the building's own front, at the two ends of its turn (radians; positive: towards its right end). */
  turn: [number, number];
  /** Elevation of the line of sight. */
  el: number;
  /** How much of the picture's width and height it may take (of the half-size, from the middle). */
  fill: [number, number];
  /**
   * A long building seen along its length: the side whose end is kept whole,
   * at this much of the picture's half-width; the far end may run off the
   * other edge (the developer's reference for the institutional building).
   */
  anchor?: { side: 1 | -1; at: number };
  /** How far over the middle of the picture the box stands, in its half-height (0.07 unless given): room under it for its reflection and what stands at the foot. */
  lift?: number;
}

export interface Pose {
  look: Vector3;
  d: number;
  az: number;
  el: number;
}

const C = Math.cos(FARM_YAW);
const S = Math.sin(FARM_YAW);
const _p = new Vector3();
const _dir = new Vector3();
const _right = new Vector3();
const _up = new Vector3();

/** A point on a building's own plan, as it stands turned with the floor's slabs (FARM_YAW). */
export const turned = (x: number, z: number): [number, number] => [x * C + z * S, -x * S + z * C];

/** A building's box as it stands, turned with the floor's slabs: its eight corners. */
export function cornersOf(shot: Shot) {
  const [x0, x1, z0, z1, h] = shot.box;
  const out: Vector3[] = [];
  for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [0, h]) out.push(new Vector3(x * C + z * S, shot.base + y, -x * S + z * C));
  return out;
}

export const dirOf = (az: number, el: number, out: Vector3) => out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));

/**
 * The camera on one building, for a picture of this shape: as near as its
 * box allows inside `fill`, the box centred, a little high so that its
 * reflection has the floor under it.
 */
export function poseFor(probe: PerspectiveCamera, shot: Shot, corners: Vector3[], turn: number, aspect: number, fixed?: number): Pose {
  const az = FARM_YAW + turn;
  dirOf(az, shot.el, _dir);
  probe.fov = LENS;
  probe.aspect = aspect;
  probe.clearViewOffset();
  probe.updateProjectionMatrix();
  const look = new Vector3();
  for (const q of corners) look.add(q);
  look.multiplyScalar(1 / corners.length);
  const [fx, fy] = shot.fill;
  const half = Math.tan((LENS * Math.PI) / 360);
  let d = 30;
  const bounds = [0, 0, 0, 0];
  const place = (dist: number) => {
    probe.position.copy(look).addScaledVector(_dir, dist);
    probe.lookAt(look);
    probe.updateMatrixWorld();
    bounds[0] = bounds[2] = Infinity;
    bounds[1] = bounds[3] = -Infinity;
    for (const q of corners) {
      _p.copy(q).project(probe);
      bounds[0] = Math.min(bounds[0], _p.x);
      bounds[1] = Math.max(bounds[1], _p.x);
      bounds[2] = Math.min(bounds[2], _p.y);
      bounds[3] = Math.max(bounds[3], _p.y);
    }
    return Math.max(-bounds[0], bounds[1]) <= fx && Math.max(-bounds[2], bounds[3]) <= fy;
  };
  for (let it = 0; it < 3; it++) {
    // At a distance given (another building's: the two then stand to one scale), or as near as the box allows.
    if (fixed) d = fixed;
    else {
      let lo = 2;
      let hi = 900;
      for (let k = 0; k < 26; k++) {
        const mid = (lo + hi) / 2;
        if (place(mid)) hi = mid;
        else lo = mid;
      }
      d = hi;
    }
    place(d);
    // Centred: the look point moves across the picture, the camera with it.
    _right.setFromMatrixColumn(probe.matrixWorld, 0);
    _up.setFromMatrixColumn(probe.matrixWorld, 1);
    look.addScaledVector(_right, ((bounds[0] + bounds[1]) / 2) * d * half * aspect);
    look.addScaledVector(_up, ((bounds[2] + bounds[3]) / 2 + (shot.lift ?? 0.07)) * d * half);
  }
  if (shot.anchor) {
    // The near end whole, inside the picture; the far end runs off the other edge.
    place(d);
    const { side, at } = shot.anchor;
    const edge = side > 0 ? bounds[1] : -bounds[0];
    _right.setFromMatrixColumn(probe.matrixWorld, 0);
    look.addScaledVector(_right, side * (edge - at) * d * half * aspect);
  }
  return { look, d, az, el: shot.el };
}

/**
 * The camera on one building, framed inside a rectangle of the canvas
 * (`rect`: left, top, right, bottom in canvas pixels), through the camera's
 * own projection as it stands (`probe` carries its lens, shape and view
 * offset: Stage, `frame`). As near as the box allows inside `fill` of the
 * rectangle, centred in it. For a part of the screen that is not the
 * film's band: the opening card's room between its headline and its cards.
 */
export function poseInRect(probe: PerspectiveCamera, shot: Shot, corners: Vector3[], turn: number, rect: [number, number, number, number], w: number, h: number, fixed?: number): Pose {
  const az = FARM_YAW + turn;
  dirOf(az, shot.el, _dir);
  // The rectangle in the projection's own units (x right, y up, -1 to 1).
  const x0 = (rect[0] / w) * 2 - 1;
  const x1 = (rect[2] / w) * 2 - 1;
  const y0 = 1 - (rect[3] / h) * 2;
  const y1 = 1 - (rect[1] / h) * 2;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = ((x1 - x0) / 2) * shot.fill[0];
  const hy = ((y1 - y0) / 2) * shot.fill[1];
  const look = new Vector3();
  for (const q of corners) look.add(q);
  look.multiplyScalar(1 / corners.length);
  const bounds = [0, 0, 0, 0];
  const place = (dist: number) => {
    probe.position.copy(look).addScaledVector(_dir, dist);
    probe.lookAt(look);
    probe.updateMatrixWorld();
    bounds[0] = bounds[2] = Infinity;
    bounds[1] = bounds[3] = -Infinity;
    for (const q of corners) {
      _p.copy(q).project(probe);
      bounds[0] = Math.min(bounds[0], _p.x);
      bounds[1] = Math.max(bounds[1], _p.x);
      bounds[2] = Math.min(bounds[2], _p.y);
      bounds[3] = Math.max(bounds[3], _p.y);
    }
    return (bounds[1] - bounds[0]) / 2 <= hx && (bounds[3] - bounds[2]) / 2 <= hy;
  };
  let d = 30;
  for (let it = 0; it < 4; it++) {
    if (fixed) d = fixed;
    else {
      let lo = 2;
      let hi = 900;
      for (let k = 0; k < 26; k++) {
        const mid = (lo + hi) / 2;
        if (place(mid)) hi = mid;
        else lo = mid;
      }
      d = hi;
    }
    place(d);
    // Moved across the picture until the box's middle is the rectangle's (the projection's scale at that distance).
    const p = probe.projectionMatrix.elements;
    _right.setFromMatrixColumn(probe.matrixWorld, 0);
    _up.setFromMatrixColumn(probe.matrixWorld, 1);
    look.addScaledVector(_right, (((bounds[0] + bounds[1]) / 2 - cx) * d) / p[0]);
    look.addScaledVector(_up, (((bounds[2] + bounds[3]) / 2 - (cy + (shot.lift ?? 0.07) * hy)) * d) / p[5]);
  }
  return { look, d, az, el: shot.el };
}

/** Framings worked out along a building's turn: between two of them the camera is interpolated. */
export const SAMPLES = 8;

/** A building's framings along its turn, for a picture of this shape. */
/**
 * A building's framings along its turn, for a picture of this shape. `scale`:
 * another building's framings, whose distances these take, so that the two
 * are seen to one scale (developer, 2026-10-14: "the user must understand
 * the actual size by looking it").
 */
export function posesAlong(probe: PerspectiveCamera, shot: Shot, corners: Vector3[], aspect: number, scale?: Pose[]): Pose[] {
  return Array.from({ length: SAMPLES + 1 }, (_, j) => poseFor(probe, shot, corners, lerp(shot.turn[0], shot.turn[1], j / SAMPLES), aspect, scale?.[j]?.d));
}

/** Part way from one framing to another, into `out` (which may be either). */
export function blend(a: Pose, b: Pose, t: number, out: Pose) {
  const d = Math.exp(lerp(Math.log(a.d), Math.log(b.d), t));
  const az = lerp(a.az, b.az, t);
  const el = lerp(a.el, b.el, t);
  out.look.lerpVectors(a.look, b.look, t);
  out.d = d;
  out.az = az;
  out.el = el;
  return out;
}

/** A building's framing `u` (0–1) of the way along its turn, eased at both ends, into `out`. */
export function poseAt(list: Pose[], u: number, out: Pose, eased = true) {
  const x = (eased ? ease.inOut(clamp01(u)) : clamp01(u)) * SAMPLES;
  const j = Math.min(SAMPLES - 1, Math.floor(x));
  return blend(list[j], list[j + 1], x - j, out);
}

/** The camera's position for a framing, into `pos` and `look` (arrays of three). */
export function placeOf(pose: Pose, pos: number[], look: number[]) {
  dirOf(pose.az, pose.el, _dir);
  for (let k = 0; k < 3; k++) {
    look[k] = pose.look.getComponent(k);
    pos[k] = look[k] + _dir.getComponent(k) * pose.d;
  }
}

export const newPose = (): Pose => ({ look: new Vector3(), d: 1, az: 0, el: 0 });
