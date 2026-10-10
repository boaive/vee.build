import { lazy, useMemo } from 'react';
import { shown, useBuild } from '../../build/store';
import { installSteps } from '../../data/narrative';
import Film from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/InstallScene'));

/**
 * Section 8, continued: one shell is craned off the truck onto the
 * foundation, and the rest of the build comes together by itself (client,
 * 2026-10-10). The scroll brings the truck in and sets the placement off;
 * what follows runs on the film's own clock (film/installTimeline.ts), so
 * the film is shorter than it was.
 */
export default function Installation() {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const steps = useMemo(() => installSteps(view.units.length, view.sample), [view.units.length, view.sample]);
  return (
    <Film
      id="installation"
      index="08"
      heading="On site"
      theme="dark"
      chapter="delivery"
      captions="track"
      steps={steps}
      length={4.4}
      lengthCompact={4}
      Scene={Scene}
    />
  );
}
