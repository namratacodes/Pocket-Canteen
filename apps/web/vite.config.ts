import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const DAY = 24 * 60 * 60;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // a new version waits until the user taps Refresh
      injectRegister: false, // we register it ourselves in src/pwa/initPwa.ts
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        id: '/',
        name: 'Pocket Canteen',
        short_name: 'Pocket Canteen',
        description: 'Skip the queue. Pre-order campus food.',
        start_url: '/', // "/" sends each role to its own home (student, staff, admin)
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#F97316',
        background_color: '#FFFFFF',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'My orders', url: '/student/orders' },
          { name: 'Wallet', url: '/student/wallet' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/mockServiceWorker\.js$/],
        // App shell: scripts, styles, icons, sounds, and only the Latin fonts.
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,wav}', '**/*-latin-*.woff2'],
        globIgnores: ['**/mockServiceWorker.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Only GET requests are cached. POST/PATCH (orders, payments, verify, cancel) are never
        // cached or replayed later: they always go straight to the network.
        runtimeCaching: [
          {
            // Menu and canteen images
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // GET /canteens and GET /canteens/:id/menu. Network first (3s) so a sold-out toggle
            // shows straight away; falls back to the saved menu when offline or very slow.
            urlPattern: ({ request, url }) =>
              request.destination === '' &&
              !/\/(admin|analytics)\//.test(url.pathname) &&
              /\/canteens(\/[^/]+\/menu)?\/?$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-menu',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // GET /orders, /orders/:id and /wallet: fresh when online, last known state offline.
            // Emptied on logout (see clearUserCaches in src/pwa/initPwa.ts).
            urlPattern: ({ request, url }) =>
              request.destination === '' &&
              !/\/(admin|analytics)\//.test(url.pathname) &&
              /\/(orders(\/[^/]+)?|wallet)\/?$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-user',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
  },
} as any);