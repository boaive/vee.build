import { lazy, useMemo } from 'react';
import { useBuild } from '../../build/store';
import { factorySteps } from '../../data/narrative';
import Film, { type FilmLabel } from '../../film/Film';

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

/** Section 6, part 1: the factory, from the gates to the truck. */
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
      Scene={Scene}
      labels={labels}
    />
  );
}
