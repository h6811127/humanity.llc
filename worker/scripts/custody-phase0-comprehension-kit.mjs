#!/usr/bin/env node
/**
 * WS-CUSTODY C0 comprehension kit — operator scorecard page.
 *
 *   npm run custody:phase0-kit
 *   npm run custody:phase0-kit -- --production
 *   npm run custody:phase0-kit -- --lan
 *
 * Open: http://127.0.0.1:8788/dev/custody-phase0-comprehension.html
 * (requires pages:dev)
 *
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import {
  buildCustodyPhase0KitHtml,
  LOCAL_DEV_COMPREHENSION_REL,
  resolveCustodyPhase0KitUrls,
} from "./custody-phase0-comprehension-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "site/dev");
const outPath = join(outDir, "custody-phase0-comprehension.html");
const productionMode = process.argv.includes("--production");
const lanMode = process.argv.includes("--lan");

function lanHost() {
  return detectLanHostFromInterfaces(networkInterfaces()) ?? "127.0.0.1";
}

function main() {
  const host = lanMode ? `${lanHost()}:8788` : "127.0.0.1:8788";
  const urls = resolveCustodyPhase0KitUrls({ production: productionMode, host });
  const html = buildCustodyPhase0KitHtml({
    createUrl: urls.createUrl,
    origin: urls.origin,
    production: productionMode,
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, "utf8");

  console.log("Wrote:", LOCAL_DEV_COMPREHENSION_REL);
  console.log("Open:", urls.kitPageUrl);
  console.log("Create:", urls.createUrl);
  if (!productionMode) {
    console.log("\nRequires: npm run pages:dev (+ npm run worker:dev for create API)");
  }
}

main();
