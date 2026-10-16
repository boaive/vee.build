import { cn } from '@/lib/utils';

/** The wordmark as the site sets it, with "Admin" in mono so it can never be mistaken for the public brand. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2 leading-none', className)}>
      <span className="text-lg font-extrabold tracking-tight" style={{ fontStretch: '112%' }}>
        {compact ? 'V.B' : 'VEE.BUILD'}
      </span>
      {!compact && <span className="data text-[0.625rem] uppercase tracking-[0.14em] text-signal-text">Admin</span>}
    </span>
  );
}
