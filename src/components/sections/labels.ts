import { podLengthName, podLengths } from '../../data/pod';
import type { FilmLabel } from '../../film/Film';

/** The pod's lengths (data/pod.ts), each named under the pod in the hero's second banner when it is the one standing there. */
export const POD_LENGTH_LABELS: FilmLabel[] = podLengths.map((m) => ({
  id: `pod-${m}`,
  text: `${podLengthName(m)} long`,
  kind: 'dim',
}));
