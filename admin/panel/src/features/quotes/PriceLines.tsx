import { displayLineAmount, type PriceLine } from '@shared';
import { formatInr } from '@/lib/format';

/** A bill as the configurator shows it: lines to ₹100, the total to ₹1,000. */
export function PriceLines({ lines, total, perSqft, compact = false }: { lines: PriceLine[]; total: number; perSqft: number; compact?: boolean }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">
        {lines.map((l) => (
          <tr key={l.id}>
            <td className="py-2 pr-3">
              {l.label}
              <span className="block text-xs text-muted-foreground">{l.detail}</span>
            </td>
            <td className="data py-2 text-right align-top">{formatInr(displayLineAmount(l.amount))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-border-strong">
          <td className="pt-3 font-medium">
            Total
            {!compact && <span className="block text-xs font-normal text-muted-foreground">Indicative, ex-works, excluding GST</span>}
          </td>
          <td className="data pt-3 text-right align-top text-lg font-medium">
            {formatInr(total)}
            <span className="block text-xs font-normal text-muted-foreground">{formatInr(perSqft)} / sq.ft.</span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
