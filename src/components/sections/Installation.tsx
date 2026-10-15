import { lazy, useMemo } from 'react';
import { layoutAddOns } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import { installSteps } from '../../data/narrative';
import { numberOf } from '../../data/site';
import Film, { type FilmLabel } from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/InstallScene'));

/** What the site's preparation names as it goes in (the brief's components). */
const labels: FilmLabel[] = [
  { id: 'prep-pegs', text: 'Plot marked out', kind: 'call' },
  { id: 'prep-footing', text: 'Plug footing', kind: 'call' },
  { id: 'prep-plinth', text: 'L plinth', kind: 'call' },
];

/**
 * Section 8, on site, in one film (client, 2026-10-11: "merge Ready before
 * the shell arrives and On site"). The scroll first makes the plot ready:
 * marked out, footings and plinths set and backfilled. The camera then
 * stands back as the truck brings the shell in; past the trigger the shell
 * is craned onto the foundation and the rest of the build comes together
 * by itself (client, 2026-10-10), on the film's own clock
 * (film/installTimeline.ts).
 */
export default function Installation() {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const plinth = view.foundation.type === 'plinth';
  // The film sets a jack pier under each deck post and under the steps: said only where the build has one or the other.
  const piers = useMemo(() => {
    const l = layoutAddOns(view.units, new Set(view.addOns), view.deckSide, view.manual, view.base, view.plot);
    return l.posts.length + l.steps.length > 0;
  }, [view]);
  const steps = useMemo(() => installSteps(view.units.length, view.sample, plinth, piers), [view.units.length, view.sample, plinth, piers]);
  // On a compact layout a stage at a time, chosen with cards (Film, `pick`; the developer, 2026-10-14): each card is its step's small line, its picture the plot at that stage (notes R).
  const cards = useMemo(() => steps.map((s, i) => ({ src: `/images/cards/site-${s.id}.webp`, code: String(i + 1).padStart(2, '0'), name: s.kicker })), [steps]);
  return (
    <Film
      id="installation"
      index={numberOf('installation')}
      heading="On site"
      theme="dark"
      // On a compact layout it is laid out as the factory is, a page of cards on paper (Film, `pick`; 2026-10-15: "make sure it follows the factory layout the same").
      themeCompact="light"
      captions="track"
      steps={steps}
      length={6.4}
      lengthCompact={1.5}
      pick={{ label: 'On site, stage by stage', cards, seconds: 1.4 }}
      Scene={Scene}
      labels={labels}
    />
  );
}
