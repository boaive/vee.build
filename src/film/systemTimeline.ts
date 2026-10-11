/**
 * Choreography for "How it works", shared by the 3D scene and the DOM
 * counter so both read the same numbers. No three.js in here.
 */
import { footprints } from '../data/system';
import { clamp01, lerp } from './timeline';

/** Progress at which each configuration is settled. */
export const SETTLE = [
  0.1, // the two shells, apart
  0.33, // 300
  0.38, // 400
  0.43, // 500
  0.48, // 600
  0.53, // 700
  0.58, // 800
  0.72, // the villa
  0.98, // the mid-rise
] as const;

/** Progress at which the move into each configuration starts. */
export const START = [0, 0.285, 0.348, 0.398, 0.448, 0.498, 0.548, 0.61, 0.8] as const;

export const STATE = { pair: 0, firstFootprint: 1, villa: 7, midrise: 8 } as const;

/**
 * "Lift & shift" (step 2.2): how far each finished shell is off the ground,
 * in metres. Each goes up by its own four hooks, holds and is set down
 * again, before the first of them is moved to make a footprint. Shell B
 * first, Shell A a moment after it (client, 2026-10-11: "the 3 × 3 lifts
 * first, followed by the 6 × 3"). A load on a crane starts and stops
 * gently: it eases off the ground, hangs still a moment, and is let down
 * slowly onto its seat.
 */
const LIFT = { B: [0.17, 0.246], A: [0.196, 0.272] } as const;
const LIFT_H = 0.6;
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const liftOf = (type: 'A' | 'B', p: number) => {
  const [a, b] = LIFT[type];
  const t = clamp01((p - a) / (b - a));
  return LIFT_H * Math.min(smooth(t / 0.4), 1 - smooth((t - 0.6) / 0.4));
};
/** The higher of the two, for what belongs to neither shell. */
export const liftAt = (p: number) => Math.max(liftOf('A', p), liftOf('B', p));

/** Which transition is under way: state index s and its local 0–1. */
export function locate(p: number): { s: number; t: number } {
  let s = 1;
  while (s < SETTLE.length - 1 && p > SETTLE[s]) s++;
  return { s, t: clamp01((p - START[s]) / (SETTLE[s] - START[s])) };
}

export const counterWindow = { from: 0.3, to: 0.605 };

/** The footprint counter: counts through the intermediate values as shapes change. */
export function counterAt(p: number): { sqft: number; index: number } {
  let index = 0;
  let sqft: number = footprints[0].sqft;
  for (let i = 1; i < footprints.length; i++) {
    const s = STATE.firstFootprint + i;
    const t = clamp01((p - START[s]) / (SETTLE[s] - START[s]));
    if (t > 0) {
      sqft = lerp(footprints[i - 1].sqft, footprints[i].sqft, t);
      if (t > 0.5) index = i;
    }
  }
  return { sqft: Math.round(sqft), index };
}
