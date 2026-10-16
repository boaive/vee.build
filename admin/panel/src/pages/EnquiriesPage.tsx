import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, type EnquiryStatus } from '@shared';
import { Download, Hammer, Inbox, Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { download } from '@/api';
import { useEnquiries, useEnquiryCounts } from '@/api/hooks';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { EmptyState, QueryBoundary } from '@/components/states/States';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatAgo, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tab = EnquiryStatus | 'open' | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Open' },
  ...ENQUIRY_STATUSES.map((s) => ({ id: s as Tab, label: ENQUIRY_STATUS_LABELS[s] })),
  { id: 'all', label: 'All' },
];

export default function EnquiriesPage() {
  const [params, setParams] = useSearchParams();
  const status = (TABS.some((t) => t.id === params.get('status')) ? params.get('status') : 'open') as Tab;
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [text, setText] = useState(q);
  const [exporting, setExporting] = useState(false);

  // The search follows the typing after a short pause, and lives in the address so Back keeps it.
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

  const list = useEnquiries({ status, q: q || undefined, page });
  const counts = useEnquiryCounts().data?.byStatus;
  const countOf = (t: Tab) => (!counts ? null : t === 'open' ? counts.new + counts.contacted + counts.quoted : t === 'all' ? Object.entries(counts).reduce((s, [k, n]) => (k === 'spam' ? s : s + n), 0) : counts[t]);

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === 'open') next.delete('status');
    else next.set('status', t);
    next.delete('page');
    setParams(next);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await download(`/admin/enquiries/export.csv?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`, 'enquiries.csv');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Enquiries"
        title="Enquiries"
        description="Everything sent from the website’s forms and the configurator. Open one to reply, add notes and files, or make a quote."
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export
          </Button>
        }
      />

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Show">
          <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
            {TABS.map((t) => {
              const n = countOf(t.id);
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={status === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn('rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground', status === t.id && 'bg-background text-foreground shadow-sm')}
                >
                  {t.label}
                  {n !== null && <span className="data ml-1.5 text-xs text-muted-foreground">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, email, phone, message" className="pl-8" aria-label="Search enquiries" />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <QueryBoundary
          query={list}
          isEmpty={(d) => d.items.length === 0}
          empty={
            <EmptyState icon={Inbox} title={q ? 'Nothing matches that search' : 'No enquiries here'}>
              {q ? 'Try fewer words, or another tab.' : status === 'new' ? 'Everyone has had an answer.' : 'Enquiries from the website will appear here.'}
            </EmptyState>
          }
        >
          {(d) => (
            <>
              <ul className="divide-y divide-border">
                {d.items.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/enquiries/${e.id}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-accent sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_6.5rem]"
                    >
                      <span className="min-w-0">
                        <span className={cn('flex items-center gap-2 truncate', e.unread ? 'font-semibold' : 'font-medium')}>
                          {e.unread && <span className="size-2 shrink-0 rounded-full bg-signal" aria-label="Unread" />}
                          <span className="truncate">{e.name}</span>
                        </span>
                        <span className="data block truncate text-xs text-muted-foreground">{e.email}</span>
                      </span>
                      <span className="hidden min-w-0 truncate text-sm sm:block">
                        {e.category}
                        {e.hasBuild && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground" title="Sent from the configurator, with a build">
                            <Hammer className="size-3" aria-hidden /> build
                          </span>
                        )}
                      </span>
                      <span className="data hidden text-xs text-muted-foreground sm:block" title={formatDateTime(e.createdAt)}>
                        {formatAgo(e.createdAt)}
                      </span>
                      <StatusBadge status={e.status} className="justify-self-end sm:justify-self-start" />
                      <span className="col-span-full text-xs text-muted-foreground sm:hidden">
                        {e.category} · {formatAgo(e.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination
                page={d.page}
                pageSize={d.pageSize}
                total={d.total}
                noun="enquiries"
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
