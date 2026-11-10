import { lazy } from 'react';
import { podOpening, podSteps } from '../../data/pod';
import type { FilmStep } from '../../data/narrative';
import Film, { type Prelude } from '../../film/Film';
import type { SceneProps } from '../../film/progress';
import { isLite } from '../../film/tier';
import PodPick from './PodPick';

/**
 * The POD page's opening (developer, 2026-11-09: "mimic the mod page, start
 * with the pod in plain background. show different sizes as an option, not
 * everything in same screen ... after that plain background, we show the
 * animated background. we only have one pod in there, other 2 will be
 * options to live, on clicking that the pod changes. by default it will be
 * in 10m"). The pod alone on the studio floor, coming up out of it on load;
 * scrolling spreads its land from under it and brings the blue-hour sky
 * up. It is the home page hero's own scene with the pod alone (HeroScene,
 * `solo`, `subject`), the MOD page's opening with the house in its place.
 * The length is chosen with the buttons all the while (PodPick): one pod,
 * which grows or shrinks by its middle panels (kit/pod.tsx). A budget
 * device keeps the floor and has no land (`bare`).
 *
 * What follows it on the page comes next (the developer: "the burst
 * animation or more like a construction of the pod ... which we will work
 * on next"): the model is built in its parts for that.
 */
const Pod3D = lazy(() => import('../../three/scenes/HeroScene'));

function Scene(props: SceneProps) {
  return <Pod3D {...props} solo subject="pod" bare={isLite()} />;
}

const steps = podSteps.map((s): FilmStep => ({ ...s, theme: 'dark' }));

/**
 * In the land's step: the lengths, and where the visitor goes from here, as
 * on the MOD page (developer, 2026-11-09: "have similar actions as like in
 * mod"): the plans, and the enquiry form, both on this page.
 */
const actions = {
  [steps[0].id]: (
    <>
      <PodPick />
      <div className="hero__actions">
        <a className="btn" href="#plans">
          See the plans
        </a>
        {/* Solid, in paper: it stands over the land, where a ghost button's outline was lost in the trees. */}
        <a className="btn btn--light btn--down" href="#register">
          Enquire now
        </a>
      </div>
    </>
  ),
};

const opening: Prelude = {
  length: 1.3,
  tone: 'paper',
  opening: 'studio',
  content: (
    <div className="prelude">
      <div className="prelude__top">
        <p className="t-label prelude__kicker">{podOpening.kicker}</p>
        <p className="prelude__line">
          <span className="prelude__ln">
            <span>{podOpening.line[0]}</span>
          </span>
          <span className="prelude__ln">
            <span>
              <em>{podOpening.line[1]}</em>
            </span>
          </span>
        </p>
      </div>
      <div className="prelude__rest">
        <p className="prelude__sub">{podOpening.sub}</p>
        <PodPick />
        <div className="hero__actions prelude__actions">
          <a className="btn btn--down" href="#register">
            Enquire now
          </a>
          <a className="btn btn--ghost" href="#plans">
            See the plans
          </a>
        </div>
      </div>
    </div>
  ),
};

export default function PodHero() {
  return (
    <Film
      id="pod"
      index="01"
      heading="Capsule home"
      headingTag="h1"
      stepTag="p"
      variant="hero"
      theme="light"
      captions="blur"
      steps={steps}
      // The pinned screen itself is one of these: what is left is the step's own scroll, about a screen.
      length={1.9}
      Scene={Scene}
      stepExtras={actions}
      prelude={opening}
      eager
      // On a phone or a tablet held upright the lengths stand at the foot of the picture, the whole film long, its opening too.
      dock={<PodPick where="foot" className="hero__pods pod-pick--always" />}
    />
  );
}
