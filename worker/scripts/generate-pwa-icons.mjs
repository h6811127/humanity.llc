/**
 * Generate PWA install icons — static brand-red device shell dot on white.
 * @see docs/PWA_INSTALL.md § Manifest contract
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../../site/icons");

const BRAND_RED = "#db1b43";
const BRAND_RING = "rgba(219, 27, 67, 0.35)";
const BACKGROUND = "#ffffff";

/**
 * @param {number} size
 * @param {{ maskable?: boolean }} opts
 */
function dotSvg(size, { maskable = false } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const dotR = size * (maskable ? 0.11 : 0.125);
  const ringR = dotR + size * 0.035;
  const ringStroke = size * 0.028;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND}"/>
  <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${BRAND_RING}" stroke-width="${ringStroke}"/>
  <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${BRAND_RED}"/>
</svg>`;
}

/** @param {number} size @param {string} filename @param {{ maskable?: boolean }} opts */
async function writeIcon(size, filename, opts = {}) {
  const svg = dotSvg(size, opts);
  const outPath = path.join(outDir, filename);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  wrote ${outPath}`);
}

await fs.promises.mkdir(outDir, { recursive: true });

console.log("Generating PWA icons (device shell brand dot)…");
await writeIcon(180, "pwa-apple-touch.png");
await writeIcon(192, "pwa-192.png");
await writeIcon(512, "pwa-512.png");
await writeIcon(512, "pwa-512-maskable.png", { maskable: true });
console.log("Done.");
