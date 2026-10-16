/**
 * Lets another section (the catalogue, the configurator) hand a category
 * and a first line to the contact form. The form may not have hydrated yet
 * when this is called, so the request is kept until the form asks for it.
 */
import type { Quantities } from '../../build/price';

/** The configurator's build as it was priced: sent with the enquiry for the admin panel's quote. */
export interface PrefillBuild {
  link: string;
  quantities: Quantities;
  total: number;
  /** The published price list it was priced at, or null on the site's own rates. */
  pricingVersion: number | null;
}

export interface EnquirePrefill {
  category?: string;
  message?: string;
  build?: PrefillBuild;
}

const EVENT = 'vee:enquire';
let pending: EnquirePrefill | null = null;

export function requestEnquiry(detail: EnquirePrefill) {
  pending = detail;
  window.dispatchEvent(new CustomEvent<EnquirePrefill>(EVENT, { detail }));
}

/** Calls `apply` now if a request is waiting, and again for each later one. */
export function onEnquiry(apply: (detail: EnquirePrefill) => void): () => void {
  if (pending) apply(pending);
  const handler = (e: Event) => apply((e as CustomEvent<EnquirePrefill>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
