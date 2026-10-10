export interface NavItem {
  label: string;
  href: string;
  note?: string;
}

export const site = {
  name: 'VEE.BUILD',
  // CONFIRM: production domain.
  url: 'https://vee.build',
  locale: 'en_IN',
  tagline: 'Modular precast construction system',
  description:
    'VEE.BUILD manufactures a standardized modular construction system. Two precast shells, 6 m × 3 m × 3 m and 3 m × 3 m × 3 m, combine into homes, farmhouses, workforce housing and multi-storey buildings.',
  // CONFIRM: none of these were supplied. Nothing is rendered while null.
  contact: {
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
    legalName: null as string | null,
  },
  /** Client, 2026-10-09: "add powered by HEMISPHERE ONE". Logo supplied the same day (src/assets/brand). */
  poweredBy: 'Hemisphere One',
} as const;

/**
 * The top menu, as the client set it on 2026-10-09: MOD | POD | FAB and
 * Contact, nothing else. `note` is what each short name stands for; it is
 * read out with the link and shown in the mobile menu.
 */
export const primaryNav: NavItem[] = [
  { label: 'MOD', href: '/', note: 'Modular house' },
  { label: 'POD', href: '/capsule/', note: 'Capsule home' },
  { label: 'FAB', href: '/prefab/', note: 'Prefab building' },
  { label: 'Contact', href: '/#contact', note: 'Enquire' },
];

/**
 * The bottom band (same instruction): Partnership, Investors, Technology.
 * CONFIRM: only Partnership has a page. No content was supplied for the
 * other two, so Investors opens the enquiry form and Technology the system
 * film ("How it works") until the client says where they should lead
 * (notes J2).
 */
export const bandNav: NavItem[] = [
  { label: 'Partnership', href: '/partnership/' },
  { label: 'Investors', href: '/#contact' },
  { label: 'Technology', href: '/#how-it-works' },
];

/**
 * Sections of the main page that are built but not shown. The catalogue
 * "is not currently required, but it may be needed later" (client,
 * 2026-10-10): its code and data stay as they are. Set it to true and it is
 * back, with its place in the numbering, the rail, the menus and the links
 * that lead to it.
 */
export const shown = { catalogue: false } as const;

/**
 * The main page's chapters, in order (5 Build your own, 6 3D tour, 7 The
 * factory, 8 Delivery, as the client's notes of 2026-10-09 number them).
 * The numbers are counted from this list, so a hidden chapter leaves no gap.
 */
const chapters: { id: string; label: string; show?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'components', label: 'Componentized building' },
  { id: 'difference', label: 'Key differences' },
  { id: 'configure', label: 'Build your own' },
  { id: 'your-house', label: '3D tour' },
  { id: 'factory', label: 'The factory' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'catalogue', label: 'Catalogue', show: shown.catalogue },
  { id: 'gallery', label: 'Photo gallery' },
  { id: 'contact', label: 'Contact' },
];

export const sections = chapters.filter((c) => c.show !== false).map((c, i) => ({ id: c.id, n: String(i + 1).padStart(2, '0'), label: c.label }));

/** A chapter's number as the page shows it ("09"). */
export const numberOf = (id: string) => sections.find((s) => s.id === id)?.n ?? '';

export const projectCategories = ['Modular Home', 'Capsule Pod', 'Prefab Services', 'Partnership'] as const;
export type ProjectCategory = (typeof projectCategories)[number];
