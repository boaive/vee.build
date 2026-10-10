/**
 * Choreography of the installation film, "On site". Since 2026-10-11 it
 * begins with the site being made ready (client: "merge Ready before the
 * shell arrives and On site into one continuous experience"), so it has
 * three parts on two clocks.
 *
 * The scroll (0 to 1) first prepares the plot: it is pegged out, the pits
 * are dug, the plug footings are lowered in one after another, the L
 * plinths laid between them, the pits backfilled and the strings taken up
 * (`PREP`). Then, without a cut, the camera stands back as the truck comes
 * in with one shell. Scrolling past `TRIGGER` is the one deliberate act
 * that sets the shell down: from there the film runs on a clock of its
 * own, in seconds: the crane lifts the shell off the trailer and places it
 * on the foundation, the truck leaves, the rest of the building comes
 * together by itself, its add-ons land, and only then do its lights come
 * on. Scrolling back above the trigger runs that clock back.
 *
 * No three.js in here: the captions (data/narrative.ts) read the same numbers.
 */
type Span = readonly [number, number];

/**
 * The site's preparation, on the scroll: each part between its two numbers.
 * The foundation is complete at `done`; the camera leaves it for the
 * arrival's wide view over `camera`, while the truck comes in.
 */
export const PREP = {
  pegs: [0.0, 0.05] as Span,
  dig: [0.04, 0.1] as Span,
  footings: [0.09, 0.19] as Span,
  plinths: [0.17, 0.25] as Span,
  backfill: [0.235, 0.28] as Span,
  strings: [0.25, 0.29] as Span,
  done: 0.29,
  camera: [0.27, 0.46] as Span,
  /** The truck sets off down the lane. */
  truck: 0.3,
} as const;

/** The scroll: the truck is in by `arrive`; the placement starts at `trigger`, and is undone below `rewind`. */
export const INSTALL = { arrive: 0.47, trigger: 0.52, rewind: 0.495 } as const;

/** The first shell, in seconds from the trigger. */
export const PLACE = {
  /** The lifting frame comes down onto its four hooks. */
  hook: [0, 0.55] as Span,
  up: [0.55, 1.2] as Span,
  over: [1.2, 2.1] as Span,
  down: [2.1, 2.75] as Span,
  /** Down on its footings: only now does the frame let go and lift clear. */
  free: [2.8, 3.25] as Span,
  /** The truck drives off; the crane's boom is laid by. */
  truck: [2.95, 4.5] as Span,
  stow: [3.25, 4.4] as Span,
} as const;

/** Each further shell takes this long to come down, and they follow one another this closely (closer when there are many). */
const EACH = 0.78;
const GAP = 0.32;
const REST_FROM = 3.3;

/** The clock for a building of `shells` shells: when each thing happens, in seconds. */
export function installClock(shells: number) {
  const rest = Math.max(0, shells - 1);
  const gap = rest > 1 ? Math.min(GAP, 2.6 / (rest - 1)) : 0;
  const built = rest ? REST_FROM + EACH + gap * (rest - 1) : PLACE.free[1];
  const addOns: Span = [built + 0.12, built + 1.05];
  const lights: Span = [addOns[1] + 0.4, addOns[1] + 1.7];
  return {
    /** When the k-th of the remaining shells (0 first) comes down. */
    shell: (k: number): Span => [REST_FROM + gap * k, REST_FROM + gap * k + EACH],
    placed: PLACE.free[1],
    built,
    addOns,
    lights,
    end: lights[1],
  };
}

/** Where each caption begins and where its picture is settled, on the scroll. */
export const INSTALL_STEPS = {
  prep: { at: 0, pose: 0.29 },
  arrive: { at: 0.31, pose: 0.47 },
  place: { at: 0.505, pose: 0.68 },
  assemble: { at: 0.72, pose: 0.86 },
  home: { at: 0.9, pose: 1 },
} as const;

/**
 * The clock where nothing may play by itself (reduced motion, ?still): each
 * caption's settled pose shows its own stage, finished. The shell placed;
 * the building together with its add-ons; its lights on.
 */
export function stillClock(p: number, shells: number): number {
  const c = installClock(shells);
  if (p < INSTALL.trigger) return 0;
  if (p < INSTALL_STEPS.assemble.at) return c.placed;
  if (p < INSTALL_STEPS.home.at) return c.addOns[1];
  return c.end;
}
