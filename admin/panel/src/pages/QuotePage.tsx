import { QUOTE_STATUS_LABELS, SAMPLE_BUILDS, priceBuild, type Quote, type QuoteInput, type QuoteStatus } from '@shared';
import { ArrowLeft, Copy, Loader2, Printer, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { isApiError } from '@/api';
import { useCopyQuote, useCreateQuote, useDeleteQuote, useNewQuoteDefaults, usePricing, useQuote, useQuoteNotes, useQuoteStatus, useSaveQuote } from '@/api/hooks';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState, LoadingRows } from '@/components/states/States';
import { QuoteBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PriceLines } from '@/features/quotes/PriceLines';
import { QuantitiesForm } from '@/features/quotes/QuantitiesForm';
import { buildHeadline, foundationLine, addOnList } from '@/lib/build';
import { formatDate, formatDateTime } from '@/lib/format';

type Draft = Required<Omit<QuoteInput, 'enquiryId'>> & { enquiryId: string | null };

const BackLink = () => (
  <Link to="/quotes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="size-4" /> Quotes
  </Link>
);

/** /quotes/new (optionally ?enquiry=…) starts a draft; /quotes/:id shows one, editable while it is a draft. */
export default function QuotePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const enquiryId = params.get('enquiry');
  const existing = useQuote(id);
  const defaults = useNewQuoteDefaults(enquiryId, !id);
  const pricing = usePricing();

  const failed = (id ? existing : defaults).error ?? pricing.error;
  if (failed) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <ErrorState error={failed} onRetry={() => void (id ? existing.refetch() : defaults.refetch())} />
      </div>
    );
  }
  if (!pricing.data || (id ? !existing.data : !defaults.data)) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <LoadingRows rows={8} />
      </div>
    );
  }
  const q = existing.data;
  if (q && q.status !== 'draft') return <SentQuote key={q.id} q={q} />;
  const start: Draft = q
    ? { enquiryId: q.enquiryId, title: q.title, customer: q.customer, quantities: q.quantities, validUntil: q.validUntil, terms: q.terms, notes: q.notes }
    : { ...(defaults.data as Draft), notes: defaults.data?.notes ?? '' };
  return <DraftEditor key={q?.id ?? 'new'} quote={q ?? null} start={start} />;
}

/* ---------- A draft: everything can change, priced live at the published rates ---------- */

