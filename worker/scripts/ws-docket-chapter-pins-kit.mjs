#!/usr/bin/env node
/**
 *   npm run ws-docket:chapter-pins-kit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOCKET_CHAPTER_PINS_KIT_REL,
  buildWsDocketChapterPinsKitHtml,
  validateWsDocketChapterPinsKitHtml,
} from "./ws-docket-chapter-pins-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
const origin = production ? "https://humanity.llc" : "http://127.0.0.1:8788";
const html = buildWsDocketChapterPinsKitHtml({ origin });
validateWsDocketChapterPinsKitHtml(html);
writeFileSync(join(root, DOCKET_CHAPTER_PINS_KIT_REL), html);
console.log(`Wrote: ${DOCKET_CHAPTER_PINS_KIT_REL}`);
console.log(`Open: ${origin}/dev/ws-docket-chapter-pins-v0-field-walk.html`);
console.log("Engineering: npm run ws-docket:chapter-pins-preflight -- --strict");
