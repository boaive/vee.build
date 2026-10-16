/**
 * What the API answers, screen by screen. The panel reads these; the
 * Worker builds them. Inputs are the zod schemas next to each record.
 */
import type { Enquiry, EnquiryListItem, EnquiryStatus, Note, StoredFile } from './enquiry';
import type { PricingSet, PricingVersion } from './pricing';
import type { Quote, QuoteListItem } from './quote';
import type { Settings } from './settings';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Me {
  email: string;
  /** When this sign-in ends if nothing is done. */
  expiresAt: string;
}

export interface Overview {
  counts: {
    /** Not yet answered. */
    new: number;
    /** New, contacted and quoted. */
    open: number;
    /** Quotes out with the customer, and what they add up to. */
    quotesOut: number;
    quotesOutValue: number;
    /** Won in the last 30 days. */
    won30: number;
    /** Received in the last 30 days, spam left out. */
    received30: number;
  };
  needsReply: EnquiryListItem[];
  quotesOut: QuoteListItem[];
}

export interface EnquiryDetail {
  enquiry: Enquiry;
  notes: Note[];
  files: StoredFile[];
  quotes: QuoteListItem[];
  /** Other enquiries from the same email address. */
  related: EnquiryListItem[];
}

export interface EnquiryCounts {
  byStatus: Record<EnquiryStatus, number>;
}

export interface PricingState {
  current: PricingVersion;
  history: PricingVersion[];
}

/** What the public site reads. */
export interface PublicPricing {
  version: number;
  rates: PricingSet;
  publishedAt: string;
}

export interface SettingsState {
  settings: Settings;
  /** Where notification emails go: set in the Cloudflare config, not here. Null when email is not set up. */
  notifyTo: string | null;
}

export interface ActivityItem {
  id: number;
  at: string;
  action: string;
  detail: string | null;
  ip: string | null;
  country: string | null;
}

export interface SessionItem {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  country: string | null;
  userAgent: string | null;
  current: boolean;
}

export interface SecurityState {
  sessions: SessionItem[];
  activity: ActivityItem[];
  passwordChangedAt: string;
}

export type { Quote };

/** The error body of every refused request. `fields` names the inputs to fix. */
export interface ApiErrorBody {
  error: string;
  fields?: Record<string, string>;
}
