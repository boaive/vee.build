/**
 * Cloudflare Turnstile for the enquiry form: it tells a person from a bot,
 * usually without asking anything; only when Cloudflare is unsure does a
 * box appear to tick. Its script is fetched when a form mounts (the forms
 * are islands that hydrate near the viewport), never on first paint. The
 * site key is public: PUBLIC_TURNSTILE_SITE_KEY. The server checks every
 * token (admin/api) and refuses an enquiry without one.
 */
import { useEffect, useRef, type RefObject } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? '';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loading: Promise<void> | null = null;
function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Turnstile did not load'));
    };
    document.head.append(s);
  });
  return loading;
}

export interface TurnstileHandle {
  token: string;
  failed: boolean;
  reset: () => void;
}

export function useTurnstile(box: RefObject<HTMLDivElement | null>) {
  const handle = useRef<TurnstileHandle | null>(null);
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let id: string | null = null;
    let gone = false;
    const h: TurnstileHandle = {
      token: '',
      failed: false,
      reset: () => {
        h.token = '';
        if (id && window.turnstile) window.turnstile.reset(id);
      },
    };
    handle.current = h;
    load()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          action: 'enquiry',
          appearance: 'interaction-only',
          theme: 'auto',
          callback: (t: string) => {
            h.token = t;
            h.failed = false;
          },
          'expired-callback': () => {
            h.token = '';
          },
          'error-callback': () => {
            h.token = '';
            h.failed = true;
            box.current?.classList.add('is-asking');
          },
          // The box takes room in the form only while it asks for a tick.
          'before-interactive-callback': () => box.current?.classList.add('is-asking'),
          'after-interactive-callback': () => box.current?.classList.remove('is-asking'),
        });
      })
      .catch(() => {
        h.failed = true;
      });
    return () => {
      gone = true;
      if (id && window.turnstile) window.turnstile.remove(id);
      handle.current = null;
    };
  }, [box]);
  return handle;
}

/** The current token, waiting for it while Turnstile works (or the visitor ticks its box). Empty if it cannot be had. */
export async function turnstileToken(handle: RefObject<TurnstileHandle | null>): Promise<string> {
  for (let i = 0; i < 120; i++) {
    const h = handle.current;
    if (!h || h.failed) return '';
    if (h.token) return h.token;
    await new Promise((r) => setTimeout(r, 250));
  }
  return '';
}
