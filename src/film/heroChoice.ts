/**
 * What the visitor has chosen on the phone's hero (the mobile and tablet
 * round, 2026-10-14; compact layouts only): which of the three kinds of
 * building stands on the opening card (its cards, its arrows, a sideways
 * swipe), and the capsule's length in the capsule's step (10′, 16′, 20′).
 * Set by the hero's controls (Hero.tsx), read by its scene
 * (HeroMobileScene), which is told when either changes. Desktop never
 * sets it.
 */
export const heroChoice = {
  /** The kind on the opening card: 0 the modular house, 1 the capsule home, 2 the prefab building. */
  kind: 0,
  /** The capsule's length in feet. */
  feet: 20,
  listeners: new Set<() => void>(),
};

export function chooseHero(patch: Partial<Pick<typeof heroChoice, 'kind' | 'feet'>>) {
  Object.assign(heroChoice, patch);
  heroChoice.listeners.forEach((fn) => fn());
}
