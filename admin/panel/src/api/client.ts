import type { ApiErrorBody } from '@shared';

/**
 * The only place the panel talks to the server. Same origin, the session
 * cookie goes with every request, and every refusal comes back as an
 * ApiError with the server's own words (and the fields to fix).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;
  /** Worth offering "Try again": the network, or the server, failed. */
  readonly retryable: boolean;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.retryable = status === 0 || status >= 500;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Fired when a request finds the sign-in has ended, so the panel can go back to the login screen. */
export const SIGNED_OUT = 'vee:signed-out';

export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined || isForm ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'The server could not be reached. Check the connection and try again.');
  }
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event(SIGNED_OUT));
  throw new ApiError(res.status, data?.error ?? `The server answered ${res.status}.`, data?.fields);
}

/** A file the server makes (CSV, JSON), saved under the name the server gives. */
export async function download(path: string, fallbackName: string) {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin' });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
    if (res.status === 401) window.dispatchEvent(new Event(SIGNED_OUT));
    throw new ApiError(res.status, data?.error ?? 'The download failed.');
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
