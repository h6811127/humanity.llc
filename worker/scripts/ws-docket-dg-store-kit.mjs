/**
 *   npm run ws-docket:dg-store-kit
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_DG_STORE_KIT_REL,
  buildWsDocketDgStoreKitHtml,
  validateWsDocketDgStoreKitHtml,
} from "./ws-docket-dg-store-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(root, DOCKET_DG_STORE_KIT_REL);
const origin = process.env.PAGES_ORIGIN ?? "http://127.0.0.1:8788";
const html = buildWsDocketDgStoreKitHtml({ origin });
validateWsDocketDgStoreKitHtml(html);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`Wrote ${DOCKET_DG_STORE_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-dg-store-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:dg-store-preflight -- --strict");
