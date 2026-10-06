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
  0.7, // villa
  0.83, // apartment
  0.98, // high-rise
] as const;

/** Progress at which the move into each configuration starts. */
export const START = [0, 0.285, 0.348, 0.398, 0.448, 0.498, 0.548, 0.61, 0.755, 0.875] as const;

export const STATE = { pair: 0, firstFootprint: 1, villa: 7, apartment: 8, highrise: 9 } as const;

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
