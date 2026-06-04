#!/usr/bin/env node
/**
 * WS-LIVE LO-1 field walk kit — status plate + lost-item printed pilots.
 *
 *   npm run ws-live:lo1-kit
 *   npm run ws-live:lo1-kit -- --production
 *   npm run ws-live:lo1-kit -- --lan
 *
 * Open: http://127.0.0.1:8788/dev/ws-live-lo1-comprehension.html
 *
 * @see docs/STATUS_PLATE_PILOT.md · docs/LOST_ITEM_RELAY_PILOT.md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import {
  buildWsLiveLo1KitHtml,
  LO1_KIT_REL,
  resolveWsLiveLo1KitUrls,
} from "./ws-live-lo1-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "site/dev");
const outPath = join(outDir, "ws-live-lo1-comprehension.html");
const productionMode = process.argv.includes("--production");
const lanMode = process.argv.includes("--lan");

function lanHost() {
  return detectLanHostFromInterfaces(networkInterfaces()) ?? "127.0.0.1";
}

function main() {
  const host = lanMode ? `${lanHost()}:8788` : "127.0.0.1:8788";
  const urls = resolveWsLiveLo1KitUrls({ production: productionMode, host });
  const html = buildWsLiveLo1KitHtml({
    origin: urls.origin,
    createGeneralUrl: urls.createGeneralUrl,
    createStatusPlateUrl: urls.createStatusPlateUrl,
    createLostItemUrl: urls.createLostItemUrl,
    showcaseStatusPlateUrl: urls.showcaseStatusPlateUrl,
    showcaseLostItemUrl: urls.showcaseLostItemUrl,
    production: productionMode,
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, "utf8");

  console.log("Wrote:", LO1_KIT_REL);
  console.log("Open:", urls.kitPageUrl);
  if (!productionMode) {
    console.log("\nRequires: npm run pages:dev (+ npm run worker:dev for create/scan API)");
    console.log("Engineering: npm run ws-live:preflight -- --strict");
  }
}

main();
