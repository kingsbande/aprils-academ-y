import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // main.tsx calls registerSW() explicitly — turn off the
      // plugin's own auto-injected registration script so there's
      // exactly one registration path, not two running in parallel.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        scope: '/',
        name: "April's Academy Admin Portal",
        short_name: "April's Academy",
        description: 'Manage student registrations, records, and parent accounts.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA routes (e.g. /admin, /parent) must fall back to the
        // app shell instead of 404ing once the service worker is
        // controlling navigation requests.
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { port: 5173 },
})
