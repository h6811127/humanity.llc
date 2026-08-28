#!/usr/bin/env node
/**
 *   npm run ws-docket:dg-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_DG_KIT_REL,
  buildWsDocketDgKitHtml,
  validateWsDocketDgKitHtml,
} from "./ws-docket-dg-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketDgKitHtml({ origin });
validateWsDocketDgKitHtml(html);
const out = join(root, DOCKET_DG_KIT_REL);
writeFileSync(out, html);
console.log(`Wrote: ${DOCKET_DG_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-dg-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:dg-preflight -- --strict");
