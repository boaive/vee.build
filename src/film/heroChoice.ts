/**
 * What the visitor has chosen on the phone's hero (the mobile and tablet
 * round, 2026-10-14; compact layouts only): which of the three kinds of
 * building stands on the opening card (its cards, its arrows, a sideways
 * swipe). The capsule's length is film/podChoice.ts since 2026-11-09 (one
 * choice a page, shared with the desktop's banner).
 * Set by the hero's controls (Hero.tsx), read by its scene
 * (HeroMobileScene), which is told when either changes. Desktop never
 * sets it.
 */
export const heroChoice = {
  /** The kind on the opening card: 0 the modular house, 1 the capsule home, 2 the prefab building. */
  kind: 0,
  listeners: new Set<() => void>(),
};

export function chooseHero(patch: Partial<Pick<typeof heroChoice, 'kind'>>) {
  Object.assign(heroChoice, patch);
  heroChoice.listeners.forEach((fn) => fn());
}
