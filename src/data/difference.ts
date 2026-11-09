/**
 * Section 4. The six points and their wording come from the client's brief.
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
 * name ("We → VEE"; Veedo since 2026-11-07). Grammar set right the same day (notes V).
 */
export const differenceCopy = {
  eyebrow: 'Key differences',
  title: ['How is Vee', 'different?'],
  lead: 'Six things that set a Vee building apart.',
  ours: 'Vee',
  others: 'Others',
} as const;

export const differences: Difference[] = [
  {
    id: 'end-to-end',
    word: 'End-to-end',
    claim: 'Foundation to finish, in one workflow.',
    detail: 'Vee delivers everything, from the footing to the final coat of paint.',
    other: 'Fragmented subcontractors',
  },
  {
    id: 'insulated',
    word: 'Insulated',
    claim: 'Solid concrete walls with thermal and acoustic insulation.',
    detail: 'Insulation is cast into the wall, not added later.',
    other: 'Lightweight metal or composite sheets',
  },
  {
    id: 'sustainable',
    word: 'Sustainable',
    // CONFIRM: no figures supplied for water or site energy (notes B6).
    claim: 'Modern methods of construction, built off-site.',
    detail: 'Far less water and site energy, reusable materials, lower fossil fuel use.',
  },
  {
    id: 'energy',
    word: 'Energy efficient',
    claim: 'Ready for off-grid solar.',
    detail: 'Roof solar arrays and off-grid power can be added to any structure.',
  },
  {
    id: 'code',
    word: 'Code compliant',
    // CONFIRM: BMTPC approval reference and MoHUA scheme (notes B1, B2, B7).
    claim: 'Built to international structural standards.',
    detail: 'Approved by BMTPC and promoted by MoHUA for sustainable construction.',
    marks: ['BMTPC', 'MoHUA'],
  },
  {
    id: 'affordable',
    word: 'Affordable',
    // CONFIRM: comparative cost claim (notes B5).
    claim: 'Precision manufacturing keeps costs down.',
    detail: 'Significantly less than brick-and-mortar or structural bolt construction.',
    other: 'Brick-and-mortar and structural bolt construction',
  },
];
