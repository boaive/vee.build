import { PRICING_FIELDS, PRICING_GROUPS, SAMPLE_BUILDS, diffPricing, getRate, priceBuild, setRate, validatePricing, type PricingSet, type PricingState } from '@shared';
import { History, Loader2, RotateCcw, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/api';
import { usePricing, usePublishPricing } from '@/api/hooks';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingRows } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChangeTag } from '@/features/ChangeTag';
import { formatDateTime, formatInr } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PricesPage() {
  const p = usePricing();
  return (
    <>
      <PageHeader
        eyebrow="Prices"
        title="Prices on the website"
        description="The rates the configurator uses to show an estimate, and that new quotes are priced at. Change them here and publish: the website shows the new prices within a minute. Indian rupees, ex-works, excluding GST."
      />
      {p.data ? <Editor key={p.data.current.version} state={p.data} /> : p.isError ? <ErrorState error={p.error} onRetry={() => void p.refetch()} /> : <LoadingRows rows={10} />}
    </>
  );
}

const toValues = (set: PricingSet) => Object.fromEntries(PRICING_FIELDS.map((f) => [f.path, String(getRate(set, f.path))]));
const parse = (s: string) => Number(s.replace(/[,\s₹]/g, ''));

function Editor({ state }: { state: PricingState }) {
  const live = state.current.rates;
  const publish = usePublishPricing();
  const [values, setValues] = useState<Record<string, string>>(() => toValues(live));
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState('');
  const [serverIssues, setServerIssues] = useState<Record<string, string>>({});

  // The set as typed, where every box holds a number.
  const { next, typing } = useMemo(() => {
    let set = live;
    const typing = new Map<string, string>();
    for (const f of PRICING_FIELDS) {
      const raw = values[f.path] ?? '';
      const n = parse(raw);
      if (raw.trim() === '' || !Number.isFinite(n)) typing.set(f.path, 'Enter a number.');
      else set = setRate(set, f.path, n);
    }
    return { next: set, typing };
  }, [values, live]);

  const issues = useMemo(() => {
    const m = new Map(typing);
    for (const i of validatePricing(next)) if (!m.has(i.path)) m.set(i.path, i.message);
    for (const [k, v] of Object.entries(serverIssues)) if (!m.has(k)) m.set(k, v);
    return m;
  }, [next, typing, serverIssues]);

  const changes = useMemo(() => diffPricing(live, next), [live, next]);
  const samples = useMemo(() => SAMPLE_BUILDS.filter((s) => !s.id.endsWith('-footings')).map((s) => ({ s, before: priceBuild(s.quantities, live).total, after: priceBuild(s.quantities, next).total })), [live, next]);

  const doPublish = () =>
    publish.mutate(
      { rates: next, note: note.trim(), basedOn: state.current.version },
      {
        onSuccess: (v) => {
          toast.success(`Version ${v.version} is live. The website shows it within a minute.`);
          setNote('');
        },
        onError: (e) => {
          if (isApiError(e)) setServerIssues(e.fields);
          toast.error(e.message);
        },
      },
    );

  return (
    <div className="grid gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        {PRICING_GROUPS.map((g) => (
          <Card key={g} className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">{g}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-0">
              {PRICING_FIELDS.filter((f) => f.group === g).map((f) => {
                const id = `rate-${f.path}`;
                const was = getRate(live, f.path);
                const n = parse(values[f.path] ?? '');
                const issue = issues.get(f.path);
                return (
                  <div key={f.path} className="grid grid-cols-[1fr_9rem] items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <label htmlFor={id} className="min-w-0">
                      <span className="block text-sm">{f.label}</span>
                      <span className="block text-xs text-muted-foreground">{f.unit}</span>
                    </label>
                    <Input
                      id={id}
                      inputMode="decimal"
                      className={cn('data h-8 text-right', issue && 'border-danger', !issue && Number.isFinite(n) && n !== was && 'border-signal')}
                      value={values[f.path] ?? ''}
                      onChange={(e) => {
                        setServerIssues({});
                        setValues((v) => ({ ...v, [f.path]: e.target.value }));
                      }}
                      aria-invalid={!!issue}
                      aria-describedby={issue ? `${id}-err` : undefined}
                    />
                    <div className="col-span-full flex justify-end gap-2 text-xs empty:hidden">
                      {issue ? (
                        <span id={`${id}-err`} className="text-danger">
                          {issue}
                        </span>
                      ) : Number.isFinite(n) && n !== was ? (
                        <>
                          <span className="text-muted-foreground">was {f.factor ? was : formatInr(was)}</span>
                          <ChangeTag from={was} to={n} factor={f.factor} />
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <aside className="min-w-0 space-y-4">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">What the website’s presets would cost</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {samples.map(({ s, before, after }) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="data px-4 py-2 text-right">
                      {formatInr(after)}
                      {after !== before && <span className="block text-xs text-muted-foreground">was {formatInr(before)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">On the default foundation (600 mm, footings and L plinth).</p>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="size-4" aria-hidden /> Published versions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-border">
              {state.history.map((v) => (
                <li key={v.version} className="flex items-start justify-between gap-2 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="data text-sm">v{v.version}</span>
                    {v.version === state.current.version && <span className="eyebrow ml-2">Live</span>}
                    <span className="block text-xs text-muted-foreground">{formatDateTime(v.publishedAt)}</span>
                    {v.note && <span className="block truncate text-xs">{v.note}</span>}
                  </span>
                  {v.version !== state.current.version && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setValues(toValues(v.rates));
                        toast.info(`Version ${v.version}’s prices are in the editor. Publish to put them back on the website.`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <RotateCcw className="size-3.5" /> Load
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>

      {/* Always in reach while there is something to publish. */}
      <div className={cn('fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur transition-transform lg:left-[var(--sidebar-w,0)]', changes.length || issues.size ? 'translate-y-0' : 'translate-y-full')} aria-live="polite">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {issues.size ? (
              <span className="text-danger">
                {issues.size} {issues.size === 1 ? 'price needs' : 'prices need'} fixing before publishing.
              </span>
            ) : (
              <>
                <span className="data font-medium">{changes.length}</span> {changes.length === 1 ? 'price changed' : 'prices changed'}, not yet on the website.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => (setValues(toValues(live)), setServerIssues({}))}>
              Undo changes
            </Button>
            <Button onClick={() => setConfirm(true)} disabled={!!issues.size || !changes.length || publish.isPending}>
              {publish.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Publish to website
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Publish version ${state.current.version + 1}?`}
        description={
          <>
            <p className="mb-2">The website’s configurator and every new quote will use these prices. Quotes already sent keep theirs.</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {changes.map((ch) => (
                <li key={ch.path} className="flex justify-between gap-3 text-sm">
                  <span>{ch.label}</span>
                  <ChangeTag from={ch.from} to={ch.to} factor={PRICING_FIELDS.find((f) => f.path === ch.path)?.factor} />
                </li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Publish"
        onConfirm={doPublish}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pub-note">
            Note <span className="font-normal text-muted-foreground">(optional, for the history)</span>
          </Label>
          <Input id="pub-note" value={note} maxLength={300} placeholder="Steel up 6% from November" onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
    </div>
  );
}
