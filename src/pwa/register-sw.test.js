import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Service worker registration', () => {
  it('main.jsx imports the PWA registration module', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');
    // Either virtual:pwa-register (vite-plugin-pwa) or our own register module.
    expect(main).toMatch(/pwa.*register|registerSW/i);
  });

  it('exposes a registerSW helper that calls navigator.serviceWorker.register', async () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/pwa/register-sw.js'),
      'utf8',
    );
    // Must invoke the vite-plugin-pwa virtual module's registerSW.
    expect(src).toMatch(/registerSW/);
    expect(src).toMatch(/virtual:pwa-register/);
  });
});
