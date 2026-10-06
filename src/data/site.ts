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
    'VEE.BUILD manufactures a standardised modular construction system. Two precast shells, 6 m × 3 m × 3 m and 3 m × 3 m × 3 m, combine into homes, farmhouses, workforce housing and multi-storey buildings.',
  // CONFIRM: none of these were supplied. Nothing is rendered while null.
  contact: {
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
    legalName: null as string | null,
  },
} as const;

export const primaryNav: NavItem[] = [
  { label: 'Modular', href: '/', note: 'The system' },
  { label: 'Capsule', href: '/capsule/', note: 'Coming soon' },
  { label: 'Prefab', href: '/prefab/', note: 'Coming soon' },
  { label: 'Partnership', href: '/partnership/', note: 'Build with us' },
  { label: 'Contact', href: '/#contact', note: 'Enquire' },
];

export const sections = [
  { id: 'overview', n: '01', label: 'Overview' },
  { id: 'how-it-works', n: '02', label: 'How it works' },
  { id: 'components', n: '03', label: 'Building components' },
  { id: 'difference', n: '04', label: 'How we are different' },
  { id: 'configure', n: '05', label: 'Build your own' },
  { id: 'factory', n: '06', label: 'Factory to site' },
  { id: 'catalogue', n: '07', label: 'Catalogue' },
  { id: 'gallery', n: '08', label: 'Photo gallery' },
  { id: 'contact', n: '09', label: 'Contact' },
] as const;

export const projectCategories = ['Modular Home', 'Capsule Pod', 'Prefab Services', 'Partnership'] as const;
export type ProjectCategory = (typeof projectCategories)[number];
