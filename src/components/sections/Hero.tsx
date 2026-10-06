import { lazy } from 'react';
import { heroSteps } from '../../data/narrative';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';
import { prefetchScenes } from '../../film/prefetch';
import { POD_FEET_LABELS } from './labels';

const Scene = lazy(() => import('../../three/scenes/HeroScene'));

const labels: FilmLabel[] = [
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

/** The opening card: a plain screen and the system in a sentence, before the first set. */
const opening: Prelude = {
  length: 1.1,
  tone: 'paper',
  content: (
    <div className="prelude">
      <p className="t-label prelude__kicker">VEE.BUILD · Modular precast construction system</p>
      <p className="prelude__line">
        One system.
        <br />
        <em>Many buildings.</em>
      </p>
      <p className="prelude__sub">Two precast shells, made in a factory and set on your site.</p>
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
      length={4.4}
      lengthCompact={4.6}
      Scene={Scene}
      labels={labels}
      stepExtras={actions}
      prelude={opening}
      onReady={() => window.setTimeout(prefetchScenes, 1500)}
      eager
    />
  );
}
