import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { heroCards, heroSteps, kinds } from '../../data/narrative';
import { story } from '../../data/site';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';
import type { SceneProps } from '../../film/progress';
import { chooseHero, heroChoice } from '../../film/heroChoice';
import { isLite } from '../../film/tier';
import { useCompact } from '../../film/useCompact';
import { POD_LENGTH_LABELS } from './labels';
import PodPick from './PodPick';

const Desktop = lazy(() => import('../../three/scenes/HeroScene'));
const Mobile = lazy(() => import('../../three/scenes/HeroMobileScene'));

/**
 * A phone or a tablet held upright has a hero of its own: each kind alone on
 * the polished floor, under its caption (HeroMobileScene). So has a budget
 * touch device held sideways (film/tier.ts): the same showroom, beside the
 * desktop's captions, in place of four landscapes. The desktop's is
 * HeroScene, and only it is fetched there.
 */
function Scene(props: SceneProps) {
  return props.compact || isLite() ? <Mobile {...props} /> : <Desktop {...props} />;
}

const SOON = 'Coming soon';

const labels: FilmLabel[] = [
  // On the opening card: each of the three is named where it stands, under the menu's short name for it.
  ...kinds.map((k): FilmLabel => ({ id: `kind-${k.id}`, sub: k.soon ? `${k.code} · ${SOON}` : k.code, text: k.word, kind: 'kind' })),
  ...POD_LENGTH_LABELS,
];

/* The configurator and "How it works" are on the MOD page since 2026-11-07 (data/site.ts, `story`). */
const actions = {
  [heroSteps[0].id]: (
    <div className="hero__actions">
      <a className="btn" href={`${story}#configure`}>
        Build your own
      </a>
      <a className="btn btn--ghost" href={`${story}#how-it-works`}>
        How it works
      </a>
    </div>
  ),
  // The capsule's step: one pod, its other two lengths a click away (desktop: in the caption; a phone: at the foot, below).
  [heroSteps[1].id]: <PodPick />,
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The opening card's three on a phone or a tablet held upright (developer,
 * 2026-10-14: "the landing page shows that 3 building in that card
 * option"): one stands on the floor at a time (HeroMobileScene), chosen
 * with these cards, the arrows, or a sideways swipe on the picture while
 * the card is up. Scrolling down leaves the card for the four steps, which
 * are scrolled through. Nothing of it on desktop.
 */
function KindPick() {
  const compact = useCompact();
  const [kind, setKind] = useState(heroChoice.kind);
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const root = useRef<HTMLDivElement>(null);
  const choose = useCallback((k: number) => {
    const v = Math.max(0, Math.min(heroCards.length - 1, k));
    setKind(v);
    chooseHero({ kind: v });
  }, []);
  useEffect(() => {
    const el = root.current;
    const pin = el?.closest<HTMLElement>('.film__sticky');
    if (!compact || !el || !pin) return;
    // Only while the card is up: once it has begun to open, the cards let taps through to what is under them.
    const up = () => pin.style.getPropertyValue('--pre') === '' || parseFloat(pin.style.getPropertyValue('--pre')) < 0.12;
    const sync = () => el.toggleAttribute('inert', !up());
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    let x = 0;
    let y = 0;
    let id = -1;
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !up() || (e.target as HTMLElement).closest('.prelude__pick, a, button')) return;
      id = e.pointerId;
      x = e.clientX;
      y = e.clientY;
    };
    const lift = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) choose(kindRef.current + (dx < 0 ? 1 : -1));
    };
    pin.addEventListener('pointerdown', down);
    pin.addEventListener('pointerup', lift);
    pin.addEventListener('pointercancel', lift);
    return () => {
      window.removeEventListener('scroll', sync);
      pin.removeEventListener('pointerdown', down);
      pin.removeEventListener('pointerup', lift);
      pin.removeEventListener('pointercancel', lift);
    };
  }, [compact, choose]);
  if (!compact) return null;
  return (
    <div className="prelude__pick film__pick" ref={root}>
      <div className="film__pick-bar">
        <p className="t-label film__pick-cue" aria-hidden="true">
          Scroll
        </p>
        <p className="t-label film__pick-count" aria-hidden="true">
          <b>{pad(kind + 1)}</b> / {pad(heroCards.length)}
        </p>
        <button type="button" className="film__arrow film__arrow--prev" aria-label="Previous kind of building" disabled={kind === 0} onClick={() => choose(kind - 1)} />
        <button type="button" className="film__arrow film__arrow--next" aria-label="Next kind of building" disabled={kind === heroCards.length - 1} onClick={() => choose(kind + 1)} />
      </div>
      <ol className="film__cards" aria-label="Kinds of building">
        {heroCards.map((c, i) => (
          <li key={c.name}>
            <button type="button" className={`film__card${i === kind ? ' is-on' : ''}`} aria-pressed={i === kind} onClick={() => choose(i)}>
              <img src={c.src} alt="" width={240} height={150} loading="lazy" decoding="async" />
              <span className="film__card-text">
                <small>{c.code}</small>
                <span className="film__card-name">{c.name}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The opening card: the system in a sentence, over the three kinds of
 * building, one behind another on a polished floor in warm light, seen on
 * the diagonal and fitted to the screen (HeroScene). Each comes up out of
 * the floor whole, one after another. Scrolling takes the capsule and the
 * prefab block back down into it, goes to the modular house and brings its
 * land and sky in.
 */
const opening: Prelude = {
  length: 1.7,
  // On a phone there is no land to bring in after the three: the card is shorter (HeroMobileScene).
  lengthCompact: 1.05,
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
      <KindPick />
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
      // Three sets since 2026-11-07, each with the scroll it had among four (film/heroTimeline.ts).
      length={3.45}
      lengthCompact={3.6}
      Scene={Scene}
      labels={labels}
      stepExtras={actions}
      prelude={opening}
      eager
    >
      <PodPick where="foot" />
    </Film>
  );
}
