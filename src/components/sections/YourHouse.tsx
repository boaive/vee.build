import { lazy, useMemo } from 'react';
import { totals } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import { revealSample, revealSteps } from '../../data/narrative';
import Film from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/RevealScene'));

/** Section 5, continued: the configured house alone, then on to the factory. */
export default function YourHouse() {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const t = useMemo(() => totals(view.units), [view.units]);

  const extras = {
    yours: (
      <p className="film__stats">
        <span>
          <b>{t.sqft}</b> sq.ft.
        </span>
        <span>
          <b>{t.count}</b> {t.count === 1 ? 'shell' : 'shells'}
        </span>
        <span>
          <b>{t.floors === 1 ? 'G' : `G+${t.floors - 1}`}</b>
        </span>
        <span>
          <b>
            {t.width} × {t.depth}
          </b>{' '}
          m
        </span>
      </p>
    ),
  };

  return (
    <Film
      id="your-house"
      index="05"
      heading={view.sample ? 'A sample house' : 'Your house'}
      theme="dark"
      chapter="configure"
      captions="fade"
      steps={view.sample ? revealSample : revealSteps}
      length={3.4}
      lengthCompact={3.6}
      Scene={Scene}
      stepExtras={extras}
    />
  );
}
