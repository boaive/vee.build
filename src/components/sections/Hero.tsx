import { lazy } from 'react';
import { heroSteps, kinds } from '../../data/narrative';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';
import { prefetchScenes } from '../../film/prefetch';
import { POD_FEET_LABELS } from './labels';

const Scene = lazy(() => import('../../three/scenes/HeroScene'));

const SOON = 'Coming soon';

const labels: FilmLabel[] = [
  // On the opening card: each of the three is named where it stands, under the menu's short name for it.
  ...kinds.map((k): FilmLabel => ({ id: `kind-${k.id}`, sub: k.soon ? `${k.code} · ${SOON}` : k.code, text: k.word, kind: 'kind' })),
  ...POD_FEET_LABELS,
  { id: 'panel-0', text: '36′ wall panel', kind: 'pulse' },
  { id: 'panel-1', text: '36′ wall panel', kind: 'pulse' },
];

const actions = {
  [heroSteps[0].id]: (
    <div className="hero__actions">
      <a className="btn" href="#configure">
        Build your own
      </a>
      <a className="btn btn--ghost btn--down" href="#how-it-works">
        How it works
      </a>
    </div>
  ),
};

/**
 * The opening card: the system in a sentence, over the three kinds of
 * building, one behind another on a polished floor in warm light, seen on
 * the diagonal and fitted to the screen (HeroScene). Scrolling lifts the
 * capsule and the prefab block away, goes to the modular house and brings
 * its land and sky in.
 */
const opening: Prelude = {
  length: 1.7,
  tone: 'paper',
  opening: 'mist',
  content: (
    <div className="prelude">
      <div className="prelude__top">
        <p className="prelude__line">
          <span className="prelude__ln">
            <span>One system.</span>
          </span>
          <span className="prelude__ln">
            <span>
              <em>Many buildings.</em>
            </span>
          </span>
        </p>
      </div>
      {/* The three, in words: read out, and shown where there is no picture to name them on. */}
      <ul className="prelude__kinds">
        {kinds.map((k) => (
          <li key={k.id}>
            <b>{k.name}.</b> {k.line} {k.punch}
          </li>
        ))}
      </ul>
    </div>
  ),
};

export default function Hero() {
  return (
    <Film
      id="overview"
      index="01"
      heading="Modular precast construction system"
      headingTag="h1"
      stepTag="p"
      variant="hero"
      theme="light"
      captions="blur"
      steps={heroSteps}
      length={4.9}
      lengthCompact={5.1}
      Scene={Scene}
      labels={labels}
      stepExtras={actions}
      prelude={opening}
      onReady={() => window.setTimeout(prefetchScenes, 1500)}
      eager
    />
  );
}
