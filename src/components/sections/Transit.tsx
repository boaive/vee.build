import { lazy } from 'react';
import { transitSteps } from '../../data/narrative';
import Film from '../../film/Film';

const Scene = lazy(() => import('../../three/scenes/TransitScene'));

/**
 * Section 8: the journey to site, as one short shot. The truck that left
 * the factory drives down the road towards the viewer and out of the
 * picture. It plays by itself, once, like a video, when its stage stands in
 * the window (client, 2026-10-10; film/Film.tsx, `play`). Since 2026-10-15
 * it never holds the page, on any layout (developer: "it should be
 * automatic video not scrollable type. and the video can be skipped by
 * scrolling"; on desktop the hold had made it "a mandatory view"). Before
 * 2026-10-10 the journey was a drawing of a truck on a line, filling like a
 * progress bar.
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
      Scene={Scene}
      play={{ seconds: 4 }}
    />
  );
}
