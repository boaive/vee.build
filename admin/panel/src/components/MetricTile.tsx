import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function MetricTile({ label, value, hint, loading, tone, to }: { label: string; value?: string | number; hint?: string; loading?: boolean; tone?: 'alert'; to?: string }) {
  const card = (
    <Card className={cn('min-w-0 gap-1 rounded-lg px-4 py-3.5 shadow-none', to && 'h-full transition-colors hover:border-border-strong')}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-20" />
      ) : (
        <p className={cn('data font-medium leading-tight', String(value).length > 9 ? 'text-lg sm:text-xl' : 'text-2xl', tone === 'alert' && value !== 0 && 'text-danger')}>{value}</p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return to ? (
    <Link to={to} className="rounded-lg" aria-label={`${label}: ${value ?? "loading"}. Open`}>
      {card}
    </Link>
  ) : (
    card
  );
}
