#!/usr/bin/env node
/**
 * Verify Cedar Rapids season config + engineering gates before install QA or launch.
 *
 * Usage:
 *   npm run city-game:verify-season
 *   npm run city-game:verify-season -- --require-launch
 *   npm run verify:city-game   # tests + this script
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { seasonBoardPath } from "../../site/js/city-game-season-path-shared.mjs";
import { cityGameSeasonReadiness } from "./city-game-season-readiness.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const rulesPath = join(root, "site/play/cedar-rapids/index.html");
const mapPath = join(root, "site/play/cedar-rapids/map/index.html");
const wranglerPath = join(root, "worker/wrangler.toml");

const requireLaunch = process.argv.includes("--require-launch");

let season;
try {
  season = JSON.parse(readFileSync(seasonPath, "utf8"));
} catch (err) {
  console.error(`Could not read ${seasonPath}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}

const result = cityGameSeasonReadiness(season, { requireLaunch });
let { ready } = result;
const issues = [...result.issues];
const warnings = [...result.warnings];

console.log(`Cedar Rapids season: ${seasonPath}\n`);

if (existsSync(rulesPath)) {
  const rules = readFileSync(rulesPath, "utf8");
  if (!rules.includes("noindex")) {
    warnings.push("Rules page missing noindex — remove only at public launch.");
  }
  if (!rules.includes("What a scan proves")) {
    issues.push("Rules page missing 'What a scan proves' section.");
  }
  if (!rules.includes('id="city-state"')) {
    issues.push('Rules page missing city board CTA section (#city-state).');
  }
  const boardPath = seasonBoardPath(season.rules_path);
  if (boardPath && !rules.includes(boardPath)) {
    issues.push(`Rules page missing link to board page ${boardPath}.`);
  }
  if (rules.includes('id="city-game-map-root"')) {
    issues.push("Rules page must not embed city-game-map-root — board lives on /map/ page.");
  }
  if (!rules.includes("city-game-play-page.mjs")) {
    issues.push("Rules page missing city-game-play-page.mjs module (single play-page boot).");
  }
  if (rules.includes("city-game-map-board.mjs") && rules.includes("city-game-play-page.mjs")) {
    issues.push("Rules page loads duplicate board boot scripts — use city-game-play-page.mjs only.");
  }
} else {
  issues.push(`Missing rules page: ${rulesPath}`);
}

if (existsSync(mapPath)) {
  const mapPage = readFileSync(mapPath, "utf8");
  if (!mapPage.includes('id="city-game-map-root"')) {
    issues.push("Map page missing city-game-map-root mount.");
  }
  if (!mapPage.includes("city-game-map-page.mjs")) {
    issues.push("Map page missing city-game-map-page.mjs boot script.");
  }
  const mapBoardPath = seasonBoardPath(season.rules_path);
  if (mapBoardPath && !mapPage.includes(mapBoardPath)) {
    issues.push(`Map page missing canonical board path ${mapBoardPath}.`);
  }
} else {
  issues.push(`Missing map page: ${mapPath}`);
}

try {
  const wrangler = readFileSync(wranglerPath, "utf8");
  const prodDisabled = /CITY_GAME_ENABLED\s*=\s*"0"/.test(wrangler);
  if (requireLaunch && prodDisabled) {
    warnings.push("worker/wrangler.toml still has CITY_GAME_ENABLED=0 — set to 1 for launch deploy.");
  } else if (!requireLaunch && prodDisabled) {
    console.log("✓ CITY_GAME_ENABLED=0 in wrangler.toml (expected pre-launch).");
  }
} catch {
  warnings.push("Could not read worker/wrangler.toml for CITY_GAME_ENABLED.");
}

if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  console.log("");
}

if (ready && issues.length === 0) {
  console.log("✅ Season registry structure is ready.");
  console.log(`   Nodes: ${season.nodes.length} · Unlock edges: ${season.unlock_edges?.length ?? 0}`);
  if (!requireLaunch) {
    console.log("\nNext:");
    console.log("  - npm run city-game:season-root → create season root card");
    console.log("  - npm run city-game:mint-node -- --all → mint + issue QRs");
    console.log("  - docs/CITY_GAME_INSTALL_QA.md → physical install");
    console.log("  - docs/CITY_GAME_COMPREHENSION_RUNBOOK.md → GT-1–GT-7");
  }
} else {
  console.log("☐ Season config issues:\n");
  for (const issue of issues) console.log(`  - ${issue}`);
}

if (!ready || issues.length > 0) {
  console.log("\nSee docs/CITY_GAME_V1_IMPLEMENTATION.md · docs/CITY_GAME_LAUNCH_CHECKLIST.md");
  process.exit(1);
}

if (requireLaunch && warnings.some((w) => w.includes("CITY_GAME_ENABLED"))) {
  process.exit(1);
}
