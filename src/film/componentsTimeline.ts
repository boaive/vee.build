/**
 * Choreography for "Building components", shared by the scene and the DOM
 * tags. No three.js in here.
 */
import { addOns } from '../data/narrative';

export const EXPLODE = { from: 0.05, to: 0.14, holdTo: 0.2, clearTo: 0.25 };
export const FOUNDATION = { from: 0.26, to: 0.43 };
export const SHELL = { from: 0.44, to: 0.72 };
export const ADDONS = { from: 0.75, to: 0.97 };

const SLOT = (ADDONS.to - ADDONS.from - 0.045) / (addOns.length - 1);

/** Scroll window in which add-on i drops into place. */
export function addOnWindow(i: number): [number, number] {
  const a = ADDONS.from + i * SLOT;
  return [a, a + 0.045];
}

/** How many add-ons have landed at progress p. */
export function addOnsLanded(p: number): number {
  let n = 0;
  for (let i = 0; i < addOns.length; i++) if (p >= addOnWindow(i)[1] - 0.008) n++;
  return n;
}
