/**
 * The capsule home (POD): its lengths and the words of its page. The pod's
 * model is kit/podPlan.ts (no three.js), which takes its lengths from here.
 *
 * Lengths: 8, 10 and 12 m (developer, 2026-11-08), in place of the brief's
 * 10′, 16′ and 20′ (notes W1: the latest instruction is followed); 10 m is
 * the one shown first (2026-11-09: "by default it will be in 10m").
 */
export const podLengths = [8, 10, 12] as const;
export type PodLengthM = (typeof podLengths)[number];
export const podDefault: PodLengthM = 10;

/** A length's name on its button and under the pod. */
export const podLengthName = (m: number) => `${m} m`;

/**
 * The POD page opens on the pod (developer, 2026-11-09: "mimic the mod page,
 * start with the pod in plain background ... after that plain background, we
 * show the animated background"): the pod alone on the studio floor, then
 * its land at blue hour as the page scrolls. The visitor chooses its length
 * all the while; one pod, never three at once. Only what was given: the
 * kind's line and point, the three lengths, how it grows (notes W).
 */
export const podOpening = {
  kicker: 'POD',
  // Not on sale yet: tagged wherever it is shown (data/narrative.ts, kinds).
  badge: 'Coming soon',
  line: ['Capsule', 'home.'],
  sub: 'Luxury capsule living. Enveloped in concrete.',
} as const;

export const podSteps = [
  {
    id: 'land',
    at: 0,
    pose: 0.5,
    kicker: 'Three lengths',
    title: 'Grows by the panel.',
    // The developer's scheme (notes W7): the ends stay, panels are added in the middle.
    body: 'The ends stay; panels go in between. 8, 10 or 12 m.',
  },
];

/** The length buttons' group name, for a screen reader. */
export const podPickLabel = 'Capsule length';
