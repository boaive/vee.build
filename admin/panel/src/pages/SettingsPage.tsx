import type { SecurityState, Settings, SettingsState } from '@shared';
import { Download, KeyRound, Loader2, LogOut, MonitorSmartphone } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'sonner';
import { download, isApiError } from '@/api';
import { useChangePassword, useSaveSettings, useSecurity, useSettings, useSignOutDevice, useSignOutOthers } from '@/api/hooks';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingRows } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatAgo, formatDateTime } from '@/lib/format';

export default function SettingsPage() {
  const settings = useSettings();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash, settings.data]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings" title="Settings" description="What quotes print, which emails you get, your password, and a copy of everything." />
      <div className="space-y-4">
        {settings.data ? <SettingsForm key={JSON.stringify(settings.data.settings)} state={settings.data} /> : settings.isError ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : <LoadingRows rows={6} />}
        <SecuritySection />
        <DataSection />
      </div>
    </div>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20 gap-0 py-0 shadow-none">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="py-4">{children}</CardContent>
    </Card>
  );
}

function SettingsForm({ state }: { state: SettingsState }) {
  const save = useSaveSettings();
  const [s, setS] = useState<Settings>(state.settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(s) !== JSON.stringify(state.settings);
  const biz = (k: keyof Settings['business'], v: string) => setS((x) => ({ ...x, business: { ...x.business, [k]: v } }));
  const err = (k: string) => errors[k] && <p className="text-xs text-danger">{errors[k]}</p>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    save.mutate(s, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (x) => {
        if (isApiError(x)) setErrors(x.fields);
        toast.error(x.message);
      },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section id="business" title="Business details" description="Printed at the foot of every quote. Leave out what you do not want on it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="b-name">Business name</Label>
            <Input id="b-name" value={s.business.name} maxLength={160} onChange={(e) => biz('name', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="b-address">Address</Label>
            <Textarea id="b-address" rows={2} value={s.business.address} maxLength={400} onChange={(e) => biz('address', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-phone">Phone</Label>
            <Input id="b-phone" type="tel" value={s.business.phone} maxLength={60} onChange={(e) => biz('phone', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-email">Email</Label>
            <Input id="b-email" type="email" value={s.business.email} maxLength={254} onChange={(e) => biz('email', e.target.value)} aria-invalid={!!errors['business.email']} />
            {err('business.email')}
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-gstin">GSTIN</Label>
            <Input id="b-gstin" className="data uppercase" value={s.business.gstin} maxLength={15} onChange={(e) => biz('gstin', e.target.value)} aria-invalid={!!errors['business.gstin']} />
            {err('business.gstin')}
          </div>
        </div>
      </Section>

      <Section id="quotes" title="New quotes" description="What a new quote starts with. Each quote can still be changed.">
        <div className="grid gap-3">
          <div className="space-y-1 sm:max-w-48">
            <Label htmlFor="q-days">Valid for (days)</Label>
            <Input
              id="q-days"
              type="number"
              min={1}
              max={365}
              className="data"
              value={s.quotes.validityDays}
              onChange={(e) => setS((x) => ({ ...x, quotes: { ...x.quotes, validityDays: Math.round(Number(e.target.value) || 0) } }))}
              aria-invalid={!!errors['quotes.validityDays']}
            />
            {err('quotes.validityDays')}
          </div>
          <div className="space-y-1">
            <Label htmlFor="q-terms">Terms</Label>
            <Textarea id="q-terms" rows={3} maxLength={4000} value={s.quotes.terms} onChange={(e) => setS((x) => ({ ...x, quotes: { ...x.quotes, terms: e.target.value } }))} aria-invalid={!!errors['quotes.terms']} />
            {err('quotes.terms')}
          </div>
        </div>
      </Section>

      <Section
        id="notifications"
        title="Emails to you"
        description={state.notifyTo ? `Sent to ${state.notifyTo}.` : 'Email is not set up yet: nothing is sent until it is (admin/README.md, step 7). These choices are kept for then.'}
      >
        <div className="space-y-3">
          <Toggle id="n-enquiry" label="A new enquiry arrives" hint="With the message, and a reply goes straight to the customer." checked={s.notify.newEnquiry} onChange={(v) => setS((x) => ({ ...x, notify: { ...x.notify, newEnquiry: v } }))} />
          <Toggle id="n-signin" label="Someone signs in to this panel" hint="So you know at once if it was not you." checked={s.notify.signIn} onChange={(v) => setS((x) => ({ ...x, notify: { ...x.notify, signIn: v } }))} />
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        {dirty && (
          <Button type="button" variant="ghost" onClick={() => (setS(state.settings), setErrors({}))}>
            Undo changes
          </Button>
        )}
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          {dirty ? 'Save settings' : 'Saved'}
        </Button>
      </div>
    </form>
  );
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-sm">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ---------- Security ---------- */

function SecuritySection() {
  const sec = useSecurity();
  return (
    <Section id="security" title="Password and devices" description="There is one login. Keep the password to yourself; anyone with it can change prices and read every enquiry.">
      {sec.data ? <Security s={sec.data} /> : sec.isError ? <ErrorState error={sec.error} onRetry={() => void sec.refetch()} /> : <LoadingRows rows={4} />}
    </Section>
  );
}

function Security({ s }: { s: SecurityState }) {
  const change = useChangePassword();
  const others = useSignOutOthers();
  const one = useSignOutDevice();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const current = String(data.get('current') ?? '');
    const next = String(data.get('next') ?? '');
    const again = String(data.get('again') ?? '');
    if (next !== again) {
      setErrors({ again: 'The two new passwords are not the same.' });
      return;
    }
    setErrors({});
    change.mutate(
      { current, next },
      {
        onSuccess: () => {
          form.reset();
          toast.success('Password changed. Every other device has been signed out.');
        },
        onError: (x) => {
          if (isApiError(x)) setErrors(x.fields);
          toast.error(x.message);
        },
      },
    );
  };
  const err = (k: string) => errors[k] && <p className="text-xs text-danger">{errors[k]}</p>;
  const activity = showAll ? s.activity : s.activity.slice(0, 8);

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3" autoComplete="on">
        <p className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4" aria-hidden /> Change the password
          {s.passwordChangedAt && <span className="text-xs font-normal text-muted-foreground">last changed {formatAgo(s.passwordChangedAt)}</span>}
        </p>
        <input type="text" name="username" autoComplete="username" hidden readOnly />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="pw-current">Current password</Label>
            <Input id="pw-current" name="current" type="password" autoComplete="current-password" required aria-invalid={!!errors.current} />
            {err('current')}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-next">New password</Label>
            <Input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={12} required aria-invalid={!!errors.next} />
            {err('next')}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-again">New password again</Label>
            <Input id="pw-again" name="again" type="password" autoComplete="new-password" minLength={12} required aria-invalid={!!errors.again} />
            {err('again')}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">At least 12 characters. A short sentence is easy to remember and hard to guess.</p>
        <Button type="submit" variant="outline" disabled={change.isPending}>
          {change.isPending && <Loader2 className="size-4 animate-spin" />} Change password
        </Button>
      </form>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MonitorSmartphone className="size-4" aria-hidden /> Signed in on
          </p>
          {s.sessions.length > 1 && (
            <Button size="sm" variant="outline" disabled={others.isPending} onClick={() => others.mutate(undefined, { onSuccess: () => toast.success('Every other device is signed out') })}>
              <LogOut className="size-3.5" /> Sign out every other device
            </Button>
          )}
        </div>
        <ul className="divide-y divide-border rounded-md border border-border">
          {s.sessions.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm">
                  {device(d.userAgent)}
                  {d.current && <span className="eyebrow ml-2">This device</span>}
                </span>
                <span className="data block truncate text-xs text-muted-foreground">
                  {d.ip ?? 'unknown address'}
                  {d.country && ` · ${d.country}`} · active {formatAgo(d.lastSeenAt)}
                </span>
              </span>
              {!d.current && (
                <Button size="sm" variant="ghost" onClick={() => one.mutate(d.id)} aria-label="Sign out this device">
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Recent activity</p>
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {activity.map((a) => (
            <li key={a.id} className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2">
              <span className={a.action.startsWith('Sign-in failed') || a.action.startsWith('Sign-in blocked') ? 'text-danger' : undefined}>{a.action}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(a.at)}</span>
              {(a.detail || a.ip) && (
                <span className="col-span-full truncate text-xs text-muted-foreground">
                  {[a.detail, a.ip && `${a.ip}${a.country ? ` · ${a.country}` : ''}`].filter(Boolean).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
        {s.activity.length > 8 && (
          <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show less' : `Show all ${s.activity.length}`}
          </Button>
        )}
      </div>
    </div>
  );
}

/** "Chrome on Windows", from a browser's own description. */
function device(ua: string | null) {
  if (!ua) return 'Unknown browser';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'A browser';
  const os = /iPhone|iPad/.test(ua) ? 'iPhone or iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'another system';
  return `${browser} on ${os}`;
}

/* ---------- Data ---------- */

function DataSection() {
  const [busy, setBusy] = useState<string | null>(null);
  const get = async (what: string, path: string, name: string) => {
    setBusy(what);
    try {
      await download(path, name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The download failed.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Section id="data" title="Your data" description="A copy is also made every night, kept 30 days, and the database can be rewound to any minute of the last 30 days (admin/README.md).">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!!busy} onClick={() => void get('csv', '/admin/enquiries/export.csv?status=all', 'enquiries.csv')}>
          {busy === 'csv' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Enquiries (spreadsheet)
        </Button>
        <Button variant="outline" disabled={!!busy} onClick={() => void get('json', '/admin/export', 'vee-build-data.json')}>
          {busy === 'json' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Everything (JSON)
        </Button>
      </div>
    </Section>
  );
}
