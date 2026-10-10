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
import { holdPage } from './hold';
import { FilmContext, createProgress, type PlaceLabel, type SceneProps } from './progress';
import { clamp01 } from './timeline';

export interface FilmLabel {
  id: string;
  text: string;
  /** A small line over the text (kind: the menu's short name for a line of buildings). */
  sub?: string;
  kind?: 'dim' | 'call' | 'pulse' | 'name' | 'kind' | 'box';
}

/**
 * A title card before the film, which is already running under it. Either
 * a window onto the scene that scrolling grows until the picture fills the
 * screen, or a studio: the scene's subject alone on a lit backdrop with
 * mist at its feet, where the scene itself brings its world in as the page
 * scrolls and the mist rises over the change and clears. The words drift
 * away as it opens (film.css, Prelude).
 */
export interface Prelude {
  /** Scroll length in viewport heights. */
  length: number;
  content: ReactNode;
  tone?: 'paper' | 'ink';
  opening?: 'window' | 'mist';
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
  /** How many screens below the viewport this film may be mounted ahead of time (REACH unless given). */
  reach?: number;
  /** Extra DOM pinned with the stage (HUD, counters). */
  children?: ReactNode;
  /** Extra DOM rendered inside a step's caption, keyed by step id. */
  stepExtras?: Record<string, ReactNode>;
  /** A step's title drawn by its section instead of set as text (words that follow the picture), keyed by step id. */
  stepTitles?: Record<string, ReactNode>;
  /** How captions change: each section has its own. Captions never travel with the scroll. */
  captions?: 'fade' | 'blur' | 'wipe' | 'words' | 'slide' | 'track';
  prelude?: Prelude;
  /** Called once the scene has drawn its first frames. */
  onReady?: () => void;
  /**
   * A film that plays by itself instead of following the scroll (client,
   * 2026-10-10, for the truck's drive: "a short loading animation"). When a
   * visitor scrolls down onto it, the page is held (film/hold.ts) and the
   * film runs from 0 to 1 in `seconds`; then the page is let go. Once.
   * Before that it shows its first frame, and so it does if it is reached
   * any other way (a link, the scrollbar): it only ever holds a scroll the
   * visitor is making. With reduced motion it never holds, and shows its
   * step's settled pose.
   */
  play?: { seconds: number };
}

const DAMPING = 6.5;
/**
 * A film's scene is mounted when the film is within a screen of the
 * viewport, which is while the page is scrolling towards it: geometry, a
 * WebGL context, the environment map and the shaders were all made in the
 * middle of that scroll, and it stuttered once on the way into every film
 * (developer, 2026-10-10: "while scrolling to your build I can feel a
 * little lag"). So a film that is within REACH screens below the viewport
 * is mounted ahead of time, in the first moment the page has stood still
 * for QUIET_MS and nothing is being pointed at or typed; a film farther off
 * waits a little longer (STAGGER_MS a screen), so two are not mounted in
 * one breath. A visitor who never stops gets it the old way.
 *
 * Only below, and no farther: a mounted stage holds 300 to 500 MB of GPU
 * memory (its shadow map, the finish's targets, its textures). Reaching
 * three screens both ways had five canvases mounted at the foot of the
 * configurator and a GPU process of 2.6 GB where it had been 1.6 (notes F9).
 */
