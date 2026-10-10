import { lazy, useMemo } from 'react';
import { shown, useBuild } from '../../build/store';
import { installSteps } from '../../data/narrative';
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
  const steps = useMemo(() => installSteps(view.units.length, view.sample, plinth), [view.units.length, view.sample, plinth]);
  return (
    <Film
      id="installation"
      index="08"
      heading="On site"
      theme="dark"
      chapter="delivery"
      captions="track"
      steps={steps}
      length={6.4}
      lengthCompact={5.8}
      Scene={Scene}
      labels={labels}
    />
  );
}
