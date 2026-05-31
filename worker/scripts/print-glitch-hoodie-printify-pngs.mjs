/**
 * PNG print art for Printify mockup products (operator upload).
 *
 *   npm run print:glitch-hoodie-printify-pngs
 *   npm run print:glitch-hoodie-printify-pngs -- --url "https://humanity.llc/c/…?q=…"
 *   npm run print:glitch-hoodie-printify-pngs -- --width 2400
 *
 * Writes:
 *   glitch-hoodie-live-object-white-card.png — full white card + white QR quiet zone
 *   glitch-hoodie-live-object-transparent-card.png — no outer card; white behind QR modules
 *   glitch-hoodie-live-object-transparent-qr.png — no outer card; transparent QR quiet zone
 *     (sweatshirt color shows through the code background — for Printify mockup upload)
 * (+ matching .svg siblings)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/** Live object on humanity.llc — override with --url or PRINT_PROOF_SCAN_URL */
const DEFAULT_SCAN_URL =
  "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

const OUT_DIR_REL = "site/images/merch/printify-art";
const DEFAULT_PNG_WIDTH = 2400;

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1]?.trim() || null;
}

function readWidth() {
  const raw = readArg("--width") || process.env.PRINTIFY_ART_PNG_WIDTH?.trim();
  const n = raw ? Number(raw) : DEFAULT_PNG_WIDTH;
  return Number.isFinite(n) && n >= 400 ? Math.round(n) : DEFAULT_PNG_WIDTH;
}

/**
 * @param {string} svg
 * @param {number} targetWidth
 */
function svgDimensions(svg, targetWidth) {
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = match ? Number(match[1]) : 400;
  const h = match ? Number(match[2]) : 500;
  const scale = targetWidth / w;
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
  };
}

/**
 * @param {string} svg
 * @param {string} outPath
 * @param {number} targetWidth
 */
async function writeSvgPng(svg, outPath, targetWidth) {
  const { width, height } = svgDimensions(svg, targetWidth);
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(width, height, { fit: "fill" })
    .png()
    .toFile(outPath);
}

async function main() {
  const scanUrl = readArg("--url") || process.env.PRINT_PROOF_SCAN_URL?.trim() || DEFAULT_SCAN_URL;
  const pngWidth = readWidth();
  const outDir = path.join(repoRoot, OUT_DIR_REL);
  mkdirSync(outDir, { recursive: true });

  const { renderFramedScanQrSvg } = await import("../src/resolver/scan-qr.ts");

  const variants = [
    {
      id: "white-card",
      fileBase: "glitch-hoodie-live-object-white-card",
      frameBackground: "full",
      framePadding: "tight",
      transparentQrQuietZone: false,
    },
    {
      id: "transparent-card",
      fileBase: "glitch-hoodie-live-object-transparent-card",
      frameBackground: "transparent",
      framePadding: "tight",
      transparentQrQuietZone: false,
    },
    {
      id: "transparent-qr",
      fileBase: "glitch-hoodie-live-object-transparent-qr",
      frameBackground: "transparent",
      framePadding: "tight",
      transparentQrQuietZone: true,
    },
    {
      id: "transparent-qr-red-finder",
      fileBase: "glitch-hoodie-live-object-transparent-qr-red-finder",
      frameBackground: "transparent",
      framePadding: "tight",
      transparentQrQuietZone: true,
      skipFinderLogo: true,
    },
  ];

  console.log(`Scan URL: ${scanUrl}`);
  console.log(`PNG width: ${pngWidth}px\n`);

  for (const variant of variants) {
    const svg = await renderFramedScanQrSvg(scanUrl, {
      frameBackground: variant.frameBackground,
      framePadding: variant.framePadding,
      transparentQrQuietZone: variant.transparentQrQuietZone,
      skipFinderLogo: variant.skipFinderLogo === true,
    });
    const svgPath = path.join(outDir, `${variant.fileBase}.svg`);
    const pngPath = path.join(outDir, `${variant.fileBase}.png`);
    writeFileSync(svgPath, svg, "utf8");
    await writeSvgPng(svg, pngPath, pngWidth);
    const dims = svgDimensions(svg, pngWidth);
    console.log(`✓ ${variant.id}`);
    console.log(`  ${pngPath} (${dims.width}×${dims.height})`);
    console.log(`  ${svgPath}`);
  }

  console.log("\nUpload each PNG to a separate Printify product, regenerate mockups, then npm run printify:export-glitch-mockups");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
