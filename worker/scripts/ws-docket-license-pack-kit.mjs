#!/usr/bin/env node
/**
 *   npm run ws-docket:license-pack-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_PHOTO_LICENSE_PACK_KIT_REL,
  buildWsDocketLicensePackKitHtml,
  validateWsDocketLicensePackKitHtml,
} from "./ws-docket-license-pack-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketLicensePackKitHtml({ origin });
validateWsDocketLicensePackKitHtml(html);
writeFileSync(join(root, DOCKET_PHOTO_LICENSE_PACK_KIT_REL), html);
console.log(`Wrote: ${DOCKET_PHOTO_LICENSE_PACK_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-license-pack-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:license-pack-preflight -- --strict");
