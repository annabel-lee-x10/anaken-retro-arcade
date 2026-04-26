// Web App Manifest config consumed by vite-plugin-pwa at build time.
// Theme color is the Neon Arcade skin's primary phosphor green
// (matches --accent in src/skins/skins.css under [data-skin='neon']).

export const manifest = {
  name: 'Anaken Retro Arcade',
  short_name: 'Arcade',
  description:
    'A handheld retro arcade controller in your browser — Tetris and three switchable skins, mobile-first.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#00ff88',
  background_color: '#000000',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/maskable-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
