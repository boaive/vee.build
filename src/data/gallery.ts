/**
 * Section 7. Real-world proof. Only add an item with kind 'photo' when it is
 * a genuine photograph of VEE.BUILD work. Renders must be kind 'render' and
 * are labelled as visualisations on the page.
 *
 * To add a photograph: put the file in src/assets/gallery/, import it here
 * and replace the matching `awaiting` entry.
 */
import type { ImageMetadata } from 'astro';
import moduleRender from '../assets/gallery/module-6x3-render.jpg';

export type GalleryKind = 'photo' | 'render' | 'awaiting';

export interface GalleryItem {
  kind: GalleryKind;
  category: 'Factory' | 'In transit' | 'Crane installation' | 'Completed handover' | 'Product';
  caption: string;
  alt?: string;
  src?: ImageMetadata;
  /** width / height of the frame when no image is present. */
  ratio?: number;
}

export const gallery: GalleryItem[] = [
  {
    kind: 'render',
    category: 'Product',
    caption: '6 m × 3 m shell with deck, handrail and steps',
    alt: 'Rendered view of a single 6 by 3 metre modular home on corner supports, with a timber deck, black handrail and steps in a garden at dusk.',
    // CONFIRM: supplied file carries a third-party watermark; replace with a clean export (notes A4).
    src: moduleRender,
  },
  { kind: 'awaiting', category: 'In transit', caption: 'Modules in transit', ratio: 16 / 10 },
  { kind: 'awaiting', category: 'Crane installation', caption: 'Crane installation on site', ratio: 4 / 3 },
  { kind: 'awaiting', category: 'Completed handover', caption: 'Completed handover', ratio: 16 / 10 },
  { kind: 'awaiting', category: 'Factory', caption: 'Open-air factory, assembly bays', ratio: 16 / 10 },
  { kind: 'awaiting', category: 'Factory', caption: 'De-shuttering and finishing line', ratio: 4 / 3 },
];
