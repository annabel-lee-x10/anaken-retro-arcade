import { describe, it, expect } from 'vitest';
import { manifest } from './manifest.js';

describe('PWA manifest', () => {
  it('has the required identity fields', () => {
    expect(manifest.name).toBe('Anaken Retro Arcade');
    expect(manifest.short_name).toBe('Arcade');
    expect(manifest.description).toEqual(expect.any(String));
    expect(manifest.description.length).toBeGreaterThan(0);
  });

  it('declares standalone display from /', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
  });

  it('uses the Neon Arcade theme palette', () => {
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toBe('#000000');
    // Theme color should be a neon green or cyan from the Neon skin.
    expect(['#00ff88', '#00e0ff']).toContain(manifest.theme_color.toLowerCase());
  });

  it('includes 192 + 512 PNG icons with maskable variants', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);

    const required = [
      { size: '192x192', purpose: 'any' },
      { size: '512x512', purpose: 'any' },
      { size: '192x192', purpose: 'maskable' },
      { size: '512x512', purpose: 'maskable' },
    ];

    for (const { size, purpose } of required) {
      const match = manifest.icons.find(
        (icon) =>
          icon.sizes === size &&
          icon.type === 'image/png' &&
          (icon.purpose ?? 'any').split(/\s+/).includes(purpose),
      );
      expect(match, `missing ${purpose} icon at ${size}`).toBeTruthy();
      expect(match.src).toMatch(/^\/.+\.png$/);
    }
  });
});
