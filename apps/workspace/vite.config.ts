import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
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
    alias: [
      { find: '@ordo/domain', replacement: '../../packages/domain/src/index.ts' },
      { find: /^@ordo\/domain\/(.+)$/, replacement: '../../packages/domain/src/$1.ts' },
      { find: '@ordo/application', replacement: '../../packages/application/src/index.ts' },
      { find: /^@ordo\/application\/(.+)$/, replacement: '../../packages/application/src/$1.ts' },
      { find: '@ordo/infrastructure', replacement: '../../packages/infrastructure/src/index.ts' },
      { find: /^@ordo\/infrastructure\/(.+)$/, replacement: '../../packages/infrastructure/src/$1.ts' },
      { find: '@ordo/types', replacement: '../../packages/types/src/index.ts' },
      { find: /^@ordo\/types\/(.+)$/, replacement: '../../packages/types/src/$1.ts' },
      { find: '@ordo/ui', replacement: '../../packages/ui/src/index.ts' },
      { find: /^@ordo\/ui\/(.+)$/, replacement: '../../packages/ui/src/$1.ts' },
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