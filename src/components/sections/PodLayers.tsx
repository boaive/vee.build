import { lazy, useRef } from 'react';
import { podLayerCallouts, podLayerSteps, podLayerWords } from '../../data/pod';
import Film, { type FilmLabel } from '../../film/Film';
import { wordNow, wordsShown } from '../../film/podLayersTimeline';
import { useFilmProgress } from '../../film/progress';

const Scene = lazy(() => import('../../three/scenes/PodLayersScene'));

const c = podLayerCallouts;
const labels: FilmLabel[] = [
  { id: 'pl-skin', text: c.skin, kind: 'box' },
  { id: 'pl-insulation', text: c.insulation, kind: 'box' },
  { id: 'pl-frame', text: c.frame, kind: 'box' },
  { id: 'pl-plumbing', text: c.plumbing, kind: 'box' },
  { id: 'pl-panels', text: c.panels, kind: 'box' },
  { id: 'pl-interior', text: c.interior, kind: 'box' },
  { id: 'pl-wiring', text: c.wiring, kind: 'box' },
  { id: 'pl-rolls', text: c.rolls, kind: 'box' },
  { id: 'pl-walls', text: c.walls, kind: 'box' },
  { id: 'pl-top', text: c.top, kind: 'box' },
];

/**
 * The opening's heading, a word at a time: each of the five arrives as the
 * picture shows its layer, and the one that has just arrived is in the
 * green; in the chapters the green is the chapter's word. As MOD's
 * components film has it (Components.tsx). Without script all five stand.
 */
function LayerWords() {
  const root = useRef<HTMLSpanElement>(null);
  const shown = useRef('');
  useFilmProgress((p) => {
    const on = wordsShown(p);
    const now = wordNow(p);
    const state = `${on.join()}|${now}`;
    if (state === shown.current) return;
    shown.current = state;
    root.current?.querySelectorAll('.layer-word').forEach((el, i) => {
      el.classList.toggle('is-on', on.includes(i) || (now >= 0 && p > 0.2));
      el.classList.toggle('is-now', i === now);
    });
  });
  return (
    <span className="layer-words" ref={root}>
      {podLayerWords.map((w) => (
        <span key={w} className="layer-word">
          {w}.{' '}
        </span>
      ))}
    </span>
  );
}

/**
 * The POD page's second chapter: the pod taken apart, then built again in
 * the order it is made (developer, 2026-11-09; PodLayersScene,
 * film/podLayersTimeline.ts). Its length and layout are the page's choice.
 */
export default function PodLayers() {
  return (
    <Film
      id="layers"
      index="02"
      heading="Built in layers"
      variant="components"
      theme="dark"
      captions="words"
      steps={podLayerSteps}
      length={8}
      lengthCompact={7}
      Scene={Scene}
      labels={labels}
      stepTitles={{ layers: <LayerWords /> }}
    />
  );
}
