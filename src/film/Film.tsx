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
import { COMPACT_QUERY, SIDEWAYS_QUERY } from './device';
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
  /** The same on a compact layout (film/device.ts), where it differs. */
  lengthCompact?: number;
  content: ReactNode;
  tone?: 'paper' | 'ink';
  /** The tone on a compact layout, where it differs (a film in a card stands on paper there). */
  toneCompact?: 'paper' | 'ink';
  opening?: 'window' | 'mist';
}

/**
 * Compact layouts only (film/device.ts): the film's steps as cards to
 * choose from, under the picture, instead of a long scroll (the mobile and
 * tablet round, 2026-10-14: "scroll horizontal to view those three, and
 * vertical to move hero sections"; "in mobile who wants to view such a
 * long process?? ... use card options"). A card or an arrow chooses a step;
 * the page's own scroll moves on past the film. Desktop never has them: the
 * film is scrolled through as it was.
 *
 * Since 2026-10-15 (the developer's two factory screens, "the choice is
 * yours"; film.css) such a film is laid out as a page of its own: its words
 * on the page's paper, the picture in a card under them (the canvas is the
 * card), its reel, the count and the controls, then the cards. It plays its
 * steps by itself, one after another, like a video ("it is more like a 3d
 * video"; the reel, below). Nothing is laid over the picture.
 */
export interface Pick {
  /** What the group of cards is, read out. */
  label: string;
  /** One card a step: its picture (a file in public/), a small line and its name. */
  cards: { src?: string; code?: string; name: string }[];
  /**
   * How long the scene's progress takes from one step's pose to the
   * chosen one's, in seconds, as a time-lapse of what lies between; 0: at
   * once, for a scene that moves itself from step to step.
   */
  seconds: number;
}

