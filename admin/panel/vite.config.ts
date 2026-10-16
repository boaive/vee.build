import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

const here = import.meta.dirname;

/**
 * The panel is served by the site's Worker at /admin, so it builds into the
 * site's dist/admin (after `astro build`, which empties dist). In
 * development it runs on :5174 and sends /api to `wrangler dev` on :8787.
 * PUBLIC_TURNSTILE_SITE_KEY is read from the repo's .env, the same one the
 * site uses.
 */
export default defineConfig({
  root: here,
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(here, 'src'), '@shared': path.resolve(here, '../shared') } },
  envDir: path.resolve(here, '../..'),
  envPrefix: ['VITE_', 'PUBLIC_'],
  server: { port: 5174, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8787', '/favicon.svg': 'http://127.0.0.1:8787' } },
  // The panel is behind a sign-in and loads once: one bundle (about 230 kB gzip) is fine.
  build: { outDir: path.resolve(here, '../../dist/admin'), emptyOutDir: true, chunkSizeWarningLimit: 1000 },
});
