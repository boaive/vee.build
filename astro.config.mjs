import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import csp from './scripts/csp.mjs';

// CONFIRM: production domain (see .claude/vee-build-notes.md, A8).
export default defineConfig({
  site: 'https://vee.build',
  trailingSlash: 'always',
  // csp: the Content Security Policy, with the built pages' inline script hashes, into dist/_headers.
  integrations: [react(), sitemap(), csp()],
  server: { port: 4321 },
  devToolbar: { enabled: false },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
    // In development the API runs apart, under `wrangler dev` (admin/README.md); in production one Worker serves both.
    server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  },
});
