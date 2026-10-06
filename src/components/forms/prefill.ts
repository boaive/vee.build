/**
 * Lets another section (the catalogue) hand a category and a first line to
 * the contact form. The form may not have hydrated yet when this is called,
 * so the request is kept until the form asks for it.
 */
export interface EnquirePrefill {
  category?: string;
  message?: string;
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
