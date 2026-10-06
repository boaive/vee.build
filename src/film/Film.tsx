import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { FilmStep } from '../data/narrative';
import { FilmContext, createProgress, type PlaceLabel, type SceneProps } from './progress';
import { clamp01 } from './timeline';

export interface FilmLabel {
  id: string;
  text: string;
  kind?: 'dim' | 'call' | 'pulse' | 'name';
}

/**
 * A title card before the film: a plain screen with a few words. Scrolling
 * drifts the words away and opens the card like a letterbox onto the scene,
 * which is already drawn underneath.
 */
export interface Prelude {
  /** Scroll length in viewport heights. */
  length: number;
  content: ReactNode;
  tone?: 'paper' | 'ink';
}

interface FilmProps {
  id: string;
  index: string;
  heading: string;
  headingTag?: 'h1' | 'h2';
  stepTag?: 'h2' | 'h3' | 'p';
  variant?: string;
  theme?: 'light' | 'dark';
  /** Rail chapter this film belongs to (defaults to its own id). */
  chapter?: string;
  steps: FilmStep[];
  /** Scroll length in viewport heights. */
  length: number;
  lengthCompact?: number;
  Scene: ComponentType<SceneProps>;
  labels?: FilmLabel[];
  /** Mount the canvas straight away instead of waiting for proximity. */
  eager?: boolean;
  /** Extra DOM pinned with the stage (HUD, counters). */
  children?: ReactNode;
  /** Extra DOM rendered inside a step's caption, keyed by step id. */
  stepExtras?: Record<string, ReactNode>;
  /** How captions change: each section has its own. Captions never travel with the scroll. */
  captions?: 'fade' | 'blur' | 'wipe' | 'words' | 'slide' | 'track';
  prelude?: Prelude;
  /** Called once the scene has drawn its first frames. */
  onReady?: () => void;
}

const DAMPING = 6.5;

function stepIndex(steps: FilmStep[], p: number) {
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (p >= steps[k].at - 1e-6) i = k;
  return i;
}

/**
 * A pinned, scroll-driven scene with captions.
 *
 * The section is `length` viewports tall (plus any prelude) with a sticky
 * stage. Captions stay in place on the stage and change as the active step
 * changes, with a transition chosen per section (`captions`). Scroll
 * position maps to a 0–1 target; a damped copy drives the 3D scene, the
 * active step and any HUD. Nothing here intercepts the wheel or touch events.
 */
