import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { isApiError } from '@/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon = Inbox, title, children, className }: { icon?: LucideIcon; title: string; children?: ReactNode; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const retryable = isApiError(error) ? error.retryable : true;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <AlertTriangle className="size-6 text-danger" aria-hidden />
      <p className="font-medium">This could not be loaded</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && retryable && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 p-4', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * One pattern for every query-backed block: loading skeleton, error with
 * retry, empty state, then the data. A background refetch keeps the data on
 * screen rather than flashing a skeleton.
 */
export function QueryBoundary<T>({
  query,
  isEmpty,
  empty,
  loading,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  loading?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const data = query.data;
  if (data === undefined) {
    if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
    return <>{loading ?? <LoadingRows />}</>;
  }
  if (isEmpty?.(data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(data)}</>;
}
