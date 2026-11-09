import { useEffect, useState } from 'react';
import { podLengthName, podLengths, podPickLabel, type PodLengthM } from '../../data/pod';
import { choosePod, podChoice } from '../../film/podChoice';
import { useCompact } from '../../film/useCompact';

/**
 * The pod's three lengths to choose from (developer, 2026-11-09: "we only
 * have one pod in there, other 2 will be options to live, on clicking that
 * the pod changes"): one pod stands, the other two lengths are a click
 * away, and the pod grows or shrinks by its middle panels (kit/pod.tsx).
 * Each button carries the pod's plan to its length. `where`: in a caption
 * (desktop), or at the foot of the picture on a compact layout, over the
 * steps' marks (`foot`: it marks itself as the band's foot, film/Film.tsx).
 * Each shows only on its own layout.
 */
export default function PodPick({ where = 'caption', className }: { where?: 'caption' | 'foot'; className?: string }) {
  const compact = useCompact();
  const [len, setLen] = useState<PodLengthM>(podChoice.length);
  useEffect(() => {
    const sync = () => setLen(podChoice.length);
    podChoice.listeners.add(sync);
    return () => {
      podChoice.listeners.delete(sync);
    };
  }, []);
  if (compact !== (where === 'foot')) return null;
  return (
    <div className={className ?? (where === 'foot' ? 'hero__pods' : 'pod-pick')} role="group" aria-label={podPickLabel} data-band={where === 'foot' ? 'foot' : undefined}>
      {podLengths.map((m) => {
        // The pod's plan to its length: a box with its corners cut.
        const w = m * 3.3;
        const x0 = (44 - w) / 2;
        const x1 = x0 + w;
        const c = 2.4;
        return (
          <button key={m} type="button" className="hero__pod" aria-pressed={len === m} onClick={() => choosePod(m)}>
            <svg viewBox="0 0 44 14" aria-hidden="true">
              <polygon points={`${x0 + c},1 ${x1 - c},1 ${x1},${1 + c} ${x1},${13 - c} ${x1 - c},13 ${x0 + c},13 ${x0},${13 - c} ${x0},${1 + c}`} />
            </svg>
            {podLengthName(m)}
          </button>
        );
      })}
    </div>
  );
}