export default function Film({
  id,
  index,
  heading,
  headingTag = 'h2',
  stepTag = 'h3',
  variant = 'default',
  theme = 'light',
  chapter,
  steps,
  length,
  lengthCompact,
  Scene,
  labels = [],
  eager = false,
  children,
  stepExtras,
  captions = 'fade',
  prelude,
  onReady: onReadyProp,
}: FilmProps) {
  const root = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const labelEls = useRef(new Map<string, HTMLElement>());
  const progress = useMemo(() => {
    const p = createProgress();
    p.pre = prelude ? 0 : 1;
    return p;
  }, [prelude]);

  const [active, setActive] = useState(0);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const state = useRef({ raf: 0, last: 0, active: 0, reduced: false, visible: false, pre: '' });
  const preLen = prelude?.length ?? 0;

  /* Environment queries */
  useEffect(() => {
    setHydrated(true);
    const mqCompact = window.matchMedia('(max-width: 860px)');
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // `?still` shows every film in its settled poses (QA and screenshots).
    const still = new URLSearchParams(window.location.search).has('still');
    const sync = () => {
      setCompact(mqCompact.matches);
      setReduced(still || mqReduced.matches);
      state.current.reduced = still || mqReduced.matches;
    };
    sync();
    mqCompact.addEventListener('change', sync);
    mqReduced.addEventListener('change', sync);
    return () => {
      mqCompact.removeEventListener('change', sync);
      mqReduced.removeEventListener('change', sync);
    };
  }, []);

  /* Damping loop: runs only while the value is still catching up. */
  const tick = useCallback(
    (now: number) => {
      const s = state.current;
      const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016);
      s.last = now;

      let target = progress.target;
      if (s.reduced) target = steps[stepIndex(steps, target)].pose;

      const d = target - progress.value;
      if (s.reduced || Math.abs(d) < 0.0002) progress.value = target;
      else progress.value += d * (1 - Math.exp(-dt * DAMPING));

      progress.listeners.forEach((fn) => fn(progress.value));
      progress.invalidate?.();

      const idx = stepIndex(steps, progress.value);
      if (idx !== s.active) {
        s.active = idx;
        setActive(idx);
      }

      s.raf = progress.value !== target && s.visible ? requestAnimationFrame(tick) : 0;
    },
    [progress, steps],
  );

  const kick = useCallback(() => {
    const s = state.current;
    if (s.raf) return;
    s.last = performance.now();
    s.raf = requestAnimationFrame(tick);
  }, [tick]);

  /* Scroll → target (and the prelude's own 0–1) */
  useEffect(() => {
    const el = root.current;
    const pin = sticky.current;
    if (!el || !pin) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const vh = pin.offsetHeight;
      const prePx = preLen * vh;
      const travel = r.height - vh - prePx;
      if (preLen > 0) {
        let pre = clamp01(-r.top / prePx);
        if (state.current.reduced) pre = pre > 0.5 ? 1 : 0;
        progress.pre = pre;
        // Written only when it changes: every write restyles the whole pinned stage.
        const v = pre.toFixed(4);
        if (v !== state.current.pre) {
          state.current.pre = v;
          card.current?.style.setProperty('--pre', v);
          pin.style.setProperty('--pre', v);
        }
      }
      progress.target = travel > 0 ? clamp01((-r.top - prePx) / travel) : 0;
      kick();
    };

    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '90% 0px' });
    const ioVisible = new IntersectionObserver(([e]) => {
      state.current.visible = e.isIntersecting;
      setVisible(e.isIntersecting);
      if (e.isIntersecting) measure();
    });
    ioNear.observe(el);
    ioVisible.observe(el);

    const onScroll = () => {
      if (state.current.visible) measure();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();

    return () => {
      ioNear.disconnect();
      ioVisible.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(state.current.raf);
      state.current.raf = 0;
    };
  }, [progress, kick, preLen]);

  useEffect(() => {
    if (!near) setReady(false);
  }, [near]);

  useEffect(() => {
    kick();
  }, [reduced, kick]);

  const place = useCallback<PlaceLabel>((labelId, x, y, opacity) => {
    const el = labelEls.current.get(labelId);
    if (!el) return;
    if (opacity <= 0.01) {
      if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }, []);

  const goTo = (i: number) => {
    const el = root.current;
    const pin = sticky.current;
    if (!el || !pin) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const prePx = preLen * pin.offsetHeight;
    const travel = el.offsetHeight - pin.offsetHeight - prePx;
    window.scrollTo({ top: top + prePx + steps[i].pose * travel + 1, behavior: reduced ? 'auto' : 'smooth' });
  };

  const onReady = useCallback(() => {
    setReady(true);
    performance.mark?.(`vee:film-ready:${id}`);
    onReadyProp?.();
    window.dispatchEvent(new CustomEvent('vee:film-ready', { detail: id }));
  }, [onReadyProp, id]);

  /* A step can switch the caption theme (a dark sky needs light text). */
  const stepTheme = steps[active].theme ?? theme;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('vee:theme'));
  }, [stepTheme]);

  // The hero stays mounted (`eager`) so its opening assembly does not replay.
  const mount = hydrated && (eager || near);
  /*
   * One element for as long as its props hold. A change of caption re-renders
   * this component, and without this it re-rendered the whole 3D scene with it.
   */
  const scene = useMemo(
    () => <Scene progress={progress} place={place} compact={compact} active={visible} reduced={reduced} onReady={onReady} />,
    [Scene, progress, place, compact, visible, reduced, onReady],
  );
  const Heading = headingTag;
  const StepTitle = stepTag;
  const len = length + preLen;
  const lenC = (lengthCompact ?? length) + preLen;

  return (
    <FilmContext.Provider value={progress}>
      <section
        id={id}
        ref={root}
        className={`film film--${variant} theme-${stepTheme}${reduced ? ' is-still' : ''}${prelude ? ' has-prelude' : ''}`}
        data-theme={stepTheme}
        data-chapter={chapter ?? id}
        data-step={steps[active].id}
        aria-labelledby={`${id}-heading`}
        style={{ '--film-len': len, '--film-len-c': lenC } as CSSProperties}
      >
        <div className="film__sticky" ref={sticky}>
          <div className={`film__stage${ready ? ' is-ready' : ''}`} aria-hidden="true">
            {mount && <Suspense fallback={null}>{scene}</Suspense>}
            <div className="film__labels">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className={`lbl lbl--${l.kind ?? 'call'}`}
                  style={{ visibility: 'hidden' }}
                  ref={(el) => {
                    if (el) labelEls.current.set(l.id, el);
                    else labelEls.current.delete(l.id);
                  }}
                >
                  <span>{l.text}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="film__hud">
            <header className="film__head">
              <span className="film__index">{index}</span>
              <Heading id={`${id}-heading`} className="film__heading">
                {heading}
              </Heading>
            </header>

            <ol className="film__steps" data-captions={captions}>
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  className={`film__step${i === active ? ' is-active' : i < active ? ' is-past' : ''}`}
                  aria-current={i === active ? 'step' : undefined}
                  aria-hidden={i === active ? undefined : true}
                >
                  <p className="t-label film__kicker">{s.kicker}</p>
                  <StepTitle className="film__title" data-long={s.title.length > 48 ? '' : undefined}>
                    {captions === 'words'
                      ? s.title.split(' ').map((w, k, all) => (
                          <Fragment key={k}>
                            <span className="film__word" style={{ '--w': k } as CSSProperties}>
                              {w}
                            </span>
                            {k < all.length - 1 ? ' ' : null}
                          </Fragment>
                        ))
                      : s.title}
                  </StepTitle>
                  {s.body && <p className="film__body">{s.body}</p>}
                  {s.note && <p className="film__note">{s.note}</p>}
                  {stepExtras?.[s.id]}
                  {s.link && (
                    <a className="link film__link" href={s.link.href} tabIndex={i === active ? 0 : -1}>
                      {s.link.label}
                    </a>
                  )}
                </li>
              ))}
            </ol>

            {children}

            <div className="film__ticks" role="group" aria-label={`${heading}: steps`}>
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`film__tick${i === active ? ' is-active' : ''}`}
                  aria-label={`Step ${i + 1} of ${steps.length}: ${s.title}`}
                  aria-current={i === active ? 'step' : undefined}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </div>

          {prelude && (
            <div className={`film__prelude film__prelude--${prelude.tone ?? 'paper'}`} ref={card}>
              <div className="film__prelude-inner">{prelude.content}</div>
              <span className="film__prelude-cue" aria-hidden="true">
                Scroll
              </span>
            </div>
          )}
        </div>
      </section>
    </FilmContext.Provider>
  );
}
