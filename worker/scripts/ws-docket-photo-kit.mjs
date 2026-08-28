#!/usr/bin/env node
/**
 *   npm run ws-docket:photo-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_PHOTO_KIT_REL,
  buildWsDocketPhotoKitHtml,
  validateWsDocketPhotoKitHtml,
} from "./ws-docket-photo-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketPhotoKitHtml({ origin });
validateWsDocketPhotoKitHtml(html);
writeFileSync(join(root, DOCKET_PHOTO_KIT_REL), html);
console.log(`Wrote: ${DOCKET_PHOTO_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-photo-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:photo-preflight -- --strict");
