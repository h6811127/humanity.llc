/**
 * Write a production-path Glitch hoodie print SVG for operator / physical QA.
 *
 *   npm run print:glitch-hoodie-proof
 *   npm run print:glitch-hoodie-proof -- --out /tmp/glitch-hoodie-proof.svg
 *
 * Uses the same renderer as Printify upload (tight + full frame, back placeholder
 * is applied at ephemeral product create — not in this SVG file).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_SCAN_URL =
  "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1]?.trim() || null;
}

async function main() {
  const scanUrl = readArg("--url") || process.env.PRINT_PROOF_SCAN_URL?.trim() || DEFAULT_SCAN_URL;
  const outRel = readArg("--out") || "site/data/fixtures/glitch-hoodie-print-proof.svg";
  const outPath = path.isAbsolute(outRel) ? outRel : path.join(repoRoot, outRel);

  const { GLITCH_HOODIE_TEMPLATE_ID } = await import("../src/print/print-catalog.ts");
  const { renderPrintArtworkFromScanUrl } = await import("../src/resolver/scan-qr.ts");

  const svg = await renderPrintArtworkFromScanUrl(scanUrl, GLITCH_HOODIE_TEMPLATE_ID);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg, "utf8");

  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  console.log(`✓ ${outPath}`);
  console.log(`  template: ${GLITCH_HOODIE_TEMPLATE_ID}`);
  console.log(`  frame: full + tight (see print-template-render.ts)`);
  if (viewBox) {
    console.log(`  viewBox: ${viewBox[1]} × ${viewBox[2]}`);
  }
  console.log(`  scan: ${scanUrl}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
