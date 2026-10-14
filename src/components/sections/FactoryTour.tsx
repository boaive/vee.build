import { lazy } from 'react';
import { factoryCards, factorySteps, factoryTitle } from '../../data/narrative';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/FactoryScene'));

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
 * one bay where a shell is made from its frame to its finish.
 */
const opening: Prelude = {
  length: 1,
  lengthCompact: 0.75,
  tone: 'ink',
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
      pick={{ label: 'Factory stations', cards: factoryCards, seconds: 1.3 }}
      prelude={opening}
      Scene={Scene}
      labels={labels}
    />
  );
}
