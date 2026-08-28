#!/usr/bin/env node
/**
 *   npm run ws-docket:qr-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_QR_KIT_REL,
  buildWsDocketQrKitHtml,
  validateWsDocketQrKitHtml,
} from "./ws-docket-qr-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketQrKitHtml({ origin });
validateWsDocketQrKitHtml(html);
const out = join(root, DOCKET_QR_KIT_REL);
writeFileSync(out, html);
console.log(`Wrote: ${DOCKET_QR_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-qr-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:qr-preflight -- --strict");
