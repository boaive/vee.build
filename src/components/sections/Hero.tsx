import { lazy } from 'react';
import { heroSteps } from '../../data/narrative';
import { shells, type ModuleType } from '../../data/system';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';
import { prefetchScenes } from '../../film/prefetch';
import { POD_FEET_LABELS } from './labels';

const Scene = lazy(() => import('../../three/scenes/HeroScene'));

const labels: FilmLabel[] = [
  // On the opening card: the house in the picture is one shell.
  { id: 'home', text: `${shells.A.name} · ${shells.A.label}`, kind: 'call' },
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

/** A shell drawn to scale as a box in isometric view: 7 px to the metre. */
function ShellGlyph({ type }: { type: ModuleType }) {
  const [l, h, d] = shells[type].size;
  const k = 7;
  const at = (x: number, y: number, z: number) => `${((x - z) * 0.866 * k).toFixed(1)},${((x + z) * 0.5 * k - y * k).toFixed(1)}`;
  const face = (...pts: [number, number, number][]) => pts.map((p) => at(...p)).join(' ');
  const w = (l + d) * 0.866 * k;
  const t = h * k;
  return (
    <svg className="shell-glyph" viewBox={`${(-d * 0.866 * k - 1).toFixed(1)} ${-t - 1} ${(w + 2).toFixed(1)} ${((l + d) * 0.5 * k + t + 2).toFixed(1)}`} width={w + 2} aria-hidden="true">
      <polygon className="shell-glyph__top" points={face([0, h, 0], [l, h, 0], [l, h, d], [0, h, d])} />
      <polygon className="shell-glyph__front" points={face([0, 0, d], [l, 0, d], [l, h, d], [0, h, d])} />
      <polygon className="shell-glyph__end" points={face([l, 0, 0], [l, 0, d], [l, h, d], [l, h, 0])} />
    </svg>
  );
}

/**
 * The opening card: the system in a sentence and its two shells, beside the
 * house alone in a studio. Scrolling brings its land and sky in (HeroScene).
 */
const opening: Prelude = {
  length: 1,
  tone: 'paper',
  opening: 'mist',
  content: (
    <div className="prelude">
      <div className="prelude__top">
        <p className="t-label prelude__kicker">VEE.BUILD · Modular precast construction system</p>
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
      <div className="prelude__rest">
        <p className="prelude__sub">Two precast shells, made in a factory and set on your site.</p>
        <ul className="prelude__shells">
          {(['A', 'B'] as const).map((t) => (
            <li key={t}>
              <ShellGlyph type={t} />
              <span className="prelude__shell">
                <b>{shells[t].name}</b>
                {shells[t].label}
              </span>
            </li>
          ))}
        </ul>
      </div>
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
