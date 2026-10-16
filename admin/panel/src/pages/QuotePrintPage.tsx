import { FOUNDATION_HEIGHTS, SHELL_SQFT, displayLineAmount, type Quote, type Settings } from '@shared';
import { Printer } from 'lucide-react';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { useQuote, useSettings } from '@/api/hooks';
import { ErrorState, LoadingRows } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { formatDate, formatInr } from '@/lib/format';

/**
 * The customer's copy, as an A4 page in the brand. "Save as PDF" in the
 * browser's print dialog gives the PDF to send.
 */
export default function QuotePrintPage() {
  const { id = '' } = useParams();
  const q = useQuote(id);
  const settings = useSettings();
  if (q.data && settings.data) return <Document q={q.data} business={settings.data.settings.business} />;
  const error = q.error ?? settings.error;
  return <div className="mx-auto max-w-3xl p-8">{error ? <ErrorState error={error} onRetry={() => void q.refetch()} /> : <LoadingRows rows={8} />}</div>;
}

function Document({ q, business }: { q: Quote; business: Settings['business'] }) {
  const from = [business.name, business.address, business.phone, business.email, business.gstin && `GSTIN ${business.gstin}`].filter(Boolean);
  const qty = q.quantities;
  const shells = [qty.shells.A && `${qty.shells.A} × Shell A`, qty.shells.B && `${qty.shells.B} × Shell B`].filter(Boolean).join(', ');
  const floors = qty.stairFloors + 1;
  const draft = q.status === 'draft';

  // The file name the print dialog offers for "Save as PDF".
  useEffect(() => {
    const before = document.title;
    document.title = `${q.number} ${q.title}`;
    return () => {
      document.title = before;
    };
  }, [q.number, q.title]);

  return (
    <div className="min-h-dvh bg-[#e8e5de] py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-[#3b3e43]">Choose “Save as PDF” in the print dialog to get a PDF to send.</p>
        <Button className="bg-[#111214] text-[#f7f5f0] hover:bg-[#111214]/85" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* Always on paper, in ink and vermilion, whatever the panel's theme. */}
      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[14mm] text-[#111214] shadow-md print:max-w-none print:p-0 print:shadow-none" style={{ fontSize: '10.5pt' }}>
        {draft && <p className="mb-6 border border-[#b5370f] px-3 py-1.5 text-center text-[8.5pt] font-semibold uppercase tracking-[0.12em] text-[#b5370f]">Draft · not yet issued</p>}
        <header className="flex items-start justify-between gap-6 border-b border-[#111214]/25 pb-5">
          <div>
            <p className="text-[20pt] font-extrabold leading-none tracking-tight" style={{ fontStretch: '112%' }}>
              VEE.BUILD
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[7.5pt] text-[#6b6e74]">
              Powered by <img src="/admin/brand/hemisphere-one.png" alt="Hemisphere One" className="h-[14px] w-auto" />
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8pt] uppercase tracking-[0.12em] text-[#b5370f]">Quotation</p>
            <p className="font-mono text-[13pt] font-medium">{q.number}</p>
            <p className="font-mono text-[8.5pt] text-[#3b3e43]">{formatDate(q.sentAt ?? q.updatedAt)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-5">
          <div>
            <p className="font-mono text-[7.5pt] uppercase tracking-[0.12em] text-[#6b6e74]">Prepared for</p>
            <p className="mt-1 font-semibold">{q.customer.name}</p>
            {q.customer.address && <p className="whitespace-pre-line">{q.customer.address}</p>}
            {q.customer.email && <p className="font-mono text-[8.5pt] text-[#3b3e43]">{q.customer.email}</p>}
            {q.customer.phone && <p className="font-mono text-[8.5pt] text-[#3b3e43]">{q.customer.phone}</p>}
          </div>
          <div>
            <p className="font-mono text-[7.5pt] uppercase tracking-[0.12em] text-[#6b6e74]">Build</p>
            <p className="mt-1 font-semibold">{q.title}</p>
            <p>{shells}</p>
            <p className="font-mono text-[8.5pt] text-[#3b3e43]">
              {qty.shells.A * SHELL_SQFT.A + qty.shells.B * SHELL_SQFT.B} sq.ft. nominal · {floors === 1 ? 'single floor' : `${floors} floors`} · {FOUNDATION_HEIGHTS[qty.foundation.h]} mm {qty.foundation.type === 'plinth' ? 'footings + L plinth' : 'footings'}
            </p>
          </div>
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#111214]">
              <th className="py-2 text-left font-mono text-[7.5pt] font-normal uppercase tracking-[0.12em] text-[#6b6e74]">Item</th>
              <th className="py-2 text-right font-mono text-[7.5pt] font-normal uppercase tracking-[0.12em] text-[#6b6e74]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((l) => (
              <tr key={l.id} className="break-inside-avoid border-b border-[#111214]/12">
                <td className="py-2 pr-4">
                  {l.label}
                  <span className="block font-mono text-[8pt] text-[#6b6e74]">{l.detail}</span>
                </td>
                <td className="py-2 text-right align-top font-mono">{formatInr(displayLineAmount(l.amount))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 align-top">
                <p className="font-semibold">Total</p>
                <p className="text-[8.5pt] text-[#6b6e74]">Indicative, ex-works, excluding GST. Lines rounded to ₹100, total to ₹1,000.</p>
              </td>
              <td className="pt-4 text-right align-top">
                <p className="font-mono text-[16pt] font-medium">{formatInr(q.total)}</p>
                <p className="font-mono text-[8.5pt] text-[#6b6e74]">{formatInr(q.perSqft)} / sq.ft.</p>
              </td>
            </tr>
          </tfoot>
        </table>

        <section className="mt-8 break-inside-avoid border-t border-[#111214]/25 pt-4 text-[9pt]">
          <p className="font-mono text-[7.5pt] uppercase tracking-[0.12em] text-[#6b6e74]">Terms</p>
          <p className="mt-1 whitespace-pre-line">{q.terms}</p>
          <p className="mt-2">
            Valid until <span className="font-mono">{formatDate(q.validUntil)}</span>.
          </p>
        </section>

        {from.length > 0 && <p className="mt-8 whitespace-pre-line text-[8.5pt] text-[#3b3e43]">{from.join(' · ')}</p>}
        <footer className="mt-10 flex justify-between border-t border-[#111214]/12 pt-2 font-mono text-[7.5pt] text-[#6b6e74]">
          <span>
            {q.number} · price list v{q.pricingVersion}
          </span>
          <span>VEE.BUILD</span>
        </footer>
      </article>
    </div>
  );
}
