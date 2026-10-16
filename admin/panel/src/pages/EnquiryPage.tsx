import { ENQUIRY_STATUS_LABELS, type EnquiryDetail, type EnquiryStatus } from '@shared';
import { ArrowLeft, Download, ExternalLink, FilePlus2, Mail, MessageCircle, Paperclip, Phone, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useAddNote, useDeleteEnquiry, useDeleteFile, useDeleteNote, useEnquiry, useUpdateEnquiry, useUploadFile } from '@/api/hooks';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState, LoadingRows } from '@/components/states/States';
import { QuoteBadge, StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { addOnList, buildHeadline, foundationLine, whatsappNumber } from '@/lib/build';
import { formatAgo, formatBytes, formatDate, formatDateTime, formatInr } from '@/lib/format';
import { cn } from '@/lib/utils';

/** The order an enquiry usually moves through. Spam is set from the bottom of the page. */
const STEPS: EnquiryStatus[] = ['new', 'contacted', 'quoted', 'won', 'lost'];

export default function EnquiryPage() {
  const { id = '' } = useParams();
  const q = useEnquiry(id);
  if (q.data) return <Detail d={q.data} />;
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      {q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <LoadingRows rows={8} />}
    </div>
  );
}

const BackLink = () => (
  <Link to="/enquiries" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="size-4" /> Enquiries
  </Link>
);