const REACH = 1.75;
const QUIET_MS = 280;
const STAGGER_MS = 260;

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
 * active step and any HUD. Nothing here intercepts the wheel or touch
 * events, with one exception the client asked for: a film that plays by
 * itself (`play`) holds the page for its few seconds (film/hold.ts).
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
  reach = REACH,
  children,
  stepExtras,
  stepTitles,
  captions = 'fade',
  prelude,
  onReady: onReadyProp,
  play,
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
  /** Mounted ahead of time: within reach, and the page has stood still. */
  const [early, setEarly] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  /** The title card has opened all the way: it and its clip are taken off the stage. */
  const [open, setOpen] = useState(false);
  /** The picture has taken more of the screen than the card: the header reads against the picture from here. */
  const [risen, setRisen] = useState(false);
  /** A film that plays by itself has played. */
  const [played, setPlayed] = useState(false);
  const playing = useRef({ on: false, done: false, raf: 0, input: 0, lastY: 0, ready: false, release: null as (() => void) | null });

  const state = useRef({ raf: 0, last: 0, active: 0, reduced: false, visible: false, pre: '', open: false, risen: false, seen: false, soon: false, early: false });
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
        // The title card's words rise once it has taken most of the screen (film.css, .is-seen).
        if (!state.current.seen && r.top < vh * 0.45) {
          state.current.seen = true;
          card.current?.classList.add('is-seen');
        }
        let pre = clamp01(-r.top / prePx);
        if (state.current.reduced) pre = pre > 0.5 ? 1 : 0;
        progress.pre = pre;
        // Written only when it changes: every write restyles the whole pinned stage.
        const v = pre.toFixed(4);
        if (v !== state.current.pre) {
          state.current.pre = v;
          card.current?.style.setProperty('--pre', v);
          pin.style.setProperty('--pre', v);
          const done = pre >= 0.999;
          if (done !== state.current.open) {
            state.current.open = done;
            setOpen(done);
          }
          const up = pre >= 0.8;
          if (up !== state.current.risen) {
            state.current.risen = up;
            setRisen(up);
          }
        }
      }
      if (!play) progress.target = travel > 0 ? clamp01((-r.top - prePx) / travel) : 0;
      kick();
    };

    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '90% 0px' });
    // Within reach: mount in the next quiet moment. Out of reach again: let it go.
    let quiet = 0;
    const s = state.current;
    const rest = () => {
      if (quiet) window.clearTimeout(quiet);
      quiet = 0;
      if (!s.soon || s.early) return;
      // How many screens away it is: the nearer film goes first.
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const away = Math.max(0, (r.top - vh) / vh);
      quiet = window.setTimeout(() => {
        quiet = 0;
        const go = () => {
          if (!s.soon || s.early) return;
          s.early = true;
          setEarly(true);
        };
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(go, { timeout: 1200 });
        else go();
      }, QUIET_MS + away * STAGGER_MS);
    };
    // A hand on the page (the configurator above a film is worked with the pointer) is not a quiet moment either.
    const busy = () => {
      if (s.soon && !s.early) rest();
    };
    window.addEventListener('pointermove', busy, { passive: true });
    window.addEventListener('pointerdown', busy, { passive: true });
    window.addEventListener('keydown', busy);
    const ioSoon = new IntersectionObserver(
      ([e]) => {
        s.soon = e.isIntersecting;
        if (s.soon) rest();
        else if (s.early) {
          s.early = false;
          setEarly(false);
        }
      },
      // Below the viewport only: a film the visitor has passed is let go as before.
      { rootMargin: `0px 0px ${reach * 100}% 0px` },
    );
    ioSoon.observe(el);
    const ioVisible = new IntersectionObserver(([e]) => {
      state.current.visible = e.isIntersecting;
      setVisible(e.isIntersecting);
      if (e.isIntersecting) measure();
    });
    ioNear.observe(el);
    ioVisible.observe(el);

    const onScroll = () => {
      if (state.current.visible) measure();
      // Still moving: the quiet moment starts over.
      if (s.soon && !s.early) rest();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();

    return () => {
      if (quiet) window.clearTimeout(quiet);
      window.removeEventListener('pointermove', busy);
      window.removeEventListener('pointerdown', busy);
      window.removeEventListener('keydown', busy);
      ioSoon.disconnect();
      ioNear.disconnect();
      ioVisible.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(state.current.raf);
      state.current.raf = 0;
    };
  }, [progress, kick, preLen, reach]);

  /*
   * A film that plays by itself. It starts when a visitor's own scroll (a
   * wheel, a finger, a key in the last moment: not a link's glide past, not
   * the scrollbar) brings the page down onto its pinned stage, and only if
   * its picture is up. The page is held where it stands: the stage is
   * pinned, so nothing jumps. It ends by its own clock, or when the hold
   * lets go for any reason of its own, whichever is first.
   */
  const startPlay = useCallback(() => {
    const pl = playing.current;
    if (!play || pl.on) return;
    pl.on = true;
    const ms = play.seconds * 1000;
    const end = () => {
      if (!pl.on) return;
      pl.on = false;
      pl.done = true;
      cancelAnimationFrame(pl.raf);
      const let_go = pl.release;
      pl.release = null;
      let_go?.();
      progress.target = progress.value = 1;
      progress.listeners.forEach((fn) => fn(1));
      progress.invalidate?.();
      setPlayed(true);
    };
    pl.release = holdPage(window.scrollY, ms + 1200, end);
    const t0 = performance.now();
    const step = (now: number) => {
      if (!pl.on) return;
      const t = Math.min(1, (now - t0) / ms);
      progress.target = progress.value = t;
      progress.listeners.forEach((fn) => fn(t));
      progress.invalidate?.();
      if (t < 1) pl.raf = requestAnimationFrame(step);
      else end();
    };
    pl.raf = requestAnimationFrame(step);
  }, [play, progress]);

  useEffect(() => {
    if (!play) return;
    const el = root.current;
    const pin = sticky.current;
    const pl = playing.current;
    if (!el || !pin) return;
    pl.lastY = window.scrollY;
    const input = () => {
      pl.input = performance.now();
    };
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > pl.lastY;
      pl.lastY = y;
      if (!down || pl.on || pl.done || !pl.ready || state.current.reduced || performance.now() - pl.input > 600) return;
      const r = el.getBoundingClientRect();
      // On the pinned stage, with travel left under it.
      if (r.top <= 0 && r.bottom - pin.offsetHeight > 8) startPlay();
    };
    window.addEventListener('wheel', input, { passive: true });
    window.addEventListener('touchmove', input, { passive: true });
    window.addEventListener('keydown', input);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', input);
      window.removeEventListener('touchmove', input);
      window.removeEventListener('keydown', input);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(pl.raf);
      pl.on = false;
      pl.release?.();
      pl.release = null;
    };
  }, [play, startPlay]);

  /** Again, from the top of its stage. */
  const replay = () => {
    const el = root.current;
    const pl = playing.current;
    if (!el || pl.on) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 2, behavior: 'instant' });
    pl.done = false;
    setPlayed(false);
    startPlay();
  };

  // A scene that unmounts when it is far away reports ready again when it comes back. One that stays mounted
  // (the hero) reports once, so its stage must not be hidden on the way out: it would never be shown again.
  useEffect(() => {
    if (!near && !early && !eager) {
      setReady(false);
      playing.current.ready = false;
    }
  }, [near, early, eager]);

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
    const pl = playing.current;
    pl.ready = true;
    // The picture was not up when the visitor scrolled onto a film that plays by itself: it starts now, if they are still on it.
    const el = root.current;
    const pin = sticky.current;
    if (play && el && pin && !pl.on && !pl.done && !state.current.reduced && performance.now() - pl.input < 1500) {
      const r = el.getBoundingClientRect();
      if (r.top <= 0 && r.bottom - pin.offsetHeight > 8) startPlay();
    }
    performance.mark?.(`vee:film-ready:${id}`);
    onReadyProp?.();
    window.dispatchEvent(new CustomEvent('vee:film-ready', { detail: id }));
  }, [onReadyProp, id, play, startPlay]);

  /* A step can switch the caption theme (a dark sky needs light text). */
  const stepTheme = steps[active].theme ?? theme;
  /* What stands under the header: an ink title card until it has opened, then the film. */
  const headerTheme = prelude?.tone === 'ink' && !risen ? 'dark' : stepTheme;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('vee:theme'));
  }, [headerTheme]);

  // The hero stays mounted (`eager`) so its opening assembly does not replay.
  const mount = hydrated && (eager || near || early);
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
        className={`film film--${variant} theme-${stepTheme}${reduced ? ' is-still' : ''}${prelude ? ` has-prelude has-prelude--${prelude.opening ?? 'window'}` : ''}${open ? ' is-open' : ''}`}
        data-theme={headerTheme}
        data-bare=""
        data-pre={preLen || undefined}
        data-chapter={chapter ?? id}
        data-step={steps[active].id}
        data-play={play ? (played ? 'done' : '') : undefined}
        aria-labelledby={`${id}-heading`}
        style={{ '--film-len': len, '--film-len-c': lenC } as CSSProperties}
      >
        <div className="film__sticky" ref={sticky}>
          {prelude && <div className={`film__backdrop film__backdrop--${prelude.opening === 'mist' ? 'studio' : (prelude.tone ?? 'paper')}`} aria-hidden="true" />}
          <div className={`film__stage${ready ? ' is-ready' : ''}`} aria-hidden="true">
            {mount && <Suspense fallback={null}>{scene}</Suspense>}
            <div className="film__labels">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className={`lbl lbl--${l.kind ?? 'call'}`}
                  data-label={l.id}
                  style={{ visibility: 'hidden' }}
                  ref={(el) => {
                    if (el) labelEls.current.set(l.id, el);
                    else labelEls.current.delete(l.id);
                  }}
                >
                  <span>
                    {l.sub && <small>{l.sub}</small>}
                    {l.text}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {prelude?.opening === 'mist' && (
            <div className="film__mist" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          )}

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
                  <p className="t-label film__kicker">
                    {s.kicker}
                    {s.badge && <span className="film__badge">{s.badge}</span>}
                  </p>
                  <StepTitle className="film__title" data-long={s.title.length > 48 ? '' : undefined}>
                    {stepTitles?.[s.id]
                      ? stepTitles[s.id]
                      : captions === 'words'
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

            {play && played && (
              <button type="button" className="link film__replay" onClick={replay}>
                Replay
              </button>
            )}

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
            <div className={`film__prelude film__prelude--${prelude.tone ?? 'paper'}${prelude.tone === 'ink' ? ' on-ink' : ''}`} ref={card}>
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
