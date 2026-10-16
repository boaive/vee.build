/**
 * The rates the configurator prices with. They start as the site's own
 * (data/pricing.ts), so the page renders and prices with no network at all,
 * and are replaced by the published price list from the admin panel
 * (`GET /api/pricing`) once it arrives. If the API cannot be reached, or
 * answers with anything that is not a whole price list, the site's own
 * rates stay. Fetched once a visit, when the configurator first needs it.
 */
import { useSyncExternalStore } from 'react';
import { pricing } from '../data/pricing';

type Widen<T> = T extends number ? number : T extends string ? T : { [K in keyof T]: Widen<T[K]> };
export type Rates = Widen<typeof pricing>;

const ENDPOINT = '/api/pricing';

let current: Rates = pricing;
let version: number | null = null;
const listeners = new Set<() => void>();

export const rates = (): Rates => current;
/** The published version in use, or null while the site's own rates are. */
export const ratesVersion = () => version;

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** The rates, re-rendering when the published ones arrive. */
export const useRates = (): Rates => useSyncExternalStore(subscribe, rates, () => pricing);

/** Same shape as the site's own list, every price a finite number of at least zero. */
function sameShape(model: unknown, v: unknown): boolean {
  if (typeof model === 'number') return typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (typeof model === 'string') return v === model;
  if (Array.isArray(model)) return Array.isArray(v) && v.length === model.length && model.every((m, i) => sameShape(m, v[i]));
  if (model && typeof model === 'object') return !!v && typeof v === 'object' && Object.entries(model).every(([k, m]) => sameShape(m, (v as Record<string, unknown>)[k]));
  return false;
}

let started = false;
export function loadRates() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetch(ENDPOINT, { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { version?: unknown; rates?: unknown } | null) => {
      if (!d || !sameShape(pricing, d.rates) || typeof d.version !== 'number') return;
      current = d.rates as Rates;
      version = d.version;
      listeners.forEach((fn) => fn());
    })
    .catch(() => {
      /* No API (a static preview, or offline): the site's own rates stay. */
    });
}
