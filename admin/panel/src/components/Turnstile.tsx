import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Cloudflare Turnstile: shows nothing unless Cloudflare wants a person to
 * tick a box. `onToken` gets a fresh one-use token; after each attempt the
 * caller resets the widget for the next.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
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

export const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

export interface TurnstileHandle {
  reset: () => void;
}

export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string) => void; onError?: (message: string) => void; action?: string }>(function Turnstile({ onToken, onError, action }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef({ onToken, onError });
  cb.current = { onToken, onError };

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current.onToken('');
      if (id.current && window.turnstile) window.turnstile.reset(id.current);
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) {
      cb.current.onError?.('Sign-in is not set up: the Turnstile site key is missing (PUBLIC_TURNSTILE_SITE_KEY).');
      return;
    }
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          action,
          appearance: 'interaction-only',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (t: string) => cb.current.onToken(t),
          'expired-callback': () => cb.current.onToken(''),
          'error-callback': () => {
            cb.current.onToken('');
            cb.current.onError?.('The check that you are a person could not run. Reload the page and try again.');
          },
        });
      })
      .catch(() => cb.current.onError?.('The check that you are a person could not load. Check the connection and reload.'));
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [action]);

  return <div ref={box} className="min-h-0 empty:hidden" />;
});
