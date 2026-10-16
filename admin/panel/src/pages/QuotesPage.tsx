import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, type QuoteStatus } from '@shared';
import { FileText, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuotes } from '@/api/hooks';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { EmptyState, QueryBoundary } from '@/components/states/States';
import { QuoteBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate, formatInr } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function QuotesPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const status = QUOTE_STATUSES.includes(raw as QuoteStatus) ? (raw as QuoteStatus) : undefined;
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [text, setText] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() === q) return;
      const next = new URLSearchParams(params);
      if (text.trim()) next.set('q', text.trim());
      else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [text, q, params, setParams]);

  const list = useQuotes({ status, q: q || undefined, page });

  const setTab = (s?: QuoteStatus) => {
    const next = new URLSearchParams(params);
    if (s) next.set('status', s);
    else next.delete('status');
    next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Quotes"
        description="Priced from the published price list. Print one or save it as a PDF to send it."
        actions={
          <Button asChild>
            <Link to="/quotes/new">
              <Plus className="size-4" /> New quote
            </Link>
          </Button>
        }
      />

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Show">
          <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
            {[undefined, ...QUOTE_STATUSES].map((s) => (
              <button
                key={s ?? 'all'}
                role="tab"
                aria-selected={status === s}
                onClick={() => setTab(s)}
                className={cn('rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground', status === s && 'bg-background text-foreground shadow-sm')}
              >
                {s ? QUOTE_STATUS_LABELS[s] : 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search number, title, customer" className="pl-8" aria-label="Search quotes" />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <QueryBoundary
          query={list}
          isEmpty={(d) => d.items.length === 0}
          empty={
            <EmptyState icon={FileText} title={q || status ? 'No quotes match' : 'No quotes yet'}>
              {q || status ? 'Try another tab or fewer words.' : 'Open an enquiry and choose “Make a quote”, or start one here.'}
            </EmptyState>
          }
        >
          {(d) => (
            <>
              <ul className="divide-y divide-border">
                {d.items.map((x) => (
                  <li key={x.id}>
                    <Link to={`/quotes/${x.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-accent sm:grid-cols-[7.5rem_minmax(0,1fr)_7rem_8rem_6rem]">
                      <span className="data text-sm">{x.number}</span>
                      <span className="data text-right text-sm sm:hidden">{formatInr(x.total)}</span>
                      <span className="col-span-full min-w-0 sm:col-span-1">
                        <span className="block truncate font-medium">{x.customerName || '—'}</span>
                        <span className="block truncate text-xs text-muted-foreground">{x.title}</span>
                      </span>
                      <QuoteBadge status={x.status} />
                      <span className="data hidden text-right text-sm sm:block">{formatInr(x.total)}</span>
                      <span className="data text-right text-xs text-muted-foreground sm:text-left">until {formatDate(x.validUntil)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination
                page={d.page}
                pageSize={d.pageSize}
                total={d.total}
                noun="quotes"
                onPage={(p) => {
                  const next = new URLSearchParams(params);
                  next.set('page', String(p));
                  setParams(next);
                }}
              />
            </>
          )}
        </QueryBoundary>
      </Card>
    </>
  );
}
