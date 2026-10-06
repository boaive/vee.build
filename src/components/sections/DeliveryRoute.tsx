import { useEffect, useRef, useState } from 'react';

/**
 * Section 6, part 2: the journey to site as a single "loading" visual. It
 * plays once when it comes into view (time-based, not scroll-driven): the
 * truck drives the length of the road while the road fills behind it.
 * No distances or times are stated; none were supplied.
 */

const STAGES = [
  { at: 0, text: 'Loaded at the yard' },
  { at: 0.08, text: 'Leaving the yard' },
  { at: 0.34, text: 'On the road' },
  { at: 0.72, text: 'Approaching your site' },
  { at: 0.985, text: 'Arrived on site' },
];
const SECONDS = 7.5;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Truck() {
  return (
    <svg className="route__truck-svg" viewBox="0 0 220 84" aria-hidden="true">
      {/* the shell on the trailer */}
      <rect className="rt-shell" x="40" y="10" width="118" height="44" rx="2" />
      <rect className="rt-fascia" x="38" y="8" width="122" height="7" rx="1.5" />
      <rect className="rt-glass" x="52" y="24" width="24" height="18" />
      <rect className="rt-glass" x="92" y="22" width="12" height="28" />
      <rect className="rt-door" x="106" y="22" width="14" height="28" />
      <rect className="rt-glass" x="122" y="22" width="5" height="28" />
      {/* trailer and cab */}
      <rect className="rt-deck" x="30" y="54" width="140" height="6" />
      <path className="rt-cab" d="M172 26 h22 q10 0 14 10 l6 14 v14 h-42 z" />
      <path className="rt-window" d="M190 30 h4 q6 0 9 7 l4 10 h-17 z" />
      <rect className="rt-deck" x="166" y="56" width="50" height="8" />
      {[52, 72, 136, 156, 196].map((cx) => (
        <g key={cx} className="rt-wheel" style={{ transformOrigin: `${cx}px 68px` }}>
          <circle cx={cx} cy="68" r="10" />
          <circle className="rt-hub" cx={cx} cy="68" r="3.5" />
          <rect className="rt-spoke" x={cx - 1} y="59" width="2" height="7" />
        </g>
      ))}
    </svg>
  );
}

export default function DeliveryRoute() {
  const root = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [stage, setStage] = useState(0);
  const [state, setState] = useState<'idle' | 'moving' | 'done'>('idle');

  const paint = (t: number) => {
    root.current?.style.setProperty('--t', t.toFixed(4));
    let s = 0;
    for (let i = 0; i < STAGES.length; i++) if (t >= STAGES[i].at) s = i;
    setStage((prev) => (prev === s ? prev : s));
  };

  const play = () => {
    cancelAnimationFrame(raf.current);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(window.location.search).has('still');
    if (reduced) {
      paint(1);
      setState('done');
      return;
    }
    setState('moving');
    const start = performance.now();
    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / (SECONDS * 1000));
      paint(ease(raw));
      if (raw < 1) raf.current = requestAnimationFrame(step);
      else setState('done');
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    paint(0);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`route is-${state}`} ref={root}>
      <div className="route__scene" aria-hidden="true">
        <svg className="route__far" viewBox="0 0 2400 200" preserveAspectRatio="none">
          <path d="M0 200 V120 C180 80 320 96 480 110 S820 60 1000 86 S1360 128 1560 92 S1960 54 2160 96 S2340 120 2400 104 V200 Z" />
        </svg>
        <svg className="route__near" viewBox="0 0 2400 200" preserveAspectRatio="none">
          <path d="M0 200 V150 C220 120 420 140 640 146 S1000 112 1240 132 S1640 160 1880 138 S2260 124 2400 140 V200 Z" />
          {Array.from({ length: 22 }, (_, i) => (
            <g key={i} transform={`translate(${60 + i * 110} ${138 + (i % 3) * 5})`}>
              <rect x="-1" y="-6" width="2" height="14" />
              <ellipse cx="0" cy="-12" rx={i % 2 ? 7 : 5} ry={i % 2 ? 9 : 13} />
            </g>
          ))}
        </svg>
      </div>

      <div className="route__road">
        <div className="route__track" />
        <div className="route__fill" />
        <span className="route__end route__end--from">
          <b>VEE.BUILD</b> yard
        </span>
        <span className="route__end route__end--to">Your site</span>
        <div className="route__truck">
          <Truck />
        </div>
      </div>

      <div className="route__foot">
        <ol className="route__stages">
          {STAGES.map((s, i) => (
            <li key={s.text} className={i <= stage ? 'is-on' : ''}>
              {s.text}
            </li>
          ))}
        </ol>
        <p className="route__status" role="status" aria-live="polite">
          {STAGES[stage].text}
        </p>
        <button type="button" className="link route__replay" onClick={play} disabled={state === 'moving'}>
          Replay
        </button>
      </div>
    </div>
  );
}
