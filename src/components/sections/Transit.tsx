import { lazy } from 'react';
import { transitSteps } from '../../data/narrative';
import Film from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/TransitScene'));

/**
 * Section 8, first part: the journey to site, as one short shot. The truck
 * that left the factory drives down the road towards the viewer and out of
 * the picture. It plays by itself, once, when the page is scrolled down
 * onto it, and the page is held for those few seconds (client, 2026-10-10;
 * film/Film.tsx, `play`; film/hold.ts). Before that date the journey was a
 * drawing of a truck on a line, filling like a progress bar.
 */
export default function Transit() {
  return (
    <Film
      id="delivery"
      index="08"
      heading="Delivery"
      variant="transit"
      theme="dark"
      chapter="delivery"
      /* Mounted while the visitor is still at the end of the factory, so that its picture is up when they arrive. */
      reach={3}
      captions="fade"
      steps={transitSteps}
      length={1.6}
      // On a compact layout the drive follows the scroll (Film, `play` is desktop's): a little more of it to scroll through.
      lengthCompact={2.3}
      Scene={Scene}
      play={{ seconds: 4 }}
    />
  );
}
