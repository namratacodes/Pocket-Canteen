// Generates the PWA icons from one SVG. Run once: node scripts/make-icons.mjs
// Replace the SVG below (or the PNGs in public/icons) whenever the team has a real logo.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');

// Full-bleed orange background, plate drawn inside the centre 80% so it survives
// Android's "maskable" cropping.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F97316"/>
  <circle cx="256" cy="256" r="150" fill="#FFFFFF"/>
  <circle cx="256" cy="256" r="104" fill="none" stroke="#F97316" stroke-width="14"/>
  <circle cx="256" cy="256" r="52" fill="#FED7AA"/>
</svg>`;

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon-180.png', 180],
];

await mkdir(outDir, { recursive: true });
for (const [name, size] of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outDir, name));
  console.log('created', name);
}