import { lazy, useContext, useRef } from 'react';
import { addOns, componentSteps } from '../../data/narrative';
import Film, { type FilmLabel } from '../../film/Film';
import { addOnsLanded } from '../../film/componentsTimeline';
import { FilmContext, useFilmProgress } from '../../film/progress';

const Scene = lazy(() => import('../../three/scenes/ComponentsScene'));

const labels: FilmLabel[] = [
  { id: 'layer-foundation', text: '1 · Foundation' },
  { id: 'layer-shell', text: '2 · Insulated shell' },
  { id: 'layer-addons', text: '3 · Add-ons' },
  { id: 'plug-footing', text: 'Plug footing' },
  { id: 'l-plinth', text: 'L plinth' },
  { id: 'jack-pier', text: 'Jack pier' },
  { id: 'above-ground', text: '600 mm above ground', kind: 'dim' },
  { id: 'frame', text: 'Perimeter frame' },
  { id: 'ext-panel', text: 'Exterior panel' },
  { id: 'int-panel', text: 'Interior panel' },
  { id: 'addon', text: '', kind: 'pulse' },
];

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
    const n = addOnsLanded(p);
    if (n === landed.current) return;
    landed.current = n;
    list.current?.querySelectorAll('.film__tag').forEach((el, i) => el.classList.toggle('is-on', i < n));
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
      heading="Building components"
      theme="dark"
      captions="words"
      steps={componentSteps}
      length={8}
      lengthCompact={7}
      Scene={Scene}
      labels={labels}
      stepExtras={extras}
    />
  );
}
