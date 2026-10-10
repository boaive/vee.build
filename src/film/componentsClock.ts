/**
 * The clock of "Componentized building". Nothing but numbers in here, so
 * that the captions (data/narrative.ts) and the choreography
 * (componentsTimeline.ts) can both read it.
 *
 * Everything in the film is timed on the clock it had when it was eight
 * screens long: the opening took 0 to 0.25 of it and the three chapters
 * the rest. The opening has since been given a second burst, and a screen
 * more of scroll to show it in (developer, 2026-10-10). So the scroll's
 * 0–1 is not the clock any more: the opening's stretch of the scroll runs
 * the clock slowly, and what follows keeps the scroll it had.
 */
const OPENING = { clock: 0.25, scroll: 0.34 } as const;

/** Scroll progress (0–1) to the film's clock. */
export function clock(p: number): number {
  if (p <= OPENING.scroll) return (p / OPENING.scroll) * OPENING.clock;
  return OPENING.clock + ((p - OPENING.scroll) / (1 - OPENING.scroll)) * (1 - OPENING.clock);
}

/** A time on the clock to its place on the scroll: where a caption begins, where a pose is settled. */
export function scrollAt(t: number): number {
  if (t <= OPENING.clock) return (t / OPENING.clock) * OPENING.scroll;
  return OPENING.scroll + ((t - OPENING.clock) / (1 - OPENING.clock)) * (1 - OPENING.scroll);
}
