/**
 * Choreography for "Componentized building", shared by the scene and the
 * DOM tags. No three.js in here. Every number is a time on the film's
 * clock (componentsClock.ts), not scroll progress: read the scroll through
 * `clock`.
 */
import { addOns } from '../data/narrative';

export { clock, scrollAt } from './componentsClock';

/**
 * The opening: the finished house comes apart twice.
 *
 * First into the three things it is made of, one at a time (developer,
 * 2026-10-10: "easy to understand for very common people"): the house is
 * lifted off its foundation (`lift`), then the add-ons come off the module
 * (`out`). Each of the three words of the heading arrives as its thing is
 * shown (`words`: foundation, module, add-ons).
 *
 * Then each of the three comes apart into its own parts (`parts`; the same
 * day: "after fully bursting, we can burst further"), in the heading's
 * order, each along its own line so that it can still be read: the
 * footings and the plinth stand apart, the module opens into frame, panels
 * and concrete, the add-ons into their pieces. Held to `holdTo`, cleared
 * away by `clearTo`.
 */
export const BURST = {
  lift: [0.016, 0.05],
  out: [0.056, 0.09],
  words: [0.024, 0.064, 0.088],
  parts: { foundation: [0.108, 0.138], module: [0.126, 0.168], addons: [0.154, 0.188] },
  /** Where the opening is settled: everything apart. */
  pose: 0.2,
  holdTo: 0.215,
  clearTo: 0.25,
} as const;

/** How many of the heading's three words are on at clock time t. */
export function layersShown(t: number): number {
  let n = 0;
  for (const at of BURST.words) if (t >= at) n++;
  return n;
}

/** The word of the heading that is in the green: the one that has just arrived, then the one whose thing is coming apart. */
export function layerNow(t: number): number {
  const { foundation, module, addons } = BURST.parts;
  if (t >= addons[0]) return 2;
  if (t >= module[0]) return 1;
  if (t >= foundation[0]) return 0;
  return layersShown(t) - 1;
}

export const FOUNDATION = { from: 0.26, to: 0.43 };
/**
 * 3.2, the module, in the three parts the client names (2026-10-09): the
 * structural frame, the insulated panels, the micro-concrete sprayed over
 * them; then the door and the glass are fitted.
 */
export const MODULE = { frame: [0.44, 0.525], panels: [0.532, 0.638], concrete: [0.648, 0.708], fit: [0.694, 0.728] } as const;
export const ADDONS = { from: 0.75, to: 0.97 };

const SLOT = (ADDONS.to - ADDONS.from - 0.045) / (addOns.length - 1);

/** The window of the clock in which add-on i drops into place. */
export function addOnWindow(i: number): [number, number] {
  const a = ADDONS.from + i * SLOT;
  return [a, a + 0.045];
}

/** How many add-ons have landed at clock time t. */
export function addOnsLanded(t: number): number {
  let n = 0;
  for (let i = 0; i < addOns.length; i++) if (t >= addOnWindow(i)[1] - 0.008) n++;
  return n;
}
