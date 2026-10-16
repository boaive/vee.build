import { ENQUIRY_STATUS_LABELS, QUOTE_STATUS_LABELS, type EnquiryStatus, type QuoteStatus } from '@shared';
import { cn } from '@/lib/utils';

const enquiryDot: Record<EnquiryStatus, string> = {
  new: 'bg-signal',
  contacted: 'bg-info',
  quoted: 'bg-warn',
  won: 'bg-ok',
  lost: 'bg-muted-foreground',
  spam: 'bg-muted-foreground',
};

const quoteDot: Record<QuoteStatus, string> = {
  draft: 'bg-muted-foreground',
  sent: 'bg-warn',
  accepted: 'bg-ok',
  declined: 'bg-danger',
  expired: 'bg-muted-foreground',
};

/** A dot and a word: the colour never carries the meaning alone. */
function Badge({ dot, label, className }: { dot: string; label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', className)}>
      <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  );
}

export const StatusBadge = ({ status, className }: { status: EnquiryStatus; className?: string }) => <Badge dot={enquiryDot[status]} label={ENQUIRY_STATUS_LABELS[status]} className={className} />;

export const QuoteBadge = ({ status, className }: { status: QuoteStatus; className?: string }) => <Badge dot={quoteDot[status]} label={QUOTE_STATUS_LABELS[status]} className={className} />;
