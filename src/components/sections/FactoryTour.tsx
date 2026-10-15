import { lazy } from 'react';
import { factoryCards, factorySteps, factoryTitle } from '../../data/narrative';
import ClipScene, { type Clip } from '../../film/ClipScene';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';
import type { SceneProps } from '../../film/progress';

const Live = lazy(() => import('../../three/scenes/FactoryScene'));

/**
 * On a compact layout the factory is recorded clips, one a station
 * (film/ClipScene.tsx; developer, 2026-10-15: "since the factory scene is
 * more like a 3d video, we can make it more realistic ... add in there like
 * a video"), rendered from this film's own scene by
 * `node scripts/factory-video.mjs` into `public/video/factory`: smooth on
 * any phone, and drawn at a quality no phone could draw live. Desktop, and a
 * tablet held sideways, keep the live scene. `?live` keeps it on a phone
 * too (QA, and what the clips are rendered from).
 */
const clips: Clip[] = factorySteps.map((s, i) => ({
  sources: [
    { src: `/video/factory/${s.id}.mp4`, type: 'video/mp4; codecs="avc1.640028"' },
  ],
  first: i === 0 ? `/video/factory/${s.id}-first.webp` : undefined,
  last: `/video/factory/${s.id}-last.webp`,
}));
const live = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('live');

function Scene(props: SceneProps) {
  return props.compact && !live ? <ClipScene {...props} clips={clips} /> : <Live {...props} />;
}

/* The call-outs in the picture: what each thing is, where it is. */
const labels: FilmLabel[] = [
  { id: 'frame', text: 'Structural frame' },
  { id: 'hook', text: 'Lifting hook, one a corner' },
  { id: 'panels', text: 'Insulation panels' },
  { id: 'formwork', text: 'Formwork' },
  { id: 'pour', text: 'Concrete, cast as walls' },
  { id: 'openings', text: 'Openings, left empty' },
  { id: 'joinery', text: 'Doors and windows' },
  { id: 'spray', text: 'Spray finish' },
  { id: 'rig', text: 'Lifted by its four hooks' },
];

/**
 * The tour's title screen. After "your house" it takes the whole screen in
 * ink with one line; scrolling opens it from the middle of the picture onto
 * the whole yard, seen on the diagonal, and the film then goes in to the
 * one bay where a shell is made from its frame to its finish. On a compact
 * layout the film is a page of cards on paper (Film, `pick`): the title
 * stands on the paper, and the picture rises into its card under it while
 * the camera comes down into the bay (2026-10-15).
 */
const opening: Prelude = {
  length: 1,
  lengthCompact: 0.75,
  tone: 'ink',
  toneCompact: 'paper',
  content: (
    <div className="prelude">
      <div className="prelude__top">
        <p className="t-label prelude__kicker">
          {factoryTitle.kicker} · {factorySteps.length - 1} stations
        </p>
        <p className="prelude__line">
          <span className="prelude__ln">
            <span>{factoryTitle.line[0]}</span>
          </span>
          <span className="prelude__ln">
            <span>
              <em>{factoryTitle.line[1]}</em>
            </span>
          </span>
        </p>
      </div>
    </div>
  ),
};

/** Section 7: the factory. One shell, from its steel frame to the truck. */
export default function FactoryTour() {
  return (
    <Film
      id="factory"
      index="07"
      heading="The factory"
      variant="factory"
      theme="light"
      chapter="factory"
      /*
       * The film before this one is only two screens long: by the time the page has stood still inside it, a
       * visitor scrolling on is already here. So the yard is mounted while they are still at the configurator.
       */
      reach={2.8}
      captions="slide"
      steps={factorySteps}
      length={10}
      // On a compact layout a station at a time, chosen with cards (pick), each reached as a short time-lapse of the bay.
      lengthCompact={1.5}
      // The clips are 3.2 seconds a station: the reel holds each station that long before its words' time.
      pick={{ label: 'Factory stations', cards: factoryCards, seconds: 3.2 }}
      prelude={opening}
      Scene={Scene}
      labels={labels}
    />
  );
}
