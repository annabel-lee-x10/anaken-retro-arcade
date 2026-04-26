import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// vite-plugin-pwa@1.2.0 (latest) caps its `vite` peer dependency at ^7.x,
// while this project runs vite ^8.x. npm refuses to install that combo
// without --legacy-peer-deps. We pin it in two places so a Vercel preview
// or production install never fails:
//   1. .npmrc — picked up by `npm install` everywhere (local + CI)
//   2. vercel.json `installCommand` — explicit, repo-tracked override that
//      survives even if Vercel's build runner ignores .npmrc for any reason
// If/when vite-plugin-pwa publishes a release whose peerDependencies
// include vite ^8, both pins can be removed and this test deleted.

describe('PWA install config (legacy-peer-deps)', () => {
  it('.npmrc pins legacy-peer-deps=true', () => {
    const npmrc = readFileSync(resolve(process.cwd(), '.npmrc'), 'utf8');
    expect(npmrc).toMatch(/^\s*legacy-peer-deps\s*=\s*true\s*$/m);
  });

  it('vercel.json overrides installCommand with --legacy-peer-deps', () => {
    const raw = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8');
    const config = JSON.parse(raw);
    expect(config.installCommand).toEqual(expect.any(String));
    expect(config.installCommand).toMatch(/--legacy-peer-deps/);
  });
});
