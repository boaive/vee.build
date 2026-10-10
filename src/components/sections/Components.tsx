import { lazy, useContext, useRef } from 'react';
import { addOns, componentCallouts, componentSteps } from '../../data/narrative';
import Film, { type FilmLabel } from '../../film/Film';
import { addOnsLanded, clock, layerNow, layersShown } from '../../film/componentsTimeline';
import { FilmContext, useFilmProgress } from '../../film/progress';

const Scene = lazy(() => import('../../three/scenes/ComponentsScene'));

const { layers, parts } = componentCallouts;
const labels: FilmLabel[] = [
  { id: 'layer-foundation', text: layers.foundation, kind: 'box' },
  { id: 'layer-module', text: layers.module, kind: 'box' },
  { id: 'layer-addons', text: layers.addons, kind: 'box' },
  { id: 'plug-footing', text: 'Plug footing', kind: 'box' },
  { id: 'l-plinth', text: 'L plinth', kind: 'box' },
  { id: 'jack-pier', text: 'Jack pier', kind: 'box' },
  { id: 'above-ground', text: '600 mm above ground', kind: 'dim' },
  { id: 'part-frame', text: parts.frame, kind: 'box' },
  { id: 'part-panels', text: parts.panels, kind: 'box' },
  { id: 'part-concrete', text: parts.concrete, kind: 'box' },
  // The optional things, tagged as they land (client, 2026-10-10).
  { id: 'addon-deck', sub: componentCallouts.addOn, text: addOns[0], kind: 'box' },
  { id: 'addon-steps', sub: componentCallouts.addOn, text: addOns[4], kind: 'box' },
  { id: 'addon-roof', sub: componentCallouts.addOn, text: 'Sloped roof', kind: 'box' },
  { id: 'addon', text: '', kind: 'pulse' },
];

/**
 * The opening's heading, a word at a time: each of the three arrives as
 * the picture shows the thing it names (componentsTimeline, BURST), and the
 * one that has just arrived is in the green. In the second burst the green
 * goes back along them, to the one whose thing is coming apart. Without
 * script all three stand there (film.css).
 */
function LayerTitle() {
  const root = useRef<HTMLSpanElement>(null);
  const shown = useRef(-1);
  useFilmProgress((p) => {
    const t = clock(p);
    const n = layersShown(t);
    const now = layerNow(t);
    // One number for the pair: the words that are on, and the one in the green.
    const state = n * 4 + now + 1;
    if (state === shown.current) return;
    shown.current = state;
    root.current?.querySelectorAll('.layer-word').forEach((el, i) => {
      el.classList.toggle('is-on', i < n);
      el.classList.toggle('is-now', i === now);
    });
  });
  return (
    <span className="layer-words" ref={root}>
      {[layers.foundation, layers.module, layers.addons].map((w) => (
        <span key={w} className="layer-word">
          {w}.{' '}
        </span>
      ))}
    </span>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="film__tags">
      {items.map((t) => (
        <li key={t} className="film__tag is-on">
          {t}
        </li>
      ))}
    </ul>
  );
}

/** Brief 3.3: interactive tags. Each lights as its part lands; hover or focus points to it. */
function AddOnTags() {
  const list = useRef<HTMLUListElement>(null);
  const landed = useRef(-1);
  const progress = useContext(FilmContext);

  useFilmProgress((p) => {
    const n = addOnsLanded(clock(p));
    if (n === landed.current) return;
    landed.current = n;
    // Every add-on that has landed stays lit; the one that has just come down is marked in green (client, 2026-10-09).
    list.current?.querySelectorAll('.film__tag').forEach((el, i) => {
      el.classList.toggle('is-on', i < n);
      el.classList.toggle('is-now', i === n - 1);
    });
  });

  const point = (i: number) => {
    if (!progress) return;
    progress.focus = i;
    progress.invalidate?.();
  };

  return (
    <ul className="film__tags" ref={list} onPointerLeave={() => point(-1)}>
      {addOns.map((t, i) => (
        <li key={t}>
          <button type="button" className="film__tag" onPointerEnter={() => point(i)} onFocus={() => point(i)} onBlur={() => point(-1)}>
            {t}
          </button>
        </li>
      ))}
    </ul>
  );
}

const extras = Object.fromEntries(
  componentSteps
    .filter((s) => s.tags)
    .map((s) => [s.id, s.id === 'addons' ? <AddOnTags key={s.id} /> : <Tags key={s.id} items={s.tags ?? []} />]),
);

export default function Components() {
  return (
    <Film
      id="components"
      index="03"
      heading="Componentized building"
      variant="components"
      theme="dark"
      captions="words"
      steps={componentSteps}
      length={9}
      lengthCompact={8}
      Scene={Scene}
      labels={labels}
      stepExtras={extras}
      stepTitles={{ overview: <LayerTitle /> }}
    />
  );
}
