#!/usr/bin/env node
/**
 * Regenerate LO-4 reference network teaching kit (operator field walk).
 *
 *   npm run city-game:reference-network-kit
 *   npm run city-game:reference-network-kit -- --production
 *   npm run city-game:reference-network-kit -- --check
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessLo4KitReady,
  buildLo4KitHtml,
  formatLo4KitPreflightReport,
  LO4_KIT_REL,
} from "./city-game-reference-network-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const production = args.includes("--production");
const checkOnly = args.includes("--check");

const report = assessLo4KitReady(root);
console.log(formatLo4KitPreflightReport(report));

if (checkOnly) {
  process.exit(report.ready ? 0 : 1);
}

if (!report.ready) {
  process.exit(1);
}

const html = buildLo4KitHtml(root, { production });
const outPath = join(root, LO4_KIT_REL);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`\n✅ Wrote ${LO4_KIT_REL}`);
console.log(`   Open: /play/cedar-rapids/teaching/`);
