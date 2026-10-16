import { z } from 'zod';
import { BuildQuantities } from './pricing-calc';
import type { PricingSet } from './pricing';

/**
 * A quote's life. A draft is always priced at the published rates; once
 * sent, it keeps the rates it was sent with. To change a sent quote, move it
 * back to draft: it is priced again when it is saved.
 */
export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'] as const;
export const QuoteStatus = z.enum(QUOTE_STATUSES);
export type QuoteStatus = z.infer<typeof QuoteStatus>;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

/** The moves the owner can make. `expired` is set by the daily job when the validity date passes. */
export const QUOTE_MOVES: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'declined', 'draft'],
  accepted: ['sent'],
  declined: ['sent'],
  expired: ['draft'],
};
export const canMoveQuote = (from: QuoteStatus, to: QuoteStatus) => QUOTE_MOVES[from].includes(to);

export const PriceLine = z.object({ id: z.string(), label: z.string(), detail: z.string(), amount: z.number().nonnegative() });
export type PriceLine = z.infer<typeof PriceLine>;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.');

export const QuoteCustomer = z.object({
  name: z.string().trim().min(1, 'Enter the customer’s name.').max(200),
  email: z.union([z.literal(''), z.string().trim().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address.')]),
  phone: z.string().trim().max(60),
  address: z.string().trim().max(500),
});
export type QuoteCustomer = z.infer<typeof QuoteCustomer>;

/** What the owner writes on a draft. The price is always worked out on the server. */
export const QuoteInput = z.object({
  enquiryId: z.string().max(64).nullable().default(null),
  title: z.string().trim().min(1, 'Give the quote a title.').max(160),
  customer: QuoteCustomer,
  quantities: BuildQuantities,
  /** The last day the quote holds, "YYYY-MM-DD". */
  validUntil: day,
  terms: z.string().trim().min(1, 'Terms cannot be empty.').max(4000),
  notes: z.string().trim().max(4000).default(''),
});
export type QuoteInput = z.input<typeof QuoteInput>;

export const QuoteStatusInput = z.object({ status: QuoteStatus });

export interface Quote {
  id: string;
  /** "VQ-2026-0001". */
  number: string;
  enquiryId: string | null;
  title: string;
  customer: QuoteCustomer;
  status: QuoteStatus;
  quantities: BuildQuantities;
  /** The rates the quote was priced at. */
  rates: PricingSet;
  pricingVersion: number;
  lines: PriceLine[];
  total: number;
  perSqft: number;
  validUntil: string;
  terms: string;
  /** Internal: never printed. */
  notes: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}

export interface QuoteListItem {
  id: string;
  number: string;
  title: string;
  customerName: string;
  enquiryId: string | null;
  status: QuoteStatus;
  total: number;
  validUntil: string;
  updatedAt: string;
}

export const quoteNumber = (year: number, n: number) => `VQ-${year}-${String(n).padStart(4, '0')}`;
