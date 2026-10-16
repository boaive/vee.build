import type { EnquiryListItem, QuoteListItem } from '@shared';
import { ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { Link } from 'react-router';
import { useOverview } from '@/api/hooks';
import { MetricTile } from '@/components/MetricTile';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, QueryBoundary } from '@/components/states/States';
import { QuoteBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAgo, formatDate, formatInr } from '@/lib/format';

/** What needs doing today: who is waiting for an answer, and which quotes are out. */
export default function OverviewPage() {
  const o = useOverview();
  const c = o.data?.counts;
  return (
    <>
      <PageHeader eyebrow="Overview" title="Today" description="Who is waiting for an answer, and which quotes are out with customers." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Waiting for a reply" value={c?.new} loading={!c} tone="alert" to="/enquiries?status=new" hint="New enquiries" />
        <MetricTile label="Open enquiries" value={c?.open} loading={!c} to="/enquiries" hint="New, contacted or quoted" />
        <MetricTile label="Quotes out" value={c ? formatInr(c.quotesOutValue) : undefined} loading={!c} to="/quotes?status=sent" hint={c ? `${c.quotesOut} waiting for an answer` : undefined} />
        <MetricTile label="Won, last 30 days" value={c?.won30} loading={!c} to="/enquiries?status=won" hint={c ? `of ${c.received30} received` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
            <CardTitle className="text-sm">Waiting for a reply</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/enquiries?status=new">
                All new <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <QueryBoundary
              query={o}
              isEmpty={(d) => d.needsReply.length === 0}
              empty={
                <EmptyState icon={CheckCircle2} title="Everyone has had an answer">
                  New enquiries from the website appear here until you mark them contacted.
                </EmptyState>
              }
            >
              {(d) => (
                <ul className="divide-y divide-border">
                  {d.needsReply.map((e) => (
                    <EnquiryRow key={e.id} e={e} />
                  ))}
                </ul>
              )}
            </QueryBoundary>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
            <CardTitle className="text-sm">Quotes waiting for an answer</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/quotes?status=sent">
                All sent <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <QueryBoundary
              query={o}
              isEmpty={(d) => d.quotesOut.length === 0}
              empty={
                <EmptyState icon={FileText} title="No quotes out">
                  A quote you mark as sent waits here for the customer’s answer.
                </EmptyState>
              }
            >
              {(d) => (
                <ul className="divide-y divide-border">
                  {d.quotesOut.map((q) => (
                    <QuoteRow key={q.id} q={q} />
                  ))}
                </ul>
              )}
            </QueryBoundary>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EnquiryRow({ e }: { e: EnquiryListItem }) {
  return (
    <li>
      <Link to={`/enquiries/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent">
        <span className="min-w-0">
          <span className="block truncate font-medium">{e.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {e.category}
            {e.hasBuild && ' · from the configurator'}
          </span>
        </span>
        <span className="data shrink-0 text-xs text-muted-foreground">{formatAgo(e.createdAt, Date.now())}</span>
      </Link>
    </li>
  );
}

function QuoteRow({ q }: { q: QuoteListItem }) {
  const late = q.validUntil < new Date().toISOString().slice(0, 10);
  return (
    <li>
      <Link to={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent">
        <span className="min-w-0">
          <span className="block truncate font-medium">{q.customerName || q.title}</span>
          <span className="data block truncate text-xs text-muted-foreground">
            {q.number} · valid until {formatDate(q.validUntil)}
            {late && ' · past its date'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="data block text-sm">{formatInr(q.total)}</span>
          <QuoteBadge status={q.status} />
        </span>
      </Link>
    </li>
  );
}
