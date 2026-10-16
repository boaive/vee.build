/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Cloudflare Turnstile's site key: public, the same one the site's form uses. */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}
