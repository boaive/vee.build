/**
 * Section 4. The six points and their wording come from the VEE.BUILD brief.
 * `other` is what the brief itself sets a point against, in the brief's own
 * words ("No fragmented subcontractors.", "Others rely on lightweight metal
 * or composite sheets.", "Compared with brick-and-mortar and structural bolt
 * construction."); the page shows it struck through. Nothing is added.
 */
export interface Difference {
  id: string;
  word: string;
  claim: string;
  detail: string;
  other?: string;
  marks?: string[];
}

/**
 * The section's own words (client, 2026-10-09): "Key differences" over the
 * heading, and the sentence under it. The comparison's two columns are
 * named as the client names them. The heading read "How are we different?"
 * until 2026-10-10: where "we" stands for the company the client wants its
 * name ("We → VEE").
 */
export const differenceCopy = {
  eyebrow: 'Key differences',
  title: ['How is VEE', 'different?'],
  lead: 'Six points separate a VEE.BUILD building from traditional and other off-site models.',
  ours: 'VEE.BUILD',
  others: 'Others',
} as const;

export const differences: Difference[] = [
  {
    id: 'end-to-end',
    word: 'End-to-end',
    claim: 'Foundation to finish under a single, unified workflow.',
    detail: 'VEE delivers everything, from the footing in the ground to the last coat of paint.',
    other: 'Fragmented subcontractors',
  },
  {
    id: 'insulated',
    word: 'Insulated',
    claim: 'Solid concrete walls with thermal and acoustic insulation.',
    detail: 'Insulation panels are cast into the wall, not fixed on afterwards.',
    other: 'Lightweight metal or composite sheets',
  },
  {
    id: 'sustainable',
    word: 'Sustainable',
    // CONFIRM: no figures supplied for water or site energy (notes B6).
    claim: 'Modern Methods of Construction, built off-site.',
    detail: 'Radically less water, minimal site energy, reusable materials and minimized fossil fuel dependency.',
  },
  {
    id: 'energy',
    word: 'Energy efficient',
    claim: 'Ready for complete off-grid solar and power.',
    detail: 'Fully optimized structures that can be configured with roof solar arrays and off-grid power.',
  },
  {
    id: 'code',
    word: 'Code compliant',
    // CONFIRM: BMTPC approval reference and MoHUA scheme (notes B1, B2, B7).
    claim: 'Built to the highest international structural metrics.',
    detail: 'Approved by BMTPC and strongly promoted under MoHUA for sustainable green construction.',
    marks: ['BMTPC', 'MoHUA'],
  },
  {
    id: 'affordable',
    word: 'Affordable',
    // CONFIRM: comparative cost claim (notes B5).
    claim: 'High-precision manufacturing keeps the cost down.',
    detail: 'It costs significantly less than traditional brick-and-mortar or structural bolt methods.',
    other: 'Brick-and-mortar and structural bolt construction',
  },
];
