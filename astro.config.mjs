import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// CONFIRM: production domain (see .claude/vee-build-notes.md, A8).
export default defineConfig({
  site: 'https://vee.build',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  server: { port: 4321 },
  devToolbar: { enabled: false },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});
