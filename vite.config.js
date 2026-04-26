import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { manifest } from './src/pwa/manifest.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      manifest,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-192x192.png',
        'maskable-512x512.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Disabled so dev does not register a SW (would break HMR).
        // Install affordance + manifest are validated against the prod build.
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
