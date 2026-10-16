import { formatInr } from '@/lib/format';
import { cn } from '@/lib/utils';

/** "▲ ₹450 · +10.0%": the change from the published value, in the accent only as a measurement. */
export function ChangeTag({ from, to, factor }: { from: number; to: number; factor?: boolean }) {
  const abs = to - from;
  if (abs === 0) return null;
  const pct = from === 0 ? null : (abs / from) * 100;
  const up = abs > 0;
  return (
    <span className={cn('data whitespace-nowrap', up ? 'text-signal-text' : 'text-info')}>
      {up ? '▲' : '▼'} {factor ? Math.abs(abs).toFixed(2) : formatInr(Math.abs(abs))}
      {pct !== null && ` · ${up ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}
