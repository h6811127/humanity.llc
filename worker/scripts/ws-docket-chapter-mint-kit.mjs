/**
 *   npm run ws-docket:chapter-mint-kit
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_CHAPTER_MINT_KIT_REL,
  buildWsDocketChapterMintKitHtml,
  validateWsDocketChapterMintKitHtml,
} from "./ws-docket-chapter-mint-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(root, DOCKET_CHAPTER_MINT_KIT_REL);
const origin = process.env.PAGES_ORIGIN ?? "http://127.0.0.1:8788";
const html = buildWsDocketChapterMintKitHtml({ origin });
validateWsDocketChapterMintKitHtml(html);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`Wrote ${DOCKET_CHAPTER_MINT_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-chapter-mint-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:chapter-mint-preflight -- --strict");
