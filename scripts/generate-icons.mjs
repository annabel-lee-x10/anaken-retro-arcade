// Generates the PWA icon set from inline SVG markup.
// Output: public/pwa-192x192.png, public/pwa-512x512.png,
//         public/maskable-192x192.png, public/maskable-512x512.png,
//         public/apple-touch-icon.png (180x180).
//
// The mark is a stylised retro gamepad: rounded body, D-pad cross on the left,
// four jewel-tone face buttons on the right. Maskable variants pad the mark
// inside the inner 80% safe zone so platform masks (circle/squircle) don't
// crop content.

import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

const COLORS = {
  bg: '#050708',
  body: '#0a0d10',
  bodyHi: '#1a1f25',
  ringNeon: '#00ff88',
  ringCyan: '#00e0ff',
  faceA: '#ff2d6e',
  faceB: '#ffe800',
  faceX: '#00d4ff',
  faceY: '#00ff88',
  dpad: '#0a0d10',
  dpadEdge: '#00ff88',
};

// scale: how much of the canvas the mark occupies (1.0 = full bleed).
// regular = 0.96 (small bleed margin). maskable = 0.72 (sits inside safe zone).
function buildSvg({ size, scale, withBackground }) {
  const inner = Math.round(size * scale);
  const offset = Math.round((size - inner) / 2);
  const r = inner; // viewBox uses inner units

  // Body: pill-shaped controller. Use rounded rect with strong neon ring.
  // D-pad: cross at ~30% x, 50% y. Buttons: 2x2 grid at ~70% x, 50% y.
  const bodyR = Math.round(r * 0.18);
  const bodyStrokeW = Math.max(2, Math.round(r * 0.025));
  const dpadCx = r * 0.32;
  const dpadCy = r * 0.55;
  const dpadArm = r * 0.085;
  const dpadLen = r * 0.22;
  const btnR = r * 0.07;
  const btnGroupCx = r * 0.7;
  const btnGroupCy = r * 0.55;
  const btnSpread = r * 0.13;

  const bg = withBackground
    ? `<rect width="${size}" height="${size}" fill="${COLORS.bg}"/>`
    : '';

  // For maskable, paint the full canvas with the body color so the mask has
  // something to bleed into.
  const maskableBleed = !withBackground
    ? `<rect width="${size}" height="${size}" fill="${COLORS.bg}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.bodyHi}"/>
      <stop offset="100%" stop-color="${COLORS.body}"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${Math.max(1, Math.round(r * 0.012))}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${maskableBleed}
  ${bg}
  <g transform="translate(${offset} ${offset})">
    <rect x="${bodyStrokeW}" y="${bodyStrokeW}" width="${r - bodyStrokeW * 2}" height="${r - bodyStrokeW * 2}"
      rx="${bodyR}" ry="${bodyR}"
      fill="url(#bodyGrad)"
      stroke="${COLORS.ringNeon}" stroke-width="${bodyStrokeW}"
      filter="url(#glow)"/>
    <g fill="${COLORS.dpadEdge}" filter="url(#glow)">
      <rect x="${dpadCx - dpadArm}" y="${dpadCy - dpadLen}" width="${dpadArm * 2}" height="${dpadLen * 2}" rx="${dpadArm * 0.3}"/>
      <rect x="${dpadCx - dpadLen}" y="${dpadCy - dpadArm}" width="${dpadLen * 2}" height="${dpadArm * 2}" rx="${dpadArm * 0.3}"/>
    </g>
    <g filter="url(#glow)">
      <circle cx="${btnGroupCx}" cy="${btnGroupCy - btnSpread}" r="${btnR}" fill="${COLORS.faceB}"/>
      <circle cx="${btnGroupCx + btnSpread}" cy="${btnGroupCy}" r="${btnR}" fill="${COLORS.faceA}"/>
      <circle cx="${btnGroupCx}" cy="${btnGroupCy + btnSpread}" r="${btnR}" fill="${COLORS.faceY}"/>
      <circle cx="${btnGroupCx - btnSpread}" cy="${btnGroupCy}" r="${btnR}" fill="${COLORS.faceX}"/>
    </g>
  </g>
</svg>`;
}

async function renderPng(svg, outPath) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log('wrote', outPath);
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  // Regular (any-purpose) icons: small bleed margin, transparent edges where
  // browser draws background fill.
  await renderPng(
    buildSvg({ size: 192, scale: 0.96, withBackground: true }),
    resolve(publicDir, 'pwa-192x192.png'),
  );
  await renderPng(
    buildSvg({ size: 512, scale: 0.96, withBackground: true }),
    resolve(publicDir, 'pwa-512x512.png'),
  );

  // Maskable: mark sits inside inner 80% safe zone, full-bleed background.
  await renderPng(
    buildSvg({ size: 192, scale: 0.72, withBackground: false }),
    resolve(publicDir, 'maskable-192x192.png'),
  );
  await renderPng(
    buildSvg({ size: 512, scale: 0.72, withBackground: false }),
    resolve(publicDir, 'maskable-512x512.png'),
  );

  // Apple touch icon — iOS uses opaque 180x180; mark with bleed background.
  await renderPng(
    buildSvg({ size: 180, scale: 0.96, withBackground: true }),
    resolve(publicDir, 'apple-touch-icon.png'),
  );

  // Save the source SVG for reference / debugging.
  await writeFile(
    resolve(publicDir, 'icon-source.svg'),
    buildSvg({ size: 512, scale: 0.96, withBackground: true }),
    'utf8',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
