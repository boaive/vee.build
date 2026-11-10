/**
 * The home page's second section (developer, 2026-11-07: "after those
 * banners are shown in the home screen ... show then possibilities what can
 * be done, like mod, pod and fab"; "we just give the type, and perfect one
 * line overview"; then "make it as cards. make it little popped. a more
 * professional tone"). The three lines as cards: the picture, the menu's
 * code and its status on it, the name, one line, one link. The pictures are
 * the real-time model's own, captured at 960 × 600 from the phone hero's
 * floor (public/images/range; cards.mjs at twice its size).
 */
import { kinds } from './narrative';

export interface Line {
  code: string;
  name: string;
  text: string;
  soon: boolean;
  src: string;
  alt: string;
  href: string;
}

const [MOD, POD, FAB] = kinds;

export const linesHead = {
  title: 'What Vee builds.',
  lead: 'Made in the factory. Installed on your site.',
} as const;

export const lines: Line[] = [
  {
    code: MOD.code,
    name: MOD.name,
    // CONFIRM: installation in a day (notes B4).
    text: 'Insulated concrete homes, built in the factory and installed in a day.',
    soon: MOD.soon,
    src: '/images/range/kind-mod.webp',
    alt: 'The modular house: one long shell with a sloped roof, a deck and steps.',
    href: MOD.href,
  },
  {
    code: POD.code,
    name: POD.name,
    // CONFIRM: the capsule's skin is concrete (notes B8); its lengths are the developer's of 2026-11-08 (notes W).
    text: 'Capsule homes skinned in concrete panels, 8, 10 or 12 m long.',
    soon: POD.soon,
    src: '/images/range/kind-pod.webp',
    alt: 'A capsule home in concrete panels: glazed ends, a door with precast steps, standing on short feet.',
    href: POD.href,
  },
  {
    code: FAB.code,
    name: FAB.name,
    // CONFIRM: construction time (notes B9).
    text: 'Precast panel buildings for schools, health centres and institutions.',
    soon: FAB.soon,
    src: '/images/range/kind-fab.webp',
    alt: 'A three-storey precast panel building with open galleries, an outer staircase and a deck with steps.',
    href: FAB.href,
  },
];
