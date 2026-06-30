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
  buildComprehensionRunbookProductionUrlsBlock,
  buildLocalComprehensionSurfaces,
  buildProductionComprehensionSurfaces,
  comprehensionDualGateWalkPageRel,
  COMPREHENSION_RUNBOOK_REL,
  comprehensionGt8FieldWalkPageRel,
  comprehensionPlayerFlowFieldWalkPageRel,
  parseQrPackScanUrls,
  productionRulesUrl,
  resolveKitScanUrls,
  resolveProductionKitScanUrls,
  resolveProductionScanUrlByNode,
} from "./city-game-comprehension-kit-core.mjs";
import { LOCAL_DEV_GT8_FIELD_WALK_REL } from "./city-game-network-lens-gt8-field-kit-core.mjs";
import { LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL } from "../../site/js/public-network-player-flow-field-kit-core.mjs";
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
const localFieldWalkOutPath = join(root, LOCAL_DEV_GT8_FIELD_WALK_REL);
const localPlayerFlowWalkOutPath = join(root, LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL);
const defaultSeasonPath = join(root, "site/data/city-game-cr-season-01.json");
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
    const boardUrl = `${rulesUrl.replace(/\/?$/, "/")}map/`;
    const surfaces = buildProductionComprehensionSurfaces({
      season,
      rulesUrl,
      boardUrl,
      kitNodes,
    });
    mkdirSync(dirname(productionOutPath), { recursive: true });
    writeFileSync(productionOutPath, surfaces.kitHtml, "utf8");
    if (surfaces.fieldWalkHtml) {
      const fieldWalkOutPath = join(root, comprehensionGt8FieldWalkPageRel(season));
      mkdirSync(dirname(fieldWalkOutPath), { recursive: true });
      writeFileSync(fieldWalkOutPath, surfaces.fieldWalkHtml, "utf8");
    }
    if (surfaces.dualGateWalkHtml) {
      const dualGateOutPath = join(root, comprehensionDualGateWalkPageRel(season));
      mkdirSync(dirname(dualGateOutPath), { recursive: true });
      writeFileSync(dualGateOutPath, surfaces.dualGateWalkHtml, "utf8");
    }
    if (surfaces.playerFlowWalkHtml) {
      const playerFlowOutPath = join(root, comprehensionPlayerFlowFieldWalkPageRel(season));
      mkdirSync(dirname(playerFlowOutPath), { recursive: true });
      writeFileSync(playerFlowOutPath, surfaces.playerFlowWalkHtml, "utf8");
    }
    console.log("GT comprehension kit (production)\n");
    console.log(`Scan URL source: ${resolved.source}`);
    console.log("Wrote:", productionOutPath);
    if (surfaces.fieldWalkHtml) {
      console.log("Wrote:", join(root, comprehensionGt8FieldWalkPageRel(season)));
    }
    if (surfaces.dualGateWalkHtml) {
      console.log("Wrote:", join(root, comprehensionDualGateWalkPageRel(season)));
    }
    if (surfaces.playerFlowWalkHtml) {
      console.log("Wrote:", join(root, comprehensionPlayerFlowFieldWalkPageRel(season)));
    }
    console.log("\nOpen on production:");
    console.log(" ", productionKitUrl);
    if (surfaces.fieldWalkUrl) {
      console.log("  GT-8 field walk:", surfaces.fieldWalkUrl);
    }
    if (surfaces.dualGateWalkUrl) {
      console.log("  Dual-gate walk:", surfaces.dualGateWalkUrl);
    }
    if (surfaces.playerFlowWalkUrl) {
      console.log("  Player flow walk:", surfaces.playerFlowWalkUrl);
    }
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
        fieldWalkUrl: surfaces.fieldWalkUrl ?? null,
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
  const season = existsSync(defaultSeasonPath)
    ? JSON.parse(readFileSync(defaultSeasonPath, "utf8"))
    : {};
  const kitNodes = resolveKitScanUrls(seed.nodes, seed.profile_id, host);
  const hubUrl = `http://${host}:8788/dev/city-game-lan-hub`;
  const rulesPath = String(season.rules_path ?? "/play/cedar-rapids/").trim() || "/play/cedar-rapids/";
  const rulesUrl = `http://${host.includes(":") ? host.split(":")[0] : host}:8788${rulesPath.startsWith("/") ? rulesPath : `/${rulesPath}`}`;
  const boardUrl = `${rulesUrl.replace(/\/?$/, "/")}map/`;
  const surfaces = buildLocalComprehensionSurfaces({
    season,
    host,
    rulesUrl,
    boardUrl,
    kitNodes,
    hubUrl,
  });

  mkdirSync(localOutDir, { recursive: true });
  writeFileSync(localOutPath, surfaces.kitHtml, "utf8");
  if (surfaces.fieldWalkHtml) {
    mkdirSync(dirname(localFieldWalkOutPath), { recursive: true });
    writeFileSync(localFieldWalkOutPath, surfaces.fieldWalkHtml, "utf8");
  }
  if (surfaces.playerFlowWalkHtml) {
    mkdirSync(dirname(localPlayerFlowWalkOutPath), { recursive: true });
    writeFileSync(localPlayerFlowWalkOutPath, surfaces.playerFlowWalkHtml, "utf8");
  }

  const pageUrl = `http://${host.includes(":") ? host.split(":")[0] : host}:8788/dev/city-game-comprehension.html`;
  const fieldWalkUrl = surfaces.fieldWalkUrl ?? null;
  const playerFlowWalkUrl = surfaces.playerFlowWalkUrl ?? null;
  console.log("GT comprehension kit\n");
  console.log("Wrote:", localOutPath);
  if (surfaces.fieldWalkHtml) {
    console.log("Wrote:", localFieldWalkOutPath);
  }
  if (surfaces.playerFlowWalkHtml) {
    console.log("Wrote:", localPlayerFlowWalkOutPath);
  }
  console.log("\nStart a local server first:");
  console.log("  npm run city-game:dev");
  console.log("  (or npm run pages:dev in another terminal)");
  console.log("\nThen open:");
  console.log(" ", pageUrl);
  if (fieldWalkUrl) {
    console.log("  GT-8 field walk:", fieldWalkUrl);
  }
  if (playerFlowWalkUrl) {
    console.log("  Player flow walk:", playerFlowWalkUrl);
  }
  console.log("  Map board:", boardUrl);
  console.log("\nProduction kit (no local server needed):");
  console.log("  npm run city-game:comprehension-kit -- --production");
  console.log("  → /play/{slug}/comprehension/ (from season rules_path)");
  console.log("\nPrimary send link (quorum node from season JSON):");
  const node04 = kitNodes.find((n) => n.node_id === "node_04");
  console.log(" ", node04?.href ?? "(missing — re-seed)");
  console.log("\nRecord results in docs/CITY_GAME_COMPREHENSION_RUNBOOK.md § Sign-off");
}

main();
