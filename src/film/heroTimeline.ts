/**
 * The hero's cuts: the progress at which one set gives way to the next.
 * Kept apart from the scene so that the captions (data/narrative.ts) can
 * change on the same number: the picture and its words go together.
 *
 * Three sets since 2026-11-07 (developer: the workforce housing banner was
 * deleted): the modular house, the capsule homes, the institutional
 * building. Each keeps the scroll it had among four (Hero.tsx, `length`):
 * the institutional set has the longest stretch after the capsule's, its
 * wall panels coming in one after another (client, 2026-10-09: "a bit
 * fast", twice the scroll).
 */
export const HERO_CUTS = [0.2173, 0.6378] as const;

/**
 * How much shorter the hero's steps are than they were with four sets: a
 * scene's distances in progress (a glide, a dissolve) are multiplied by
 * this to keep their length on the page.
 */
export const HERO_STRETCH = 4.9 / 3.45;
