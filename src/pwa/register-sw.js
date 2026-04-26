// Service worker registration via vite-plugin-pwa's virtual module.
// In dev, this is a no-op unless devOptions.enabled is set in vite.config.js.
// In production, registerSW() calls navigator.serviceWorker.register on the
// generated /sw.js (Workbox precaches the build output keyed by hash).

import { registerSW } from 'virtual:pwa-register';

export function registerArcadeSW() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisterError(err) {
      console.error('[pwa] service worker registration failed', err);
    },
  });
}
