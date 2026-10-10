import { lazy, useContext, useMemo } from 'react';
import { totals } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import { revealSample, revealSteps, revealViews } from '../../data/narrative';
import Film from '../../film/Film';
import { FilmContext } from '../../film/progress';

const Scene = lazy(() => import('../../three/scenes/RevealScene'));

/**
 * The five views as buttons, laid out as the directions they are: top over
 * centre over down, left and right beside it. A press asks the scene for
 * that view (`progress.focus`, read by RevealScene); taking hold of the
 * house, or scrolling on, lets it go.
 */
function ViewPad() {
  const progress = useContext(FilmContext);
  const ask = (i: number) => {
    if (!progress) return;
    progress.focus = i;
    progress.invalidate?.();
  };
  return (
    <div className="viewpad" role="group" aria-label="Views of the house">
      <p className="t-label viewpad__hint">{revealViews.hint}</p>
      <div className="viewpad__keys">
        {revealViews.keys.map((k, i) => (
          <button key={k} type="button" className={`viewpad__key viewpad__key--${k.toLowerCase()}`} onClick={() => ask(i)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Section 6, the 3D tour: the configured house alone, to be looked at from every side, then on to the factory. */
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
      index="06"
      heading={revealViews.heading}
      theme="dark"
      captions="fade"
      steps={view.sample ? revealSample : revealSteps}
      length={2.2}
      lengthCompact={2.4}
      Scene={Scene}
      stepExtras={extras}
    >
      <ViewPad />
    </Film>
  );
}