function DraftEditor({ quote, start }: { quote: Quote | null; start: Draft }) {
  const navigate = useNavigate();
  const pricing = usePricing().data!;
  const create = useCreateQuote();
  const save = useSaveQuote(quote?.id ?? '');
  const status = useQuoteStatus(quote?.id ?? '');
  const remove = useDeleteQuote();
  const [v, setV] = useState<Draft>(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(start), [v, start]);
  const price = useMemo(() => priceBuild(v.quantities, pricing.current.rates), [v.quantities, pricing.current.rates]);
  const busy = create.isPending || save.isPending || status.isPending;

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, value: Draft[K]) => setV((x) => ({ ...x, [k]: value }));
  const setCustomer = (k: keyof Draft['customer'], value: string) => setV((x) => ({ ...x, customer: { ...x.customer, [k]: value } }));

  const onError = (e: unknown) => {
    if (isApiError(e)) setErrors(e.fields);
    toast.error(e instanceof Error ? e.message : 'The quote could not be saved.');
  };

  const persist = (then?: (q: Quote) => void) => {
    setErrors({});
    if (!quote) {
      create.mutate(v, {
        onSuccess: (q) => {
          toast.success(`${q.number} created`);
          void navigate(`/quotes/${q.id}`, { replace: true });
          then?.(q);
        },
        onError,
      });
    } else {
      save.mutate(v, { onSuccess: (q) => (toast.success('Saved'), then?.(q)), onError });
    }
  };

  const markSent = () => {
    const send = (q: Quote) => status.mutate('sent', { onSuccess: () => toast.success(`${q.number} marked as sent`) });
    if (dirty || !quote) persist(send);
    else send(quote);
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-danger">{errors[k]}</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1">{quote ? `${quote.number} · Draft` : 'New quote'}</p>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ fontStretch: '108%' }}>
            {v.title || 'Untitled quote'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A draft is priced at the published price list (version {pricing.current.version}). Once sent, its prices stay as they were.
            {quote?.enquiryId && (
              <>
                {' '}
                <Link className="underline" to={`/enquiries/${quote.enquiryId}`}>
                  Open the enquiry
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="title">Quote title</Label>
                <Input id="title" value={v.title} maxLength={160} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} />
                {err('title')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={v.customer.name} maxLength={200} onChange={(e) => setCustomer('name', e.target.value)} aria-invalid={!!errors['customer.name']} />
                {err('customer.name')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={v.customer.email} maxLength={254} onChange={(e) => setCustomer('email', e.target.value)} aria-invalid={!!errors['customer.email']} />
                {err('customer.email')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" type="tel" value={v.customer.phone} maxLength={60} onChange={(e) => setCustomer('phone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-address">Site or address</Label>
                <Input id="c-address" value={v.customer.address} maxLength={500} onChange={(e) => setCustomer('address', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border py-3">
              <CardTitle className="text-sm">The build</CardTitle>
              <Select
                value=""
                onValueChange={(id) => {
                  const s = SAMPLE_BUILDS.find((x) => x.id === id);
                  if (s) set('quantities', s.quantities);
                }}
              >
                <SelectTrigger size="sm" className="w-56" aria-label="Start from one of the website’s presets">
                  <SelectValue placeholder="Start from a preset…" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_BUILDS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="py-4">
              <p className="mb-4 text-sm text-muted-foreground">{buildHeadline(v.quantities)}. The counts are what the configurator lays out; a build sent from the website arrives filled in.</p>
              <QuantitiesForm value={v.quantities} onChange={(q) => set('quantities', q)} />
              {errors['quantities.shells.A'] && <p className="mt-2 text-xs text-danger">{errors['quantities.shells.A']}</p>}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Validity, terms and notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 py-4">
              <div className="space-y-1 sm:max-w-56">
                <Label htmlFor="valid">Valid until</Label>
                <Input id="valid" type="date" value={v.validUntil} onChange={(e) => set('validUntil', e.target.value)} aria-invalid={!!errors.validUntil} />
                {err('validUntil')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="terms">Terms (printed on the quote)</Label>
                <Textarea id="terms" rows={3} maxLength={4000} value={v.terms} onChange={(e) => set('terms', e.target.value)} aria-invalid={!!errors.terms} />
                {err('terms')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Internal notes (never printed)</Label>
                <Textarea id="notes" rows={2} maxLength={4000} value={v.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0">
          <div className="space-y-3 lg:sticky lg:top-20">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm">Price</CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                {price.total ? <PriceLines lines={price.lines} total={price.total} perSqft={price.perSqft} /> : <p className="py-4 text-sm text-muted-foreground">Add at least one shell to price the build.</p>}
              </CardContent>
            </Card>
            <div className="grid gap-2">
              <Button onClick={() => persist()} disabled={busy || (!!quote && !dirty)}>
                {(create.isPending || save.isPending) && <Loader2 className="size-4 animate-spin" />}
                {quote ? (dirty ? 'Save changes' : 'Saved') : 'Create quote'}
              </Button>
              {quote && (
                <>
                  <Button variant="outline" asChild>
                    <a href={`/admin/quotes/${quote.id}/print`} target="_blank" rel="noopener" onClick={(e) => dirty && (e.preventDefault(), toast.info('Save the changes first, so the printout has them.'))}>
                      <Printer className="size-4" /> Print or save as PDF
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmSend(true)} disabled={busy || !price.total}>
                    <Send className="size-4" /> Mark as sent
                  </Button>
                  <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="size-4" /> Delete draft
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Mark ${quote?.number ?? 'this quote'} as sent?`}
        description={
          <ul className="list-disc space-y-1 pl-4">
            <li>Send the customer the PDF yourself (Print, then “Save as PDF”).</li>
            <li>Its prices stay as they are now, whatever the price list does next.</li>
            {quote?.enquiryId && <li>The enquiry moves to Quoted.</li>}
          </ul>
        }
        confirmLabel="Mark as sent"
        onConfirm={markSent}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Delete ${quote?.number ?? 'this draft'}?`}
        description="A draft has not been sent, so nothing is lost but this page."
        confirmLabel="Delete draft"
        onConfirm={() =>
          quote &&
          remove.mutate(quote, {
            onSuccess: () => {
              toast.success('Draft deleted');
              void navigate(quote.enquiryId ? `/enquiries/${quote.enquiryId}` : '/quotes', { replace: true });
            },
          })
        }
      />
    </div>
  );
}

/* ---------- Sent and after: the record as the customer has it ---------- */

const NEXT: Record<Exclude<QuoteStatus, 'draft'>, { to: QuoteStatus; label: string; primary?: boolean; ask?: string }[]> = {
  sent: [
    { to: 'accepted', label: 'Customer accepted', primary: true, ask: 'The enquiry is marked Won.' },
    { to: 'declined', label: 'Customer declined' },
    { to: 'draft', label: 'Back to draft to change it', ask: 'It will be priced again at the published price list when you save it.' },
  ],
  accepted: [{ to: 'sent', label: 'Undo: back to sent' }],
  declined: [{ to: 'sent', label: 'Undo: back to sent' }],
  expired: [{ to: 'draft', label: 'Back to draft to renew it', ask: 'Move the validity date on, save, and send it again.' }],
};

function SentQuote({ q }: { q: Quote }) {
  const navigate = useNavigate();
  const status = useQuoteStatus(q.id);
  const copy = useCopyQuote(q.id);
  const notes = useQuoteNotes(q.id);
  const [text, setText] = useState(q.notes);
  const [ask, setAsk] = useState<(typeof NEXT)['sent'][number] | null>(null);
  const moves = NEXT[q.status as Exclude<QuoteStatus, 'draft'>];
  const extras = addOnList(q.quantities);

  const move = (to: QuoteStatus) => status.mutate(to, { onSuccess: () => toast.success(`Marked ${QUOTE_STATUS_LABELS[to].toLowerCase()}`) });

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1">{q.number}</p>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ fontStretch: '108%' }}>
            {q.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <QuoteBadge status={q.status} />
            {q.sentAt && <span>· sent {formatDateTime(q.sentAt)}</span>}
            <span>· valid until {formatDate(q.validUntil)}</span>
            <span>· price list v{q.pricingVersion}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/admin/quotes/${q.id}/print`} target="_blank" rel="noopener">
              <Printer className="size-4" /> Print or save as PDF
            </a>
          </Button>
          <Button variant="outline" disabled={copy.isPending} onClick={() => copy.mutate(undefined, { onSuccess: (c) => (toast.success(`${c.number} created as a copy`), void navigate(`/quotes/${c.id}`)) })}>
            <Copy className="size-4" /> Make a copy
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">What happened next?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 py-4">
              {moves.map((m) => (
                <Button key={m.to} variant={m.primary ? 'default' : 'outline'} disabled={status.isPending} onClick={() => (m.ask ? setAsk(m) : move(m.to))}>
                  {m.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Customer and build</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 py-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{q.customer.name}</p>
                {q.customer.email && <p className="data break-all text-xs">{q.customer.email}</p>}
                {q.customer.phone && <p className="data text-xs">{q.customer.phone}</p>}
                {q.customer.address && <p className="text-xs">{q.customer.address}</p>}
                {q.enquiryId && (
                  <Link to={`/enquiries/${q.enquiryId}`} className="mt-1 inline-block text-xs underline">
                    Open the enquiry
                  </Link>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Build</p>
                <p>{buildHeadline(q.quantities)}</p>
                <p className="text-xs text-muted-foreground">Foundation {foundationLine(q.quantities)}</p>
                <p className="text-xs text-muted-foreground">Add-ons: {extras.length ? extras.join(', ') : 'none'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Terms</p>
                <p className="whitespace-pre-wrap">{q.terms}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 py-4">
              <Textarea rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Never printed." aria-label="Internal notes" />
              <Button size="sm" variant="outline" disabled={text === q.notes || notes.isPending} onClick={() => notes.mutate(text, { onSuccess: () => toast.success('Notes saved') })}>
                Save notes
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0">
          <Card className="gap-0 py-0 shadow-none lg:sticky lg:top-20">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Price as sent</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <PriceLines lines={q.lines} total={q.total} perSqft={q.perSqft} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={!!ask}
        onOpenChange={(o) => !o && setAsk(null)}
        title={`${ask?.label ?? ''}?`}
        description={ask?.ask ?? ''}
        confirmLabel={ask?.label ?? 'Confirm'}
        onConfirm={() => ask && move(ask.to)}
      />
    </div>
  );
}
