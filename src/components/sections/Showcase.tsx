import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMPACT_QUERY } from '../../film/device';
import type { FilmLabel } from '../../film/Film';
import { createProgress, type PlaceLabel } from '../../film/progress';
import type { ShowcaseKind } from '../../three/scenes/ShowcaseScene';
import { POD_FEET_LABELS } from './labels';

const Scene = lazy(() => import('../../three/scenes/ShowcaseScene'));
/** Phones and tablets held upright: the building alone on the polished floor (ShowcaseStudioScene). Only fetched there. */
const Studio = lazy(() => import('../../three/scenes/ShowcaseStudioScene'));
/** The capsule's three lengths (the brief's), one at a time on a compact layout. */
const FEET = [10, 16, 20] as const;

const LABELS: Record<ShowcaseKind, FilmLabel[]> = {
  house: [],
  capsule: POD_FEET_LABELS,
  workforce: [],
  institutional: [
    { id: 'panel-0', text: '36′ wall panel', kind: 'pulse' },
    { id: 'panel-1', text: '36′ wall panel', kind: 'pulse' },
  ],
};

interface Props {
  kind: ShowcaseKind;
  /** Accessible description of what the model shows. */
  description: string;
  note?: string;
}

/** One real-time maquette in a framed stage. Mounts near the viewport, renders on demand. */
export default function Showcase({ kind, description, note }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const labelEls = useRef(new Map<string, HTMLElement>());
  const progress = useMemo(() => {
    const p = createProgress();
    p.target = 0.5;
    return p;
  }, []);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [reduced, setReduced] = useState(false);
  /** Compact layouts: the capsule on show. */
  const [feet, setFeet] = useState<number>(20);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mqC = window.matchMedia(COMPACT_QUERY);
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const still = new URLSearchParams(window.location.search).has('still');
    const sync = () => {
      setCompact(mqC.matches);
      setReduced(still || mqR.matches);
    };
    sync();
    mqC.addEventListener('change', sync);
    mqR.addEventListener('change', sync);

    const ioNear = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '60% 0px' });
    const ioVisible = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    ioNear.observe(el);
    ioVisible.observe(el);

    /*
     * A finger drawn across the picture turns it (compact layouts; a touch
     * that moves up or down is the page's scroll: touch-action, sections.css).
     * It stays where it was left. A mouse turns it as it moves over it, as
     * before, and lets it go back when it leaves.
     */
    const drag = { id: -1, x: 0, from: 0.5 };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      drag.id = e.pointerId;
      drag.x = e.clientX;
      drag.from = progress.target;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (e.pointerId !== drag.id) return;
        progress.target = Math.min(1, Math.max(0, drag.from - ((e.clientX - drag.x) / r.width) * 1.3));
      } else progress.target = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      progress.invalidate?.();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === drag.id) drag.id = -1;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      progress.target = 0.5;
      progress.invalidate?.();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      mqC.removeEventListener('change', sync);
      mqR.removeEventListener('change', sync);
      ioNear.disconnect();
      ioVisible.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [progress]);

  useEffect(() => {
    if (!near) setReady(false);
  }, [near]);

  const place = useCallback<PlaceLabel>((id, x, y, opacity) => {
    const el = labelEls.current.get(id);
    if (!el) return;
    if (opacity <= 0.01) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className={`showcase showcase--${kind}${compact && kind === 'capsule' ? ' on-ink' : ''}${reduced ? ' is-still' : ''}`} ref={root} role={compact ? undefined : 'img'} aria-label={compact ? undefined : description}>
      {/* With controls under it (compact), the picture alone is the image. */}
      <div className={`showcase__stage${ready ? ' is-ready' : ''}`} role={compact ? 'img' : undefined} aria-label={compact ? description : undefined}>
        {near && (
          <Suspense fallback={null}>
            {compact ? (
              <Studio kind={kind} feet={feet} progress={progress} place={place} compact={compact} active={visible} reduced={reduced} onReady={onReady} />
            ) : (
              <Scene kind={kind} progress={progress} place={place} compact={compact} active={visible} reduced={reduced} onReady={onReady} />
            )}
          </Suspense>
        )}
        <div className="showcase__labels" aria-hidden="true">
          {LABELS[kind].map((l) => (
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
      {note && <p className="t-label showcase__note">{note}</p>}
      {compact && (
        <div className="showcase__foot">
          {kind === 'capsule' && (
            <div className="showcase__pick" role="group" aria-label="Capsule length">
              {FEET.map((f) => (
                <button key={f} type="button" className="showcase__len" aria-pressed={feet === f} onClick={() => setFeet(f)}>
                  <svg viewBox="0 0 44 14" aria-hidden="true">
                    <rect x={(44 - f * 2) / 2 + 0.75} y="0.75" width={f * 2 - 1.5} height="12.5" rx="4" />
                  </svg>
                  {f}′
                </button>
              ))}
            </div>
          )}
          <p className="t-label showcase__hint" aria-hidden="true">
            Drag to turn
          </p>
        </div>
      )}
    </div>
  );
}
