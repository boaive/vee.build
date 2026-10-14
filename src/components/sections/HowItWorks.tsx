import { lazy, useRef } from 'react';
import { systemSteps } from '../../data/narrative';
import { footprints, shells, sqm } from '../../data/system';
import Film, { type FilmLabel } from '../../film/Film';
import { useFilmProgress } from '../../film/progress';
import { counterAt, counterWindow } from '../../film/systemTimeline';

const Scene = lazy(() => import('../../three/scenes/SystemScene'));

const labels: FilmLabel[] = [
  { id: 'name-a', text: `${shells.A.name} · ${shells.A.label}`, kind: 'name' },
  { id: 'name-b', text: `${shells.B.name} · ${shells.B.label}`, kind: 'name' },
  { id: 'dim-a-l', text: '6 m', kind: 'dim' },
  { id: 'dim-a-d', text: '3 m', kind: 'dim' },
  { id: 'dim-a-h', text: '3 m', kind: 'dim' },
  { id: 'dim-b-l', text: '3 m', kind: 'dim' },
  { id: 'dim-b-d', text: '3 m', kind: 'dim' },
  { id: 'dim-b-h', text: '3 m', kind: 'dim' },
];

const areas = footprints.map((f) => sqm(f.slots.filter((s) => s !== null)));

/** Brief 2.2: numbers count up as the shapes alter. */
function Counter() {
  const root = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const recipe = useRef<HTMLSpanElement>(null);
  const area = useRef<HTMLSpanElement>(null);
  const scale = useRef<HTMLDivElement>(null);
  const last = useRef({ sqft: -1, index: -1, on: false });

  useFilmProgress((p) => {
    const on = p >= counterWindow.from && p <= counterWindow.to;
    const s = last.current;
    if (on !== s.on) {
      s.on = on;
      root.current?.classList.toggle('is-on', on);
    }
    if (!on) return;
    const c = counterAt(p);
    if (c.sqft !== s.sqft && value.current) {
      s.sqft = c.sqft;
      value.current.textContent = String(c.sqft);
    }
    if (c.index !== s.index) {
      s.index = c.index;
      if (recipe.current) recipe.current.textContent = footprints[c.index].recipe;
      if (area.current) area.current.textContent = `${areas[c.index]} m²`;
      // Every footprint the row has passed stays marked; the one on show takes the green (client, 2026-10-09).
      scale.current?.childNodes.forEach((n, i) => {
        (n as HTMLElement).classList.toggle('is-on', i <= c.index);
        (n as HTMLElement).classList.toggle('is-now', i === c.index);
      });
    }
  });

  return (
    <div className="counter" ref={root} aria-hidden="true" data-band="foot">
      <div className="counter__value">
        <span ref={value}>{footprints[0].sqft}</span>
        <small>sq.ft.</small>
      </div>
      <div className="counter__meta t-label">
        <span ref={recipe}>{footprints[0].recipe}</span>
        <span ref={area}>{areas[0]} m²</span>
      </div>
      <div className="counter__scale" ref={scale}>
        {footprints.map((f) => (
          <span key={f.sqft}>{f.sqft}</span>
        ))}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <Film
      id="how-it-works"
      index="02"
      heading="How it works?"
      theme="light"
      captions="wipe"
      steps={systemSteps}
      length={8}
      lengthCompact={7}
      Scene={Scene}
      labels={labels}
    >
      <Counter />
    </Film>
  );
}
