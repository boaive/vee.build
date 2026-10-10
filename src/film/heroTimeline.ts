/**
 * The hero's cuts: the progress at which one set gives way to the next.
 * Kept apart from the scene so that the captions (data/narrative.ts) can
 * change on the same number: the picture and its words go together.
 *
 * The institutional set has the longest stretch of the four: its wall
 * panels come in one after another (client, 2026-10-09: "a bit fast", twice
 * the scroll).
 */
export const HERO_CUTS = [0.153, 0.449, 0.745] as const;
