/**
 * PNG print art for Printify sticker mockup products (operator upload).
 *
 *   npm run print:sticker-printify-pngs
 *   npm run print:sticker-printify-pngs -- --url "https://humanity.llc/c/…?q=…"
 *   npm run print:sticker-printify-pngs -- --width 2400
 *
 * Writes site/images/merch/printify-art/sticker-live-object-updates-from-phone.{svg,png}
 *
 * Next: upload PNG to Printify → regenerate mockups → npm run printify:export-sticker-mockups
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { renderStickerPrintifyMockSvg } from "../../site/js/shop-sticker-printify-mock-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/** Live object on humanity.llc — override with --url or PRINT_PROOF_SCAN_URL */
const DEFAULT_SCAN_URL =
  "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

const OUT_DIR_REL = "site/images/merch/printify-art";
const FILE_BASE = "sticker-live-object-updates-from-phone";
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
 * @param {string} outPath
 * @param {number} canvasSize
 */
async function writeSvgPng(svg, outPath, canvasSize) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(canvasSize, canvasSize, { fit: "fill" })
    .png()
    .toFile(outPath);
}

async function main() {
  const scanUrl = readArg("--url") || process.env.PRINT_PROOF_SCAN_URL?.trim() || DEFAULT_SCAN_URL;
  const canvasSize = readWidth();
  const outDir = path.join(repoRoot, OUT_DIR_REL);
  mkdirSync(outDir, { recursive: true });

  const { renderFramedScanQrSvg } = await import("../src/resolver/scan-qr.ts");
  const framed = await renderFramedScanQrSvg(scanUrl);
  const mockSvg = renderStickerPrintifyMockSvg(framed, canvasSize);

  const svgPath = path.join(outDir, `${FILE_BASE}.svg`);
  const pngPath = path.join(outDir, `${FILE_BASE}.png`);
  writeFileSync(svgPath, mockSvg, "utf8");
  await writeSvgPng(mockSvg, pngPath, canvasSize);

  console.log(`Scan URL: ${scanUrl}`);
  console.log(`Canvas: ${canvasSize}×${canvasSize}px\n`);
  console.log(`✓ sticker mockup art`);
  console.log(`  ${pngPath}`);
  console.log(`  ${svgPath}`);
  console.log("\nUpload PNG to Printify → regenerate mockups → npm run printify:export-sticker-mockups");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
