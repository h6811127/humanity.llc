#!/usr/bin/env node
/**
 * WS-CUSTODY G-C1 comprehension kit.
 *
 *   npm run custody:g-c1-kit
 *   npm run custody:g-c1-kit -- --production
 *   npm run custody:g-c1-kit -- --lan
 *
 * Open: http://127.0.0.1:8788/dev/custody-g-c1-comprehension.html
 *
 * @see docs/CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import {
  buildCustodyG1KitHtml,
  LOCAL_DEV_G1_COMPREHENSION_REL,
  resolveCustodyG1KitUrls,
} from "./custody-g-c1-comprehension-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "site/dev");
const outPath = join(outDir, "custody-g-c1-comprehension.html");
const productionMode = process.argv.includes("--production");
const lanMode = process.argv.includes("--lan");

function lanHost() {
  return detectLanHostFromInterfaces(networkInterfaces()) ?? "127.0.0.1";
}

function main() {
  const host = lanMode ? `${lanHost()}:8788` : "127.0.0.1:8788";
  const urls = resolveCustodyG1KitUrls({ production: productionMode, host });
  const html = buildCustodyG1KitHtml({
    createUrl: urls.createUrl,
    origin: urls.origin,
    production: productionMode,
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, "utf8");

  console.log("Wrote:", LOCAL_DEV_G1_COMPREHENSION_REL);
  console.log("Open:", urls.kitPageUrl);
  console.log("Create:", urls.createUrl);
}

main();
