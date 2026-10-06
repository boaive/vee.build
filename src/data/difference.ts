/**
 * Section 4. The six points and their wording come from the VEE.BUILD brief.
 * `versus` is the comparison the brief itself draws; nothing is added.
 */
export interface Difference {
  id: string;
  word: string;
  claim: string;
  detail: string;
  versus?: string;
  marks?: string[];
}

export const differences: Difference[] = [
  {
    id: 'end-to-end',
    word: 'End-to-end',
    claim: 'Foundation to finish under a single, unified workflow.',
    detail: 'We deliver everything, from the footing in the ground to the last coat of paint.',
    versus: 'No fragmented subcontractors.',
  },
  {
    id: 'insulated',
    word: 'Insulated',
    claim: 'Solid concrete walls with thermal and acoustic insulation.',
    detail: 'Insulation panels are cast into the wall, not fixed on afterwards.',
    versus: 'Others rely on lightweight metal or composite sheets.',
  },
  {
    id: 'sustainable',
    word: 'Sustainable',
    // CONFIRM: no figures supplied for water or site energy (notes B6).
    claim: 'Modern Methods of Construction, built off-site.',
    detail: 'Radically less water, minimal site energy, reusable materials and minimised fossil fuel dependency.',
  },
  {
    id: 'energy',
    word: 'Energy efficient',
    claim: 'Ready for complete off-grid solar and power.',
    detail: 'Fully optimised structures that can be configured with roof solar arrays and off-grid power.',
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
    versus: 'Compared with brick-and-mortar and structural bolt construction.',
  },
];
