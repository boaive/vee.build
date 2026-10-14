/**
 * Where the MOD and FAB pages lead on into the home page (developer,
 * 2026-10-14: "in the bottom of the mod tab and fab tab ... clicking upon it,
 * will continue from [that chapter] in the home screen. we show 2 and 5, 6
 * for fab, and 3 and 6 for mod"). Near the foot of each page, just before
 * its enquiry form (the developer, the same day), one link for
 * each of those chapters: it opens the home page at the chapter, and the
 * visitor scrolls on from there. The capsule is not made of the shells, so
 * POD has none.
 *
 * Each chapter's line is its own wording on the home page, not new copy.
 */
import { componentSteps, revealViews, systemSteps } from './narrative';
import { sections } from './site';

export type OnwardLine = 'mod' | 'fab';

const chapters: Record<OnwardLine, string[]> = {
  mod: ['components', 'your-house'],
  fab: ['how-it-works', 'configure', 'your-house'],
};

/** The heading over the links on each page. */
export const onwardTitle: Record<OnwardLine, string> = {
  mod: 'See how VEE builds it.',
  fab: 'See how the system works.',
};

const lines: Record<string, string> = {
  // 2.1's title, 2.3's heading, 2.5's line (the client's wording, 2026-10-09).
  'how-it-works': `${systemSteps[0].title} Multiple footprints. Stack up to 5 floors.`,
  // The film's opening caption, its title and its last sentence.
  components: `${componentSteps[0].title} See how they all connect together.`,
  // The configurator's heading (BuildSection.astro).
  configure: 'Design it, shell by shell. Place Shell A and Shell B, stack up to five floors and choose what the house needs.',
  // The 3D tour: the visitor's own design, or the sample it shows until there is one (revealSample), and its hint.
  'your-house': `Your house, or a sample build, in 3D. ${revealViews.hint}.`,
};

export interface Onward {
  id: string;
  /** The chapter's number on the home page, as its rail shows it ("03"). */
  n: string;
  label: string;
  line: string;
  href: string;
}

/** The links for a page, in the home page's order. A chapter that is hidden there is left out. */
export function onwardFor(line: OnwardLine): Onward[] {
  return chapters[line].flatMap((id) => {
    const s = sections.find((c) => c.id === id);
    return s ? [{ id, n: s.n, label: s.label, line: lines[id] ?? '', href: `/#${id}` }] : [];
  });
}
