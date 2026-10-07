import { lazy, useMemo } from 'react';
import { useBuild } from '../../build/store';
import { factorySteps, factoryTitle } from '../../data/narrative';
import Film, { type FilmLabel, type Prelude } from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/FactoryScene'));

const stations: FilmLabel[] = [
  { id: 'pier', text: 'Adjustable pier' },
  { id: 'core', text: 'Core shell' },
  { id: 'insulation', text: 'Insulation panels' },
  { id: 'formwork', text: 'Formwork boards' },
  { id: 'pour', text: 'Mix delivered by hose' },
  { id: 'smooth', text: 'Smooth concrete' },
  { id: 'spray', text: 'Spray finish' },
];

/**
 * The tour's title screen. After "your house" it takes the whole screen in
 * ink with one line; scrolling opens it from the middle of the picture onto
 * the yard seen from above, where the tour begins.
 */
const opening: Prelude = {
  length: 1,
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

/** Section 6, part 1: the factory, from the gates to the truck, seen from above throughout. */
export default function FactoryTour() {
  const built = useBuild((s) => s.units.length > 0);
  const labels = useMemo<FilmLabel[]>(() => [...stations, { id: 'your-build', text: built ? 'Your build' : 'Sample build' }], [built]);
  return (
    <Film
      id="factory"
      index="06"
      heading="From the factory"
      variant="factory"
      theme="light"
      chapter="factory"
      captions="slide"
      steps={factorySteps}
      length={10}
      lengthCompact={9}
      prelude={opening}
      Scene={Scene}
      labels={labels}
    />
  );
}
