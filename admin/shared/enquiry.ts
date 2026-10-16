import { z } from 'zod';
import { BuildQuantities } from './pricing-calc';

/**
 * One status for an enquiry, from first message to the answer. A quote
 * moves it on by itself: sending one makes it `quoted`, an accepted one
 * makes it `won`. Spam is kept out of every list unless asked for.
 */
export const ENQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'spam'] as const;
export const EnquiryStatus = z.enum(ENQUIRY_STATUSES);
export type EnquiryStatus = z.infer<typeof EnquiryStatus>;

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
  spam: 'Spam',
};

/** Still being worked on: what the overview counts as open. */
export const OPEN_STATUSES: readonly EnquiryStatus[] = ['new', 'contacted', 'quoted'];

/** The same test the site's form makes, so nothing the form accepts is refused here. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** What the configurator adds when "Get a quote" filled the form: the build as it was priced. */
export const SubmittedBuild = z.object({
  /** The configurator's share link, which opens the same build. */
  link: z.url({ protocol: /^https?$/ }).max(2000),
  quantities: BuildQuantities,
  /** What the visitor was shown. Kept as a record; quotes are always priced again. */
  total: z.number().finite().nonnegative().max(1e10),
  pricingVersion: z.number().int().positive().nullable(),
});
export type SubmittedBuild = z.infer<typeof SubmittedBuild>;

/**
 * What the site's enquiry form posts (src/components/forms/EnquiryForm.tsx).
 * `company_website` is the form's honeypot: a person never fills it.
 */
export const EnquirySubmission = z.object({
  form: z.enum(['contact', 'partnership']),
  name: text(200).min(1, 'Enter your name.'),
  email: text(254).regex(EMAIL_PATTERN, 'Enter a valid email address.'),
  category: optional(120),
  partnerType: optional(120),
  message: text(5000).min(1, 'Add a few details.'),
  page: z.string().max(2000).default(''),
  phone: optional(60),
  organisation: optional(200),
  region: optional(200),
  build: SubmittedBuild.optional(),
  turnstileToken: z.string().max(4096).default(''),
  company_website: z.string().max(500).optional(),
});
export type EnquirySubmission = z.infer<typeof EnquirySubmission>;

export interface Enquiry {
  id: string;
  createdAt: string;
  updatedAt: string;
  form: 'contact' | 'partnership';
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  region: string | null;
  /** The project category, or the partner type on a partnership enquiry. */
  category: string;
  message: string;
  /** The page the form was sent from. */
  page: string;
  build: SubmittedBuild | null;
  status: EnquiryStatus;
  readAt: string | null;
  /** Two-letter country code, from Cloudflare. */
  country: string | null;
}

export interface EnquiryListItem {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  category: string;
  form: 'contact' | 'partnership';
  status: EnquiryStatus;
  unread: boolean;
  hasBuild: boolean;
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export const EnquiryPatch = z.object({
  status: EnquiryStatus.optional(),
  unread: z.boolean().optional(),
});
export type EnquiryPatch = z.infer<typeof EnquiryPatch>;

export const NewNote = z.object({ body: z.string().trim().min(1, 'Write something first.').max(4000) });
export type NewNote = z.infer<typeof NewNote>;

export const EnquiryQuery = z.object({
  /** `open` is new, contacted and quoted together. */
  status: z.union([EnquiryStatus, z.literal('open'), z.literal('all')]).default('open'),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type EnquiryQuery = z.input<typeof EnquiryQuery>;
