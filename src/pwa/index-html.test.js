import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { resolve } from 'node:path';

let doc;

beforeAll(() => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  doc = new JSDOM(html).window.document;
});

describe('index.html PWA meta tags', () => {
  it('links the web app manifest', () => {
    const link = doc.querySelector('link[rel="manifest"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBeTruthy();
  });

  it('sets a theme-color meta tag', () => {
    const meta = doc.querySelector('meta[name="theme-color"]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('content')).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('sets the viewport with viewport-fit=cover for iPhone notch handling', () => {
    const meta = doc.querySelector('meta[name="viewport"]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('content')).toMatch(/viewport-fit=cover/);
  });

  it('declares apple-mobile-web-app-capable', () => {
    const meta = doc.querySelector('meta[name="apple-mobile-web-app-capable"]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('content')).toBe('yes');
  });

  it('uses black-translucent status bar style on iOS', () => {
    const meta = doc.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('content')).toBe('black-translucent');
  });

  it('sets the iOS app title to "Arcade"', () => {
    const meta = doc.querySelector('meta[name="apple-mobile-web-app-title"]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('content')).toBe('Arcade');
  });

  it('links an apple-touch-icon', () => {
    const link = doc.querySelector('link[rel="apple-touch-icon"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toMatch(/\.png$/);
  });
});
