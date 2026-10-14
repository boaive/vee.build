import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FilmLabel } from '../../film/Film';
import { createProgress, type PlaceLabel } from '../../film/progress';
import type { ShowcaseKind } from '../../three/scenes/ShowcaseScene';
import { POD_FEET_LABELS } from './labels';

const Scene = lazy(() => import('../../three/scenes/ShowcaseScene'));

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

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mqC = window.matchMedia('(max-width: 860px)');
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

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      progress.target = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      progress.invalidate?.();
    };
    const onLeave = () => {
      progress.target = 0.5;
      progress.invalidate?.();
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      mqC.removeEventListener('change', sync);
      mqR.removeEventListener('change', sync);
      ioNear.disconnect();
      ioVisible.disconnect();
      el.removeEventListener('pointermove', onMove);
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
    <div className={`showcase${reduced ? ' is-still' : ''}`} ref={root} role="img" aria-label={description}>
      <div className={`showcase__stage${ready ? ' is-ready' : ''}`}>
        {near && (
          <Suspense fallback={null}>
            <Scene kind={kind} progress={progress} place={place} compact={compact} active={visible} reduced={reduced} onReady={onReady} />
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
    </div>
  );
}
