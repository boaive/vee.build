/**
 * Choreography of the POD page's layers film (PodLayersScene), shared by
 * the scene and the heading's words. No three.js in here; every number is
 * a place on the film's scroll, 0 to 1 (data/pod.ts, podLayerSteps, uses
 * the same places: `CHAPTER`).
 *
 * The opening, as MOD's components film opens (developer, 2026-11-09:
 * "burst first, like MOD"): the finished pod stands whole, then comes apart
 * upwards into its layers, each still whole and named as it is shown: the
 * skin lifts off (`skin`), the insulation off the frame (`insulation`), the
 * frame with the plumbing under its floor off the interior panels with
 * their wiring (`frame`). Held to `hold`, then cleared away: everything is
 * lifted out of the picture, the panels go back down into the floor.
 *
 * Then the pod is built again in the order it is made, a chapter each:
 *
 * - The frame: chassis, posts, rails, roof, each lowered onto what stands,
 *   and welded where it meets it: a few sparks at each joint in turn
 *   (`WELD`; developer, 2026-11-10: "not the welding process itself, but a
 *   minute spark that lets user understand it is welded").
 * - The services: the plumbing comes up under the floor, the floor's boards
 *   are laid over it, then the interior panels go in with their wiring on
 *   them, the walls rising from the floor, then the ceiling laid along
 *   (developer, 2026-11-10: "along with wiring there comes interior wall
 *   panels ... we dont need to show wires hanging"; the wiring follows the
 *   panels to the plan's points, kit/podLayers.ts).
 * - The insulation: rockwool unrolled from its rolls into the walls and
 *   over the ceiling ("it comes rolled in market"), then the fire barrier.
 * - The skin: its cladding hung a unit at a time and locked, the walls'
 *   then the top's ("cladding by cladding that is getting attached/locked").
 * - The fit-out: the lights come on, and the rooms are there behind the
 *   glass, furnished as the plan has them (developer, 2026-11-10: "you don't
 *   have to show adding bed and other things from the top, just skip that.
 *   once the light turns on it comes there automatically").
 *
 * Things arrive by being lowered, by coming up out of the floor or, the
 * panels and the rockwool, by being put up or unrolled in place; they leave
 * by being lifted (CLAUDE.md).
 */

/** How far apart the layers stand in the opening, a level each. */
export const LEVEL = 4.2;

export const BURST = {
  skin: [0.03, 0.075],
  insulation: [0.06, 0.105],
  frame: [0.09, 0.135],
  /** When each word of the heading (Frame, Services, Insulation, Skin, Interior) arrives: as its layer is shown. */
  words: [0.115, 0.125, 0.085, 0.055, 0.145],
  pose: 0.17,
  hold: 0.19,
  clear: [0.19, 0.235],
} as const;

/** Where each chapter's words begin (data/pod.ts, podLayerSteps `at`). */
export const CHAPTER = { frame: 0.23, services: 0.385, insulation: 0.555, skin: 0.69, fitout: 0.85 } as const;

export const FRAME = { chassis: [0.245, 0.27], posts: [0.268, 0.292], rails: [0.29, 0.314], roof: [0.312, 0.336] } as const;
/** The welds of each group, one after another along the pod, once the group stands. */
export const WELD = { posts: [0.289, 0.317], rails: [0.311, 0.339], roof: [0.333, 0.359], each: 0.0075 } as const;
export const SERVICES = { plumbing: [0.395, 0.425], deck: [0.45, 0.47], walls: [0.472, 0.505], ceiling: [0.5, 0.525] } as const;
/** The rolls run along the walls (both at once, from the head end), then over the ceiling; the barrier after. */
export const INSULATION = { walls: [0.575, 0.62], roof: [0.615, 0.64], barrier: [0.64, 0.66] } as const;
/** The walls' units, one after another along the pod, then the top's. */
export const SKIN = { walls: [0.705, 0.775], top: [0.77, 0.81] } as const;
export const INTERIOR = { lit: [0.875, 0.93] } as const;

/** A unit of cladding hung in its turn, i of n within a window: how far above its place it is (0 locked on; 99 not there yet). */
export function hung(p: number, w: readonly number[], i: number, n: number, from = 1.4): number {
  const span = w[1] - w[0];
  const each = span / (n * 0.62 + 0.38);
  const t0 = w[0] + i * each * 0.62;
  if (p < t0) return 99;
  const t = Math.min(1, (p - t0) / each);
  // Lowered onto its rails, the last few centimetres slower: hooked on and locked.
  return t >= 1 ? 0 : from * (1 - t) ** 2.4;
}

/** Weld i of n in a group's window: how far through its sparks it is at p (0 to 1), or -1 when it is not alight. */
export function weldAt(p: number, w: readonly number[], i: number, n: number): number {
  const t0 = w[0] + ((w[1] - w[0] - WELD.each) * i) / Math.max(1, n - 1);
  const t = (p - t0) / WELD.each;
  return t < 0 || t >= 1 ? -1 : t;
}

/** Which of the heading's words are on at p, and which is in the green (the one that has just arrived; in the chapters, the chapter's). */
export function wordsShown(p: number): number[] {
  return BURST.words.map((at, i) => (p >= at ? i : -1)).filter((i) => i >= 0);
}

export function wordNow(p: number): number {
  if (p >= CHAPTER.fitout) return 4;
  if (p >= CHAPTER.skin) return 3;
  if (p >= CHAPTER.insulation) return 2;
  if (p >= CHAPTER.services) return 1;
  if (p >= CHAPTER.frame) return 0;
  let last = -1;
  let t = -1;
  BURST.words.forEach((at, i) => {
    if (p >= at && at > t) {
      t = at;
      last = i;
    }
  });
  return last;
}
