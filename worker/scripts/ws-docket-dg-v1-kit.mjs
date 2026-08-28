#!/usr/bin/env node
/**
 *   npm run ws-docket:dg-v1-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_DG_V1_KIT_REL,
  buildWsDocketDgV1KitHtml,
  validateWsDocketDgV1KitHtml,
} from "./ws-docket-dg-v1-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketDgV1KitHtml({ origin });
validateWsDocketDgV1KitHtml(html);
writeFileSync(join(root, DOCKET_DG_V1_KIT_REL), html);
console.log(`Wrote: ${DOCKET_DG_V1_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-dg-v1-field-walk.html`);
console.log("Engineering: npm run ws-docket:dg-v1-preflight -- --strict");
