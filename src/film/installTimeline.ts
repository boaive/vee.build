/**
 * Choreography of the installation film. Two clocks, as the client set it
 * out on 2026-10-10.
 *
 * The scroll (0 to 1) brings the truck in with one shell and moves the
 * camera. Scrolling past `TRIGGER` is the one deliberate act that sets the
 * shell down: from there the film runs on a clock of its own, in seconds:
 * the crane lifts the shell off the trailer and places it on the
 * foundation, the truck leaves, the rest of the building comes together by
 * itself, its add-ons land, and only then do its lights come on.
 * Scrolling back above the trigger runs that clock back.
 *
 * No three.js in here: the captions (data/narrative.ts) read the same numbers.
 */
type Span = readonly [number, number];

/** The scroll: the truck is in by `arrive`; the placement starts at `trigger`, and is undone below `rewind`. */
export const INSTALL = { arrive: 0.24, trigger: 0.3, rewind: 0.26 } as const;

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
  arrive: { at: 0, pose: 0.2 },
  place: { at: 0.28, pose: 0.5 },
  assemble: { at: 0.56, pose: 0.76 },
  home: { at: 0.84, pose: 1 },
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
