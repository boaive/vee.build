/**
 * Partnership page. The three partner groups are from the client's site
 * structure. No commercial terms, territories or margins were supplied, so
 * none are stated.
 */
export interface PartnerGroup {
  id: string;
  n: string;
  name: string;
  role: string;
  brings: string[];
  works: string;
}

export const partnerGroups: PartnerGroup[] = [
  {
    id: 'micro-manufacturers',
    n: '01',
    name: 'Micro manufacturers',
    role: 'Produce the two shells closer to where they are needed.',
    brings: ['Yard or shed space', 'A production crew', 'Local material supply'],
    works:
      'The factory sequence is the same at any scale: adjustable piers, core shell, insulation panels, formwork, concreting, de-shuttering, finishing.',
  },
  {
    id: 'farmhouse-promoters',
    n: '02',
    name: 'Farmhouse promoters',
    role: 'Offer plotted and farmhouse developments with homes from the catalogue.',
    brings: ['Land or a plotted layout', 'Buyers who want a finished home', 'A site ready for foundations'],
    works:
      'Catalogue models from 200 to 600 sq.ft. are configured from Shell A and Shell B, delivered and installed on prepared foundations.',
  },
  {
    id: 'local-contractors',
    n: '03',
    name: 'Local contractors',
    role: 'Prepare sites, set foundations and install modules in your region.',
    brings: ['Site and foundation crews', 'Lifting and transport access', 'Knowledge of local approvals'],
    works:
      'Plug footings, L plinths and jack piers go in on site; shells arrive finished and are lifted into place; add-ons follow.',
  },
];

export const partnerTypes = ['Micro manufacturer', 'Farmhouse promoter', 'Local contractor', 'Other'] as const;
