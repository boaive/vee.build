import { cn } from '@/lib/utils';

/** The site's concrete mark and the name, with "Admin" in mono so it can never be mistaken for the public brand. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 leading-none', className)}>
      <img src="/admin/brand/veedo-mark.png" alt="" className="h-6 w-auto" />
      <span className="text-lg font-extrabold tracking-tight" style={{ fontStretch: '112%' }}>
        {compact ? 'veedo' : 'veedo.space'}
      </span>
      {!compact && <span className="data text-[0.625rem] uppercase tracking-[0.14em] text-signal-text">Admin</span>}
    </span>
  );
}
