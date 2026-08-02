/**
 * Generates the PWA icons in public/icons from a single SVG mark.
 * Usage: node scripts/generate-icons.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons"
);

/**
 * App icon: brand green background with a white leaf mark.
 * `rounded` adds a rounded-rect mask (Android-style app icon);
 * maskable icons must be full-bleed (no rounding).
 */
function svg({ rounded }) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="${rounded ? 230 : 0}" fill="#006e2f"/>
  <path d="M256 768 C256 512 512 256 768 256 C768 512 512 768 256 768 Z" fill="#ffffff"/>
  <path d="M256 768 C384 640 512 512 768 256" stroke="#006e2f" stroke-width="44" stroke-linecap="round" fill="none"/>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, rounded: true },
  { file: "icon-512.png", size: 512, rounded: true },
  { file: "icon-maskable-192.png", size: 192, rounded: false },
  { file: "icon-maskable-512.png", size: 512, rounded: false },
  { file: "apple-touch-icon.png", size: 180, rounded: true },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const target of targets) {
  await sharp(Buffer.from(svg(target)))
    .resize(target.size, target.size)
    .png()
    .toFile(join(OUT_DIR, target.file));
  console.log(`Generated ${target.file}`);
}
