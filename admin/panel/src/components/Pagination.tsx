import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Pagination({ page, pageSize, total, onPage, noun = 'items' }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; noun?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(total, page * pageSize);
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground" aria-label="Pages">
      <p>
        <span className="data">
          {first}–{last}
        </span>{' '}
        of <span className="data">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="data px-1">
          {page} / {pages}
        </span>
        <Button variant="ghost" size="icon" className="size-8" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
