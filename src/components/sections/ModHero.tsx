import { lazy } from 'react';
import { modOpening, modSteps } from '../../data/narrative';
import { numberOf, sections } from '../../data/site';
import Film, { type Prelude } from '../../film/Film';
import { prefetchScenes } from '../../film/prefetch';
import type { SceneProps } from '../../film/progress';
import { isLite } from '../../film/tier';

/**
 * The MOD page's opening (developer, 2026-11-07): the modular house alone on
 * the studio floor, coming up out of it on load; scrolling spreads its land
 * from under it and brings the sky up, and the words change with the
 * picture. It is the home page hero's own scene with the house alone
 * (HeroScene, `solo`), so it is the same house in the same light. A budget
 * device (film/tier.ts) keeps the floor: the land is the heaviest thing the
 * hero draws (`bare`).
 */
const House = lazy(() => import('../../three/scenes/HeroScene'));

function Scene(props: SceneProps) {
  return <House {...props} solo bare={isLite()} />;
}

/** Where the visitor goes from here: the configurator and the enquiry form, both on this page. */
const actions = {
  [modSteps[0].id]: (
    <div className="hero__actions">
      <a className="btn" href="#configure">
        Build your own
      </a>
      {/* Solid, in paper: it stands over the land, where a ghost button's outline was lost in the trees. */}
      <a className="btn btn--light btn--down" href="#contact">
        Enquire now
      </a>
    </div>
  ),
};

const opening: Prelude = {
  length: 1.3,
  tone: 'paper',
  opening: 'studio',
  content: (
    <div className="prelude">
      <div className="prelude__top">
        <p className="t-label prelude__kicker">{modOpening.kicker}</p>
        <p className="prelude__line">
          <span className="prelude__ln">
            <span>{modOpening.line[0]}</span>
          </span>
          <span className="prelude__ln">
            <span>
              <em>{modOpening.line[1]}</em>
            </span>
          </span>
        </p>
      </div>
      <div className="prelude__rest">
        <p className="prelude__sub">{modOpening.sub}</p>
        {/* The first screen asks too (developer, 2026-11-07: "have enquire now button in there too"). */}
        <div className="hero__actions prelude__actions">
          <a className="btn btn--down" href="#contact">
            Enquire now
          </a>
          <a className="btn btn--ghost" href="#configure">
            Build your own
          </a>
        </div>
      </div>
    </div>
  ),
};

export default function ModHero() {
  const id = sections[0].id;
  return (
    <Film
      id={id}
      index={numberOf(id)}
      heading={sections[0].label}
      headingTag="h1"
      stepTag="p"
      variant="hero"
      theme="light"
      captions="blur"
      steps={modSteps}
      // The pinned screen itself is one of these: what is left is the step's own scroll, about a screen.
      length={1.9}
      Scene={Scene}
      stepExtras={actions}
      prelude={opening}
      onReady={() => window.setTimeout(prefetchScenes, 1500)}
      eager
    />
  );
}
