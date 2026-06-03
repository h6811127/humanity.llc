#!/usr/bin/env node
/**
 * GT comprehension kit — scorecard + tap URLs for ≥5 testers (Phase D human gate).
 *
 *   npm run city-game:comprehension-kit
 *   npm run city-game:comprehension-kit -- --production
 *   npm run city-game:comprehension-kit -- --lan
 *
 * Open: http://127.0.0.1:8788/dev/city-game-comprehension.html
 * (requires pages:dev or npm run city-game:dev)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import {
  applyComprehensionRunbookPrimaryScanUrl,
  applyComprehensionRunbookProductionUrls,
  buildComprehensionKitHtml,
  buildComprehensionRunbookProductionUrlsBlock,
  COMPREHENSION_RUNBOOK_REL,
  parseQrPackScanUrls,
  productionRulesUrl,
  resolveKitScanUrls,
  resolveProductionKitScanUrls,
  resolveProductionScanUrlByNode,
} from "./city-game-comprehension-kit-core.mjs";
import { resolveSeasonPathFromCli } from "../../site/js/city-game-season-path-core.mjs";
import {
  comprehensionPrimaryNodeId,
  seasonComprehensionPath,
} from "../../site/js/city-game-player-guide-core.mjs";
import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const qrPackPath = join(root, "worker/.local/city-game-qr-pack/SCAN_URLS.md");
const localOutDir = join(root, "site/dev");
const localOutPath = join(localOutDir, "city-game-comprehension.html");
const lanMode = process.argv.includes("--lan");
const productionMode = process.argv.includes("--production");
const applyRunbook = process.argv.includes("--apply-runbook");

function seasonComprehensionOutputPath(season) {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return join(root, "site/play", slug, "comprehension", "index.html");
}

function seasonComprehensionProductionUrl(season, origin = "https://humanity.llc") {
  const path = seasonComprehensionPath(season);
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function loadProductionScanSources(season) {
  const productionSeed = existsSync(prodSeedPath)
    ? JSON.parse(readFileSync(prodSeedPath, "utf8"))
    : null;
  const localSeed = existsSync(seedPath) ? JSON.parse(readFileSync(seedPath, "utf8")) : null;
  const qrPackByNode = existsSync(qrPackPath)
    ? parseQrPackScanUrls(readFileSync(qrPackPath, "utf8"))
    : null;
  return resolveProductionScanUrlByNode(season, {
    productionSeed,
    localSeed,
    qrPackByNode,
  });
}

function main() {
  if (productionMode) {
    const seasonPath = resolveSeasonPathFromCli(root);
    const season = JSON.parse(readFileSync(seasonPath, "utf8"));
    const resolved = loadProductionScanSources(season);
    if (!Object.keys(resolved.scanUrlByNode).length) {
      console.error(
        "Missing production scan URLs — run npm run city-game:seed-local or city-game:seed-production first."
      );
      process.exit(1);
    }
    if (resolved.source === "local-seed") {
      console.warn(
        `⚠ Using local seed scan URLs (season root ${resolved.seasonRoot}) — production seed profile is ${resolved.prodProfile || "missing"}`
      );
    } else if (resolved.source === "production-seed-unaligned") {
      console.warn(
        `⚠ Production seed profile ${resolved.prodProfile} ≠ season JSON root ${resolved.seasonRoot} — kit uses production seed until re-mint`
      );
    }
    const rulesUrl = productionRulesUrl(season);
    const kitNodes = resolveProductionKitScanUrls(resolved.scanUrlByNode, season);
    const productionOutPath = seasonComprehensionOutputPath(season);
    const productionKitUrl = seasonComprehensionProductionUrl(season);
    const boardUrl = `${rulesUrl}#city-state`;
    const html = buildComprehensionKitHtml({
      host: "humanity.llc",
      rulesUrl,
      boardUrl,
      kitNodes,
      production: true,
      season,
    });
    mkdirSync(dirname(productionOutPath), { recursive: true });
    writeFileSync(productionOutPath, html, "utf8");
    console.log("GT comprehension kit (production)\n");
    console.log(`Scan URL source: ${resolved.source}`);
    console.log("Wrote:", productionOutPath);
    console.log("\nOpen on production:");
    console.log(" ", productionKitUrl);
    console.log("\nSend testers:");
    console.log("  Kit page:", productionKitUrl);
    console.log("  Rules:", rulesUrl);
    const primaryId = comprehensionPrimaryNodeId(season);
    const primary = kitNodes.find((n) => n.node_id === primaryId);
    const primaryScanUrl = primary?.href ?? "";
    console.log(`  Primary scan (${primaryId}):`, primaryScanUrl || "(missing)");
    if (applyRunbook) {
      const runbookPath = join(root, COMPREHENSION_RUNBOOK_REL);
      let runbook = readFileSync(runbookPath, "utf8");
      const block = buildComprehensionRunbookProductionUrlsBlock({
        rulesUrl,
        kitUrl: productionKitUrl,
        primaryScanUrl,
        boardUrl,
      });
      runbook = applyComprehensionRunbookProductionUrls(runbook, block);
      if (primaryScanUrl) {
        runbook = applyComprehensionRunbookPrimaryScanUrl(runbook, primaryScanUrl);
      }
      writeFileSync(runbookPath, runbook, "utf8");
      console.log("\nUpdated:", COMPREHENSION_RUNBOOK_REL);
    } else {
      console.log("\nSync runbook URLs:");
      console.log("  npm run city-game:comprehension-kit -- --production --apply-runbook");
    }
    console.log("\nThen: npm run pages:deploy");
    return;
  }

  if (!existsSync(seedPath)) {
    console.error("Missing seed — run: npm run city-game:dev -- --bootstrap");
    process.exit(1);
  }

  const host = lanMode
    ? detectLanHostFromInterfaces(networkInterfaces()) ?? "127.0.0.1"
    : "127.0.0.1";

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const kitNodes = resolveKitScanUrls(seed.nodes, seed.profile_id, host);
  const hubUrl = `http://${host}:8788/dev/city-game-lan-hub`;
  const html = buildComprehensionKitHtml({ host, hubUrl, kitNodes });

  mkdirSync(localOutDir, { recursive: true });
  writeFileSync(localOutPath, html, "utf8");

  const pageUrl = `http://${host}:8788/dev/city-game-comprehension.html`;
  console.log("GT comprehension kit\n");
  console.log("Wrote:", localOutPath);
  console.log("\nStart a local server first:");
  console.log("  npm run city-game:dev");
  console.log("  (or npm run pages:dev in another terminal)");
  console.log("\nThen open:");
  console.log(" ", pageUrl);
  console.log("\nProduction kit (no local server needed):");
  console.log("  npm run city-game:comprehension-kit -- --production");
  console.log("  → /play/{slug}/comprehension/ (from season rules_path)");
  console.log("\nPrimary send link (quorum node from season JSON):");
  const node04 = kitNodes.find((n) => n.node_id === "node_04");
  console.log(" ", node04?.href ?? "(missing — re-seed)");
  console.log("\nRecord results in docs/CITY_GAME_COMPREHENSION_RUNBOOK.md § Sign-off");
}

main();
