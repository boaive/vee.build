import { useRef, useState, type KeyboardEvent } from 'react';
import { build } from '../../build/store';
import { models } from '../../data/catalogue';
import { requestEnquiry } from '../forms/prefill';
import { IsoDrawing, PlanDrawing } from './CatalogueDrawings';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Section 5: an index of five models, one sheet at a time. */
export default function Catalogue() {
  const [current, setCurrent] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const model = models[current];

  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? models.length - 1 : step ? (current + step + models.length) % models.length : -1;
    if (to < 0) return;
    e.preventDefault();
    setCurrent(to);
    tabs.current[to]?.focus();
  };

  const enquire = () => {
    requestEnquiry({
      category: 'Modular Home',
      message: `Model ${model.n} — ${model.name} (${model.sqft} sq.ft.)\n`,
    });
  };

  return (
    <div className="cat">
      <div className="cat__index" role="tablist" aria-label="Catalogue models" aria-orientation="vertical" onKeyDown={onKey}>
        {models.map((m, i) => (
          <button
            key={m.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`cat-tab-${m.id}`}
            aria-selected={i === current}
            aria-controls="cat-sheet"
            tabIndex={i === current ? 0 : -1}
            className={`cat__tab${i === current ? ' is-current' : ''}`}
            onClick={() => setCurrent(i)}
          >
            <span className="t-label cat__tab-n">{m.n}</span>
            <span className="cat__tab-name">{m.name}</span>
            <span className="t-label cat__tab-area">{m.sqft} sq.ft.</span>
          </button>
        ))}
      </div>

      <article className="cat__sheet" id="cat-sheet" role="tabpanel" aria-labelledby={`cat-tab-${model.id}`} tabIndex={0} key={model.id}>
        <header className="cat__head">
          <p className="t-label">Model {model.n}</p>
          <h3 className="cat__name">{model.name}</h3>
          <p className="cat__area">
            {model.sqft}
            <small>sq.ft.</small>
          </p>
        </header>

        <div className="cat__figs">
          <figure className="cat__fig cat__fig--iso">
            <IsoDrawing model={model} />
            <figcaption className="t-label">Isometric view</figcaption>
          </figure>
          <figure className="cat__fig cat__fig--plan">
            <PlanDrawing model={model} />
            <figcaption className="t-label">
              {model.layoutSource === 'reference' ? 'Floor plan · indicative layout' : 'Module plan · room layout to follow'}
            </figcaption>
          </figure>
        </div>

        <dl className="cat__specs">
          <div>
            <dt className="t-label">Bedrooms</dt>
            <dd>{plural(model.beds, 'Bed')}</dd>
          </div>
          <div>
            <dt className="t-label">Bathrooms</dt>
            <dd>{plural(model.baths, 'Bath')}</dd>
          </div>
          <div>
            <dt className="t-label">Floors</dt>
            <dd>{plural(model.floors, 'Floor')}</dd>
          </div>
          <div>
            <dt className="t-label">Total area</dt>
            <dd>{model.sqft} sq.ft.</dd>
          </div>
          <div>
            <dt className="t-label">Configuration</dt>
            <dd>{model.recipe}</dd>
          </div>
          <div>
            <dt className="t-label">Footprint</dt>
            <dd>{model.footprint}</dd>
          </div>
        </dl>

        <footer className="cat__foot">
          <a className="btn" href="#contact" onClick={enquire}>
            Enquire about {model.name}
          </a>
          <a className="btn btn--ghost" href="#configure" onClick={() => build.loadPreset(model.id)}>
            Open in the configurator
          </a>
          <p className="cat__note">Start from this model in the configurator and change anything: shells, floors, add-ons.</p>
        </footer>
      </article>
    </div>
  );
}
