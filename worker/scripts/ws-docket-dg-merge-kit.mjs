#!/usr/bin/env node
/**
 *   npm run ws-docket:dg-merge-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_MERGE_KIT_REL,
  buildWsDocketDgMergeKitHtml,
  validateWsDocketDgMergeKitHtml,
} from "./ws-docket-dg-merge-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketDgMergeKitHtml({ origin });
validateWsDocketDgMergeKitHtml(html);
writeFileSync(join(root, DOCKET_MERGE_KIT_REL), html);
console.log(`Wrote: ${DOCKET_MERGE_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-dg-merge-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:dg-merge-preflight -- --strict");
