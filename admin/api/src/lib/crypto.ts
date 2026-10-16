/**
 * Passwords and tokens, with WebCrypto only (the same in the Worker and in
 * Node, where scripts/set-password.mjs writes the same format).
 *
 * A password is kept as `pbkdf2-sha256$<iterations>$<salt>$<hash>`, base64.
 * 100,000 iterations is the most the Workers runtime allows.
 */
export const PBKDF2_ITERATIONS = 100_000;

const enc = new TextEncoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

/** Compares in constant time: how long it takes says nothing about how much matched. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** A stand-in to verify against when there is no account, so a wrong email takes as long as a wrong password. */
export const DUMMY_HASH = `pbkdf2-sha256$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  const iterations = Number(iter);
  if (scheme !== 'pbkdf2-sha256' || !salt || !hash || !Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
  try {
    return sameBytes(await derive(password, unb64(salt), iterations), unb64(hash));
  } catch {
    return false;
  }
}

/** 256 random bits, for a session cookie. */
export const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

export async function sha256(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('');
}