interface FilmProps {
  id: string;
  index: string;
  heading: string;
  headingTag?: 'h1' | 'h2';
  stepTag?: 'h2' | 'h3' | 'p';
  variant?: string;
  theme?: 'light' | 'dark';
  /** The theme on a compact layout, for every step, where it differs (a film in a card: its words are on paper). */
  themeCompact?: 'light' | 'dark';
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
   * 2026-10-10, for the truck's drive: "a short loading animation"). Once
   * its stage stands in the window it runs from 0 to 1 in `seconds`, once,
   * like a video. Since 2026-10-15 it never holds the page (developer: "it
   * should be automatic video not scrollable type. and the video can be
   * skipped by scrolling", on desktop too, where the hold of 2026-10-10 had
   * made it "a mandatory view"): scrolling on simply leaves it. Before it
   * starts it shows its first frame; once played, its last, with Replay.
   * With reduced motion it never plays, and shows its step's settled pose.
   */
  play?: { seconds: number };
  /** Compact layouts: the steps as cards (Pick). */
  pick?: Pick;
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
  themeCompact,
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
  pick,
}: FilmProps) {
  const root = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const labelEls = useRef(new Map<string, HTMLElement>());
  const progress = useMemo(() => {
    const p = createProgress();
    p.pre = prelude ? 0 : 1;
    return p;
  }, [prelude]);

  const [active, setActive] = useState(0);
  /** Compact layouts with cards (`pick`): the step chosen. */
  const [picked, setPicked] = useState(0);
  const pickOn = useRef(false);
  const pickRaf = useRef(0);
  const pickedRef = useRef(0);
  pickedRef.current = picked;
  /** A film that plays by itself: the scroll does not move it, on any layout (2026-10-15). */
  const playOn = useRef(!!play);
  const cards = useRef<HTMLOListElement>(null);
  /** The labels' layer, and its width (canvas pixels: what a label's x is measured in). */
  const labelsBox = useRef<HTMLDivElement>(null);
  const labelsW = useRef(0);
  /** Compact layouts: the call-outs standing at an edge of the picture, so that two on one side keep apart (`place`). */
  const edges = useRef(new Map<string, { left: boolean; y: number; h: number }>());
  const heights = useRef(new WeakMap<HTMLElement, number>());
  /** A film whose call-outs are boxes: its dimensions go to the edges with them (elsewhere a dimension stays on its point, as the capsule's length does). */
  const edgeDims = useRef(false);
  edgeDims.current = labels.some((l) => l.kind === 'box');
  const [near, setNear] = useState(false);
  /** Mounted ahead of time: within reach, and the page has stood still. */
  const [early, setEarly] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const [reduced, setReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  /** The title card has opened all the way: it and its clip are taken off the stage. */
  const [open, setOpen] = useState(false);
  /** The picture has taken more of the screen than the card: the header reads against the picture from here. */
  const [risen, setRisen] = useState(false);
  /** A film that plays by itself is playing, or has played. */
  const [playState, setPlayState] = useState<'' | 'on' | 'done'>('');
  const played = playState === 'done';
  const playing = useRef({ on: false, done: false, raf: 0, ready: false });

  const state = useRef({ raf: 0, last: 0, active: 0, reduced: false, visible: false, pre: '', open: false, risen: false, seen: false, soon: false, early: false });
  const preLen = (compact ? prelude?.lengthCompact : undefined) ?? prelude?.length ?? 0;
  const preLenC = prelude?.lengthCompact ?? prelude?.length ?? 0;
  const tone = (compact ? prelude?.toneCompact : undefined) ?? prelude?.tone ?? 'paper';
  /** Compact layouts with cards (`pick`): the steps are chosen, and the film is laid out with its picture in a card. */
  const picking = compact && !!pick;

  /* Environment queries */
  useEffect(() => {
    setHydrated(true);
    const mqCompact = window.matchMedia(COMPACT_QUERY);
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // `?still` shows every film in its settled poses (QA and screenshots).
    const still = new URLSearchParams(window.location.search).has('still');
    const sync = () => {
      compactRef.current = mqCompact.matches;
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

  /*
   * Compact layouts (film/device.ts): the building is framed in the part of
   * the stage that the words and the controls leave free (Stage, `band`).
   * The words stand at the top, or at the left on a phone held sideways;
   * the controls at the foot. Whatever marks itself [data-band] counts:
   * "words" or "foot". The captions are stacked in one place, so the band
   * is the tallest of them and the picture does not move when the caption
   * changes. On desktop nothing here runs and the band stays null.
   */
  useEffect(() => {
    const pin = sticky.current;
    if (!compact || !pin) {
      if (progress.band) {
        progress.band = null;
        progress.invalidate?.();
      }
      return;
    }
    const mqSide = window.matchMedia(SIDEWAYS_QUERY);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const measure = () => {
      const box = pin.getBoundingClientRect();
      const W = box.width || 1;
      const H = box.height || 1;
      const side = mqSide.matches;
      const gap = 0.9 * rem;
      let l = 0;
      let t = 0;
      let r = W;
      let b = H;
      pin.querySelectorAll<HTMLElement>('[data-band]').forEach((el) => {
        // Counted whether or not it is showing at the moment (a caption's extras, the counter): the band does not move with the step.
        const rr = el.getBoundingClientRect();
        if (!rr.width || !rr.height) return;
        if (el.dataset.band === 'words') {
          if (side) l = Math.max(l, rr.right - box.left + gap);
          else t = Math.max(t, rr.bottom - box.top + gap);
        } else if (!side || rr.right - box.left > l) b = Math.min(b, rr.top - box.top - gap);
      });
      // However much the words take, the building keeps at least two fifths of the screen.
      if (side) l = Math.min(l, W * 0.55);
      // A film with cards sets its words in a set height (film.css): its frame is never put over them.
      else if (!picking) t = Math.min(t, H * 0.58, b - H * 0.32);
      /*
       * A film with cards: the picture is a card in that room (film.css,
       * --card-*), and the canvas is the card, so the whole canvas is the
       * band. Held sideways the card stands to the right of the words.
       */
      let band: [number, number, number, number] = [l / W, t / H, r / W, Math.max(t + 1, b) / H];
      if (picking) {
        const px = (v: number) => `${Math.round(v)}px`;
        pin.style.setProperty('--card-t', px(side ? Math.min(t, H * 0.2) : t));
        pin.style.setProperty('--card-b', px(H - Math.max(t + 1, b)));
        pin.style.setProperty('--card-l', side ? px(l) : '');
        band = [0, 0, 1, 1];
      }
      const was = progress.band;
      if (was && band.every((v, k) => Math.abs(v - was[k]) < 0.002)) return;
      progress.band = band;
      progress.invalidate?.();
    };
    measure();
    const ro = new ResizeObserver(measure);
    const watch = () => {
      ro.disconnect();
      ro.observe(pin);
      pin.querySelectorAll<HTMLElement>('[data-band]').forEach((el) => ro.observe(el));
      measure();
    };
    watch();
    // A control that mounts after the film (a section's own, shown only on compact layouts) is counted when it comes.
    const hud = pin.querySelector('.film__hud');
    const mo = new MutationObserver(watch);
    if (hud) mo.observe(hud, { childList: true });
    mqSide.addEventListener('change', measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      mo.disconnect();
      mqSide.removeEventListener('change', measure);
    };
  }, [compact, picking, progress, steps]);

  /* The labels' layer's width, kept without reading the layout in the middle of a frame. */
  useEffect(() => {
    const el = labelsBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      labelsW.current = el.clientWidth;
    });
    ro.observe(el);
    labelsW.current = el.clientWidth;
    edges.current.clear();
    return () => ro.disconnect();
  }, [compact]);

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
      if (!playOn.current && !pickOn.current) progress.target = travel > 0 ? clamp01((-r.top - prePx) / travel) : 0;
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
   * A film that plays by itself, like a video: it starts once its stage
   * stands in the window (however it got there) and its picture is up, and
   * runs on its own clock to the end. The page is never held: a visitor who
   * scrolls on leaves it, and it is done by the time they come back.
   */
  const startPlay = useCallback(() => {
    const pl = playing.current;
    if (!play || !playOn.current || pl.on) return;
    pl.on = true;
    setPlayState('on');
    const ms = play.seconds * 1000;
    const put = (t: number) => {
      progress.target = progress.value = t;
      progress.listeners.forEach((fn) => fn(t));
      progress.invalidate?.();
    };
    const t0 = performance.now();
    const step = (now: number) => {
      if (!pl.on) return;
      const t = Math.min(1, (now - t0) / ms);
      put(t);
      if (t < 1) pl.raf = requestAnimationFrame(step);
      else {
        pl.on = false;
        pl.done = true;
        setPlayState('done');
      }
    };
    pl.raf = requestAnimationFrame(step);
  }, [play, progress]);

  /** Its stage stands in the window: at the top, or all but its first tenth. */
  const inPlace = useCallback(() => {
    const el = root.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    return r.top <= vh * 0.1 && r.bottom >= vh * 0.6;
  }, []);

  useEffect(() => {
    playOn.current = !!play;
    if (!play) return;
    const pl = playing.current;
    const onScroll = () => {
      if (!pl.on && !pl.done && pl.ready && !state.current.reduced && inPlace()) startPlay();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(pl.raf);
      pl.on = false;
    };
  }, [play, startPlay, inPlace]);

  /** Again, from the top of its stage. */
  const replay = () => {
    const el = root.current;
    const pl = playing.current;
    if (!el || pl.on) return;
    if (!inPlace()) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 2, behavior: 'instant' });
    pl.done = false;
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
      edges.current.delete(labelId);
      return;
    }
    el.style.visibility = 'visible';
    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    /*
     * Compact layouts: a call-out box, and a dimension, stands at the edge of
     * the picture on its point's side, its tick running in to the point, so
     * that the building is not under it (developer, 2026-10-14: "the green
     * thing makes the house not visible"; film.css). Two on one side keep
     * apart, in the order their points stand down the picture, each a little
     * below the one over it, the tick running at a slant where it has had
     * to move (2026-10-15: "600 mm above the ground and plug footing
     * overlaps"). Desktop: as it was.
     */
    if (compactRef.current && (el.classList.contains('lbl--box') || (edgeDims.current && el.classList.contains('lbl--dim')))) {
      const w = labelsW.current || window.innerWidth;
      const g = Math.min(48, Math.max(10, 0.03 * w));
      const left = x < w / 2;
      if (el.classList.contains('is-left') !== left || !el.classList.contains(left ? 'is-left' : 'is-right')) {
        el.classList.toggle('is-left', left);
        el.classList.toggle('is-right', !left);
      }
      let h = heights.current.get(el);
      if (!h) {
        h = (el.firstElementChild as HTMLElement | null)?.offsetHeight || 24;
        heights.current.set(el, h);
      }
      const all = edges.current;
      const mine = { left, y, h };
      all.set(labelId, mine);
      let below = -Infinity;
      let at = y;
      for (const e of [...all.values()].filter((v) => v.left === left).sort((a, b) => a.y - b.y)) {
        const c = Math.max(e.y, below + e.h / 2);
        if (e === mine) at = c;
        below = c + e.h / 2 + 6;
      }
      const edge = left ? g - x : w - g - x;
      const dy = at - y;
      el.style.setProperty('--edge', `${edge.toFixed(1)}px`);
      el.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      el.style.setProperty('--tl', `${Math.hypot(edge, dy).toFixed(1)}px`);
      el.style.setProperty('--ta', `${Math.atan2(dy, edge).toFixed(4)}rad`);
    }
  }, []);

  /*
   * Cards (compact layouts, `pick`): the step is chosen, the caption changes
   * at once, and the scene's progress goes to that step's pose, at once or
   * as a short time-lapse. The scroll no longer moves it.
   */
  useEffect(() => {
    pickOn.current = picking;
    progress.pick = picking;
    if (picking) progress.target = progress.value = steps[pickedRef.current]?.pose ?? 0;
    progress.listeners.forEach((fn) => fn(progress.value));
    progress.invalidate?.();
    // The step itself is set by `choose`: this follows the mode only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, progress]);
  /*
   * A film with cards plays its steps one after another by itself, like a
   * video (2026-10-15: "it is more like a 3d video"): the time-lapse to a
   * step, a hold long enough to read its words, then the next. The reel
   * under the picture fills as it goes. It plays while its picture is on
   * the screen and the visitor has not paused it, and stops at the last
   * step; a card, an arrow or a mark of the reel chooses a step, and it
   * plays on from there. With reduced motion it never plays.
   */
  const reelEl = useRef<HTMLDivElement>(null);
  const reel = useRef({ raf: 0, last: 0, elapsed: 0, inView: false, paused: false, ended: false, ready: false });
  const [reelState, setReelState] = useState<'play' | 'pause' | 'end'>('play');
  reel.current.ready = ready;

  const choose = useCallback(
    (to: number) => {
      const i = Math.max(0, Math.min(steps.length - 1, to));
      setPicked(i);
      pickedRef.current = i;
      reel.current.elapsed = 0;
      cancelAnimationFrame(pickRaf.current);
      const from = progress.value;
      const goal = steps[i].pose;
      const ms = state.current.reduced ? 0 : (pick?.seconds ?? 0) * 1000;
      const put = (v: number) => {
        progress.target = progress.value = v;
        progress.listeners.forEach((fn) => fn(v));
        progress.invalidate?.();
      };
      if (ms <= 0 || Math.abs(goal - from) < 1e-4) {
        put(goal);
        return;
      }
      const t0 = performance.now();
      const run = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        put(from + (goal - from) * (t * t * (3 - 2 * t)));
        if (t < 1) pickRaf.current = requestAnimationFrame(run);
      };
      pickRaf.current = requestAnimationFrame(run);
    },
    [steps, progress, pick],
  );
  useEffect(() => () => cancelAnimationFrame(pickRaf.current), []);
  // The chosen card is brought into view in its row.
  useEffect(() => {
    if (!picking) return;
    const row = cards.current;
    const el = row?.children[picked] as HTMLElement | undefined;
    if (el && row) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: state.current.reduced ? 'auto' : 'smooth' });
  }, [picked, picking]);

  /** How long a step stands once it has come in: long enough to read its words. */
  const holdOf = useCallback((i: number) => Math.min(7, Math.max(3.4, (steps[i]?.body?.split(/\s+/).length ?? 0) * 0.2)) * 1000, [steps]);
  const runReel = useCallback(() => {
    const r = reel.current;
    if (r.raf) return;
    r.last = performance.now();
    const tick = (now: number) => {
      r.raf = 0;
      const go = r.inView && !r.paused && !r.ended && r.ready && progress.pre >= 0.999 && !state.current.reduced;
      if (!go) return;
      r.elapsed += Math.min(100, now - r.last);
      r.last = now;
      const i = pickedRef.current;
      const total = (pick?.seconds ?? 0) * 1000 + holdOf(i);
      const f = Math.min(1, r.elapsed / total);
      reelEl.current?.style.setProperty('--seg', f.toFixed(4));
      if (f >= 1) {
        if (i < steps.length - 1) {
          choose(i + 1);
          reelEl.current?.style.setProperty('--seg', '0');
        }
        else {
          r.ended = true;
          setReelState('end');
          return;
        }
      }
      r.raf = requestAnimationFrame(tick);
    };
    r.raf = requestAnimationFrame(tick);
  }, [choose, holdOf, pick, progress, steps.length]);
  // On the screen (most of the picture), or not; and the title card before it opened.
  useEffect(() => {
    const card = stageRef.current;
    const r = reel.current;
    if (!picking || !card) return;
    const io = new IntersectionObserver(
      ([e]) => {
        r.inView = e.intersectionRatio >= 0.6;
        if (r.inView) runReel();
      },
      { threshold: [0, 0.3, 0.6, 0.9, 1] },
    );
    io.observe(card);
    const again = () => r.inView && runReel();
    window.addEventListener('scroll', again, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', again);
      cancelAnimationFrame(r.raf);
      r.raf = 0;
    };
  }, [picking, runReel]);
  useEffect(() => {
    if (ready) runReel();
  }, [ready, runReel]);
  /** The visitor's own choice of a step: the reel plays on from it (unless they paused it). */
  const pickStep = (i: number) => {
    const r = reel.current;
    if (r.ended) {
      r.ended = false;
      setReelState(r.paused ? 'pause' : 'play');
    }
    choose(i);
    reelEl.current?.style.setProperty('--seg', '0');
    runReel();
  };
  const toggleReel = () => {
    const r = reel.current;
    if (r.ended) {
      r.ended = false;
      r.paused = false;
      setReelState('play');
      pickStep(0);
      return;
    }
    r.paused = !r.paused;
    setReelState(r.paused ? 'pause' : 'play');
    if (!r.paused) runReel();
  };

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
    // The picture was not up when the visitor reached a film that plays by itself: it starts now, if they are still on it.
    if (playOn.current && !pl.on && !pl.done && !state.current.reduced && inPlace()) startPlay();
    performance.mark?.(`vee:film-ready:${id}`);
    onReadyProp?.();
    window.dispatchEvent(new CustomEvent('vee:film-ready', { detail: id }));
  }, [onReadyProp, id, startPlay, inPlace]);

  /* A step can switch the caption theme (a dark sky needs light text). */
  /** The step on show: chosen with the cards, or where the scroll is. */
  const shown = picking ? picked : active;
  const stepTheme = (compact ? themeCompact : undefined) ?? steps[shown].theme ?? theme;
  /* What stands under the header: an ink title card until it has opened, then the film. */
  const headerTheme = prelude && tone === 'ink' && !risen ? 'dark' : stepTheme;
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
  const lenC = (lengthCompact ?? length) + preLenC;

  return (
    <FilmContext.Provider value={progress}>
      <section
        id={id}
        ref={root}
        className={`film film--${variant} theme-${stepTheme}${reduced ? ' is-still' : ''}${prelude ? ` has-prelude has-prelude--${prelude.opening ?? 'window'}` : ''}${open ? ' is-open' : ''}${picking ? ' is-picking' : ''}`}
        data-theme={headerTheme}
        data-bare=""
        data-pre={preLen || undefined}
        data-chapter={chapter ?? id}
        data-step={steps[shown].id}
        data-play={play ? playState : undefined}
        aria-labelledby={`${id}-heading`}
        style={{ '--film-len': len, '--film-len-c': lenC } as CSSProperties}
      >
        <div className="film__sticky" ref={sticky}>
          {prelude && <div className={`film__backdrop film__backdrop--${prelude.opening === 'mist' ? 'studio' : tone}`} aria-hidden="true" />}
          <div className={`film__stage${ready ? ' is-ready' : ''}`} aria-hidden="true" ref={stageRef}>
            {mount && <Suspense fallback={null}>{scene}</Suspense>}
            <div className="film__labels" ref={labelsBox}>
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
            <header className="film__head" data-band="words">
              <span className="film__index">{index}</span>
              <Heading id={`${id}-heading`} className="film__heading">
                {heading}
              </Heading>
            </header>

            <ol className="film__steps" data-captions={captions} data-band="words">
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  className={`film__step${i === shown ? ' is-active' : i < shown ? ' is-past' : ''}`}
                  aria-current={i === shown ? 'step' : undefined}
                  aria-hidden={i === shown ? undefined : true}
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
                    <a className="link film__link" href={s.link.href} tabIndex={i === shown ? 0 : -1}>
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
            {/* While it plays: it is a video, and the page is the visitor's (2026-10-15). */}
            {play && playState === 'on' && (
              <p className="film__skip" aria-hidden="true">
                Scroll to skip
              </p>
            )}

            <div className="film__ticks" role="group" aria-label={`${heading}: steps`} data-band="foot">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`film__tick${i === shown ? ' is-active' : ''}`}
                  aria-label={`Step ${i + 1} of ${steps.length}: ${s.title}`}
                  aria-current={i === shown ? 'step' : undefined}
                  onClick={() => (picking ? pickStep(i) : goTo(i))}
                />
              ))}
            </div>

            {/* Compact layouts: where the film is, as the references number it ("2 / 4"), beside the step marks (film.css). */}
            {steps.length > 1 && (
              <p className="film__count" aria-hidden="true">
                <b>{shown + 1}</b> / {steps.length}
              </p>
            )}

            {/* Compact layouts: the steps as cards (Pick), with arrows. */}
            {picking && pick && (
              <div className="film__pick" data-band="foot">
                {/* The reel: one mark a step, the one playing filling as it goes (like a video's). */}
                <div className="film__reel" ref={reelEl} role="group" aria-label={`${pick.label}: steps`}>
                  {steps.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`film__seg${i < shown ? ' is-past' : i === shown ? ' is-on' : ''}`}
                      aria-label={`Step ${i + 1} of ${steps.length}: ${s.title}`}
                      aria-current={i === shown ? 'step' : undefined}
                      onClick={() => pickStep(i)}
                    >
                      <i />
                    </button>
                  ))}
                </div>
                <div className="film__pick-bar">
                  <p className="t-label film__pick-count" aria-hidden="true">
                    <b>{String(shown + 1).padStart(2, '0')}</b> / {String(steps.length).padStart(2, '0')}
                  </p>
                  <button type="button" className={`film__arrow film__arrow--${reelState}`} aria-label={reelState === 'play' ? 'Pause' : reelState === 'pause' ? 'Play' : 'Play again'} onClick={toggleReel}>
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      {reelState === 'play' ? (
                        <path d="M7 5v10M13 5v10" />
                      ) : reelState === 'pause' ? (
                        <path d="M7.5 5.2v9.6l7.4-4.8z" />
                      ) : (
                        <path d="M15.4 10a5.4 5.4 0 1 1-1.6-3.8M14.6 3.6v3.2h-3.2" />
                      )}
                    </svg>
                  </button>
                  <button type="button" className="film__arrow film__arrow--prev" aria-label="Previous" disabled={shown === 0} onClick={() => pickStep(shown - 1)} />
                  <button type="button" className="film__arrow film__arrow--next" aria-label="Next" disabled={shown === steps.length - 1} onClick={() => pickStep(shown + 1)} />
                </div>
                <ol className="film__cards" ref={cards} aria-label={pick.label}>
                  {pick.cards.map((c, i) => (
                    <li key={i}>
                      <button type="button" className={`film__card${i === shown ? ' is-on' : ''}`} aria-pressed={i === shown} onClick={() => pickStep(i)}>
                        {c.src && <img src={c.src} alt="" width={240} height={150} loading="lazy" decoding="async" />}
                        <span className="film__card-text">
                          {c.code && <small>{c.code}</small>}
                          <span className="film__card-name">{c.name}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {prelude && (
            <div className={`film__prelude film__prelude--${tone}${tone === 'ink' ? ' on-ink' : ''}`} ref={card}>
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
