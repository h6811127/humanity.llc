#!/usr/bin/env node
/**
 * WS-DOCKET-C-v2 field walk kit — casefile mint plumbing (no public-case bind).
 *
 *   npm run ws-docket:c-v2-kit
 *   npm run ws-docket:c-v2-kit -- --production
 *
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDocketCv2KitHtml,
  DOCKET_CV2_KIT_REL,
  resolveDocketCv2KitUrls,
  validateDocketCv2KitHtml,
} from "./ws-docket-c-v2-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(root, DOCKET_CV2_KIT_REL);
const productionMode = process.argv.includes("--production");

function main() {
  const urls = resolveDocketCv2KitUrls({ production: productionMode });
  const html = buildDocketCv2KitHtml({
    origin: urls.origin,
    apiOrigin: urls.apiOrigin,
    docketUrl: urls.docketUrl,
    stewardExampleUrl: urls.stewardExampleUrl,
    fixtureScanUrl: urls.fixtureScanUrl,
    fixtureScanPath: urls.fixtureScanPath,
    production: productionMode,
  });
  validateDocketCv2KitHtml(html);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");

  console.log("Wrote:", DOCKET_CV2_KIT_REL);
  console.log("Open:", urls.kitPageUrl);
  if (!productionMode) {
    console.log("\nRequires: npm run pages:dev (+ worker:dev to mint a real QR)");
    console.log("Engineering: npm run ws-docket:c-v2-preflight -- --strict");
  }
}

main();
