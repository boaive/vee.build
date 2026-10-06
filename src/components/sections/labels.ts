import type { FilmLabel } from '../../film/Film';

/** Capsule pod lengths from the brief. Shared by the hero and the Capsule page. */
export const POD_FEET_LABELS: FilmLabel[] = [10, 16, 20].map((ft) => ({
  id: `pod-${ft}`,
  text: `${ft}′ long`,
  kind: 'dim',
}));
