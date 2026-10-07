import { lazy, useMemo } from 'react';
import { totals } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import { installSteps } from '../../data/narrative';
import Film from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/InstallScene'));

/** Section 6, part 4: the build craned onto its foundation, then finished. */
export default function Installation() {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const floors = useMemo(() => totals(view.units).floors, [view.units]);
  const steps = useMemo(() => installSteps(floors, view.sample), [floors, view.sample]);
  return (
    <Film
      id="installation"
      index="06"
      heading="On site"
      theme="dark"
      chapter="factory"
      captions="track"
      steps={steps}
      length={6}
      lengthCompact={5.5}
      Scene={Scene}
    />
  );
}
