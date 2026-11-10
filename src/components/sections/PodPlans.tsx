import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { podPlanSvg } from '../../build/podPlanSvg';
import { podAreas, podBrochure, podDefault, podLayouts, podLengthName, podLengths, podPlans, podSection, type PodLayoutKey, type PodLengthM } from '../../data/pod';
import { chooseLayout, choosePod, podChoice } from '../../film/podChoice';
import { createProgress, type PlaceLabel } from '../../film/progress';
import { POD, podBays } from '../../three/kit/podPlan';

const Scene = lazy(() => import('../../three/scenes/PodPlanScene'));

/**
 * The page's choice of length and layout (film/podChoice.ts), followed: the opening, the layers film and this share it.
 * The first render is the server's (the first length and layout), whatever was chosen before this hydrated; the
 * choice is taken up just after, or the page's HTML and the first render would disagree.
 */
function useChoice() {
  const [c, setC] = useState({ length: podDefault as PodLengthM, layout: 'A' as PodLayoutKey });
  useEffect(() => {
    const go = () => setC({ length: podChoice.length, layout: podChoice.layout });
    podChoice.listeners.add(go);
    go();
    return () => {
      podChoice.listeners.delete(go);
    };
  }, []);
  return c;
}

/** The 3D: mounted near the viewport, drawn on demand, turned a little by the pointer (as the product pages' stages are). */
function Stage3D({ label }: { label: string }) {
  const root = useRef<HTMLDivElement>(null);
  const progress = useMemo(() => {
    const p = createProgress();
    p.target = 0.5;
    return p;
  }, []);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(window.location.search).has('still'));
    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '60% 0px' });
    const ioVisible = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    ioNear.observe(el);
    ioVisible.observe(el);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      progress.target = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      progress.invalidate?.();
    };
    const leave = () => {
      progress.target = 0.5;
      progress.invalidate?.();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      ioNear.disconnect();
      ioVisible.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [progress]);
  useEffect(() => {
    if (!near) setReady(false);
  }, [near]);
  const place = useCallback<PlaceLabel>(() => {}, []);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <div className={`plans__stage${ready ? ' is-ready' : ''}`} ref={root} role="img" aria-label={label}>
      {near && (
        <Suspense fallback={null}>
          <Scene progress={progress} place={place} compact={false} active={visible} reduced={reduced} onReady={onReady} />
        </Suspense>
      )}
    </div>
  );
}

/** A length's panels along it, in metres: the head end's module, the door bay, the middle bays, the far end's module (podPlan.ts). */
const modules = (m: number) => [POD.end, POD.door, ...Array.from({ length: podBays(m) }, () => POD.bay), POD.end];
const LONGEST = podLengths[podLengths.length - 1];

/**
 * The POD page's plans (developer, 2026-11-09: "we show then 3 options, and
 * there floor plan along with same 3d. the user can view the floor plan in
 * detail, also they can download it as broacher. enquire about them ... we
 * keep simple in the page. we only show more if the user want it to see").
 * Redesigned on 2026-11-10 to sit with the rest of the site ("it is too
 * much out of phase with the website. make it little modern"): the Home
 * range's warm studio light and its glass card, the enquiry form's options,
 * the chapter line. The lengths are drawn as what they are, panels: the two
 * end modules, the door bay and the middle bays, to one scale, so the
 * choice shows how the pod grows. The pod in 3D on the light with its top
 * off, its plan under it from the same plan (build/podPlanSvg.ts) with its
 * length dimensioned; beside them the length and the layout to choose, the
 * size and the rooms, the plan large on asking, the brochure, the form.
 * On a phone the choices come first. Without script, the first length and
 * layout stand as drawn.
 */
