import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Resolved from this file rather than the process working directory: a relative
// alias silently breaks depending on where Vite was launched from, which made
// `vite dev` fail to resolve @ordo/* while `vite build` worked.
const here = fileURLToPath(new URL('.', import.meta.url));
const pkg = (...parts: string[]) => resolve(here, '../../packages', ...parts);

export default defineConfig({
  root: '.',
  // Env lives in the repository root so there is a single source of truth for
  // both PWAs. Without this, Vite only looks in apps/workspace and the
  // VITE_SUPABASE_* variables are undefined in the bundle.
  envDir: '../..',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Ordo workspace',
        short_name: 'Ordo',
        description: 'Платформа управления учебным расписанием',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    // Exact-match aliases are anchored with `$` so that a bare specifier such
    // as `@ordo/domain` never swallows a subpath import like
    // `@ordo/domain/scheduling`, which would resolve to `index.ts/scheduling`.
    // Subpaths are directory modules, so they map to `<module>/index.ts`.
    alias: [
      { find: /^@ordo\/domain$/, replacement: pkg('domain/src/index.ts') },
      { find: /^@ordo\/domain\/(.+)$/, replacement: pkg('domain/src/$1/index.ts') },
      { find: /^@ordo\/application$/, replacement: pkg('application/src/index.ts') },
      { find: /^@ordo\/application\/(.+)$/, replacement: pkg('application/src/$1/index.ts') },
      { find: /^@ordo\/infrastructure$/, replacement: pkg('infrastructure/src/index.ts') },
      { find: /^@ordo\/infrastructure\/(.+)$/, replacement: pkg('infrastructure/src/$1/index.ts') },
      { find: /^@ordo\/i18n$/, replacement: pkg('i18n/src/index.ts') },
      { find: /^@ordo\/i18n\/(.+)$/, replacement: pkg('i18n/src/$1/index.ts') },
      { find: /^@ordo\/types$/, replacement: pkg('types/src/index.ts') },
      { find: /^@ordo\/types\/(.+)$/, replacement: pkg('types/src/$1/index.ts') },
      { find: /^@ordo\/ui$/, replacement: pkg('ui/src/index.ts') },
      { find: /^@ordo\/ui\/(.+)$/, replacement: pkg('ui/src/$1/index.ts') },
    ],
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
});