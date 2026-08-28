#!/usr/bin/env node
/**
 *   npm run ws-docket:c-v3-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_CV3_KIT_REL,
  buildWsDocketCv3KitHtml,
  validateWsDocketCv3KitHtml,
} from "./ws-docket-c-v3-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketCv3KitHtml({ origin });
validateWsDocketCv3KitHtml(html);
writeFileSync(join(root, DOCKET_CV3_KIT_REL), html);
console.log(`Wrote: ${DOCKET_CV3_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-c-v3-field-walk.html`);
console.log("Engineering: npm run ws-docket:c-v3-preflight -- --strict");