function Detail({ d }: { d: EnquiryDetail }) {
  const e = d.enquiry;
  const update = useUpdateEnquiry(e.id);
  const remove = useDeleteEnquiry();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wa = whatsappNumber(e.phone);

  const setStatus = (s: EnquiryStatus) => update.mutate({ status: s }, { onSuccess: () => toast.success(`Marked ${ENQUIRY_STATUS_LABELS[s].toLowerCase()}`) });

  /** After a reply is started, offer the obvious next step. */
  const afterReply = () => {
    if (e.status !== 'new') return;
    toast('Did you reply?', { action: { label: 'Mark contacted', onClick: () => setStatus('contacted') }, duration: 10_000 });
  };

  const subject = encodeURIComponent('Your enquiry to VEE.BUILD');
  const body = encodeURIComponent(`Dear ${e.name},\n\nThank you for your enquiry about ${e.category === 'Not chosen' ? 'building with VEE.BUILD' : e.category}.\n\n`);

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1">
            {e.form === 'partnership' ? 'Partnership' : 'Enquiry'} · {e.category}
          </p>
          <h1 className="truncate text-2xl font-bold sm:text-3xl" style={{ fontStretch: '108%' }}>
            {e.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Received {formatDateTime(e.createdAt)} ({formatAgo(e.createdAt)})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`mailto:${e.email}?subject=${subject}&body=${body}`} onClick={afterReply}>
              <Mail className="size-4" /> Reply by email
            </a>
          </Button>
          {e.phone && (
            <Button asChild variant="outline">
              <a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`} onClick={afterReply}>
                <Phone className="size-4" /> Call
              </a>
            </Button>
          )}
          {wa && (
            <Button asChild variant="outline">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={afterReply}>
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to={`/quotes/new?enquiry=${e.id}`}>
              <FilePlus2 className="size-4" /> Make a quote
            </Link>
          </Button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Status">
        <span className="mr-1 text-sm text-muted-foreground">Status</span>
        {STEPS.map((s) => (
          <Button key={s} size="sm" variant={e.status === s ? 'default' : 'outline'} aria-pressed={e.status === s} disabled={update.isPending} onClick={() => e.status !== s && setStatus(s)}>
            {ENQUIRY_STATUS_LABELS[s]}
          </Button>
        ))}
        {e.status === 'spam' && <StatusBadge status="spam" className="ml-2" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Message</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <p className="whitespace-pre-wrap break-words">{e.message}</p>
            </CardContent>
          </Card>

          {e.build && <BuildCard d={d} />}
          <NotesCard d={d} />
          <FilesCard d={d} />
        </div>

        <aside className="min-w-0 space-y-4">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 py-4 text-sm">
              <Field label="Email">
                <a className="data break-all hover:underline" href={`mailto:${e.email}`}>
                  {e.email}
                </a>
              </Field>
              {e.phone && (
                <Field label="Phone">
                  <a className="data hover:underline" href={`tel:${e.phone.replace(/[^\d+]/g, '')}`}>
                    {e.phone}
                  </a>
                </Field>
              )}
              {e.organisation && <Field label="Organisation">{e.organisation}</Field>}
              {e.region && <Field label="Region">{e.region}</Field>}
              {e.country && <Field label="Sent from">{e.country === 'IN' ? 'India' : e.country}</Field>}
              {e.page && <Field label="Page">{pagePath(e.page)}</Field>}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
              <CardTitle className="text-sm">Quotes</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/quotes/new?enquiry=${e.id}`}>
                  <Plus className="size-3.5" /> New
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              {d.quotes.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">No quote yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.quotes.map((q) => (
                    <li key={q.id}>
                      <Link to={`/quotes/${q.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-accent">
                        <span className="min-w-0">
                          <span className="data block text-sm">{q.number}</span>
                          <QuoteBadge status={q.status} />
                        </span>
                        <span className="data text-sm">{formatInr(q.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {d.related.length > 0 && (
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm">Earlier enquiries from {e.email}</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="divide-y divide-border">
                  {d.related.map((r) => (
                    <li key={r.id}>
                      <Link to={`/enquiries/${r.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-accent">
                        <span className="min-w-0 truncate">{r.category}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Clean up</p>
            {e.status !== 'spam' ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setStatus('spam')}>
                Mark as spam
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setStatus('new')}>
                Not spam
              </Button>
            )}
            <Button variant="outline" size="sm" className="w-full text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete for good
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Delete ${e.name}’s enquiry?`}
        description={
          <>
            The message, its notes and its {d.files.length} file(s) are removed for good. Quotes made from it are kept, without the link. Use this when someone asks to be forgotten, or for spam.
          </>
        }
        confirmLabel="Delete for good"
        onConfirm={() =>
          remove.mutate(e.id, {
            onSuccess: () => {
              toast.success('Enquiry deleted');
              void navigate('/enquiries', { replace: true });
            },
          })
        }
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

const pagePath = (page: string) => {
  try {
    return new URL(page).pathname;
  } catch {
    return page;
  }
};

function BuildCard({ d }: { d: EnquiryDetail }) {
  const b = d.enquiry.build!;
  // The link came from the visitor: it is a link only when it points at this site.
  let link: string | null = null;
  try {
    const u = new URL(b.link);
    if (u.origin === window.location.origin && (u.protocol === 'https:' || u.protocol === 'http:')) link = u.toString();
  } catch {
    link = null;
  }
  const extras = addOnList(b.quantities);
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
        <CardTitle className="text-sm">From the configurator</CardTitle>
        {link && (
          <Button asChild variant="ghost" size="sm">
            <a href={link} target="_blank" rel="noopener noreferrer">
              Open the build <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 py-4 text-sm sm:grid-cols-2">
        <Field label="Build">{buildHeadline(b.quantities)}</Field>
        <Field label="Estimate the visitor saw">
          <span className="data">{formatInr(b.total)}</span>
          {b.pricingVersion && <span className="text-xs text-muted-foreground"> · price list v{b.pricingVersion}</span>}
        </Field>
        <Field label="Foundation">{foundationLine(b.quantities)}</Field>
        <Field label="Add-ons">{extras.length ? extras.join(', ') : 'None'}</Field>
      </CardContent>
    </Card>
  );
}

function NotesCard({ d }: { d: EnquiryDetail }) {
  const add = useAddNote(d.enquiry.id);
  const del = useDeleteNote(d.enquiry.id);
  const [text, setText] = useState('');
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        <form
          className="space-y-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!text.trim()) return;
            add.mutate(text, { onSuccess: () => setText('') });
          }}
        >
          <Textarea value={text} onChange={(ev) => setText(ev.target.value)} rows={2} maxLength={4000} placeholder="What was said, what to do next. Only you see notes." aria-label="New note" />
          <Button type="submit" size="sm" disabled={!text.trim() || add.isPending}>
            Add note
          </Button>
        </form>
        {d.notes.length > 0 && (
          <ul className="space-y-2">
            {d.notes.map((n) => (
              <li key={n.id} className="group rounded-md bg-muted px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 whitespace-pre-wrap break-words text-sm">{n.body}</p>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0 opacity-60 hover:opacity-100" aria-label="Delete note" onClick={() => del.mutate(n.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.dwg,.dxf,.docx,.xlsx,.csv,.txt';

function FilesCard({ d }: { d: EnquiryDetail }) {
  const upload = useUploadFile(d.enquiry.id);
  const del = useDeleteFile(d.enquiry.id);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [doomed, setDoomed] = useState<{ id: string; name: string } | null>(null);

  const send = (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 10 MB.`);
        continue;
      }
      upload.mutate(f, { onSuccess: () => toast.success(`${f.name} uploaded`) });
    }
  };

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
        <CardTitle className="text-sm">Files</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => input.current?.click()} disabled={upload.isPending}>
          <Upload className="size-3.5" /> Upload
        </Button>
      </CardHeader>
      <CardContent
        className={cn('py-4', drag && 'bg-accent')}
        onDragOver={(ev) => {
          ev.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(ev) => {
          ev.preventDefault();
          setDrag(false);
          send(ev.dataTransfer.files);
        }}
      >
        <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(ev) => (send(ev.target.files), (ev.target.value = ''))} />
        {d.files.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Paperclip className="size-4" aria-hidden /> Drawings, site photos or a signed quote. Drop files here, up to 10 MB each.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {d.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(f.size)} · {formatDate(f.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button asChild variant="ghost" size="icon" className="size-8">
                    <a href={`/api/admin/files/${f.id}`} download={f.name} aria-label={`Download ${f.name}`}>
                      <Download className="size-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Delete ${f.name}`} onClick={() => setDoomed(f)}>
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {upload.isPending && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}
      </CardContent>
      <ConfirmDialog
        open={!!doomed}
        onOpenChange={(o) => !o && setDoomed(null)}
        destructive
        title={`Delete ${doomed?.name ?? 'this file'}?`}
        description="It is removed from storage for good."
        confirmLabel="Delete"
        onConfirm={() => doomed && del.mutate(doomed.id, { onSuccess: () => setDoomed(null) })}
      />
    </Card>
  );
}