export default function PodPlans() {
  const { length, layout } = useChoice();
  const L = length as PodLengthM;
  const plan = podLayouts[L][layout];
  const title = `${podLengthName(L)}, layout ${layout}: ${plan.name}`;
  const small = useMemo(() => podPlanSvg(L, layout, false, `Floor plan, ${title}`), [L, layout, title]);
  const large = useMemo(() => podPlanSvg(L, layout, true, `Floor plan, ${title}`), [L, layout, title]);
  const dialog = useRef<HTMLDialogElement>(null);
  // The drawing's frame runs a quarter metre past each end (podPlanSvg): the dimension spans the pod alone.
  const dimInset = `${((0.25 / (L + 0.5)) * 100).toFixed(3)}%`;

  return (
    <section className="section theme-light plans" data-theme="light" id="plans" aria-labelledby="plans-heading">
      <div className="wrap">
        <header className="plans__head">
          <p className="eyebrow">
            <b>{podPlans.index}</b> {podPlans.name}
          </p>
          <h2 className="plans__title" id="plans-heading">
            {podPlans.title}
          </h2>
          <p className="t-lead plans__lead">{podPlans.lead}</p>
        </header>

        <div className="plans__body">
          <div className="plans__view">
            <Stage3D label={`The ${podLengthName(L)} pod from above, its top off: ${plan.rooms}.`} />
            <figure className="plans__drawing">
              <div className="plans__svg" dangerouslySetInnerHTML={{ __html: small }} />
              <figcaption className="plans__dim" style={{ '--inset': dimInset } as CSSProperties}>
                <span>{podLengthName(L)}</span>
              </figcaption>
            </figure>
          </div>

          <div className="plans__panel">
            <div className="plans__pick">
              <div className="plans__group" role="group" aria-labelledby="plans-length">
                <p className="t-label plans__label" id="plans-length">
                  {podPlans.lengthLabel}
                </p>
                {podLengths.map((m) => (
                  <button key={m} type="button" className="plans__len" aria-pressed={m === L} onClick={() => choosePod(m)}>
                    <span className="plans__len-m">
                      {m}
                      <small> m</small>
                    </span>
                    <span className="plans__mods" style={{ '--k': m / LONGEST } as CSSProperties} aria-hidden="true">
                      {modules(m).map((w, i) => (
                        <i key={i} style={{ flexGrow: w }} />
                      ))}
                    </span>
                    <span className="plans__len-area">{podAreas[m]} m²</span>
                  </button>
                ))}
              </div>
              <div className="plans__group" role="group" aria-labelledby="plans-layout">
                <p className="t-label plans__label" id="plans-layout">
                  {podPlans.layoutLabel}
                </p>
                <div className="plans__layouts">
                  {(['A', 'B'] as const).map((k) => (
                    <button key={k} type="button" className="plans__layout" aria-pressed={k === layout} onClick={() => chooseLayout(k)}>
                      <span className="plans__layout-name">
                        <b>{k}</b>
                        {podLayouts[L][k].name}
                      </span>
                      <span className="plans__layout-rooms">{podLayouts[L][k].rooms}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="plans__info">
              <dl className="plans__facts">
                <div>
                  <dt className="t-label">{podPlans.sizeLabel}</dt>
                  <dd>
                    {L} × {podSection.width} × {podSection.height} m
                  </dd>
                </div>
                <div>
                  <dt className="t-label">{podPlans.areaLabel}</dt>
                  <dd>{podAreas[L]} m²</dd>
                </div>
              </dl>
              <div className="plans__actions">
                <button type="button" className="btn btn--sm" onClick={() => dialog.current?.showModal()}>
                  {podPlans.view}
                </button>
                <a className="btn btn--sm btn--ghost btn--down" href={podBrochure(L)} download>
                  {podPlans.brochure}
                </a>
                <a className="link plans__enquire" href="#register">
                  {podPlans.enquire}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <dialog className="plans__dialog" ref={dialog} aria-labelledby="plans-dialog-title">
        <div className="plans__dialog-head">
          <p className="t-label" id="plans-dialog-title">
            {title}
          </p>
          <button type="button" className="plans__close" onClick={() => dialog.current?.close()}>
            {podPlans.close}
          </button>
        </div>
        <div className="plans__svg plans__svg--large" dangerouslySetInnerHTML={{ __html: large }} />
        <p className="plans__dialog-foot t-label">
          {L} × {podSection.width} × {podSection.height} m · {podAreas[L]} m² · {plan.rooms}
        </p>
      </dialog>
    </section>
  );
}
