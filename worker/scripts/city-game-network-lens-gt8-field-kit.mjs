#!/usr/bin/env node
/**
 * SF-3 / GT-8 field walk kit — outdoor board scenarios + 10s timer.
 *
 *   npm run city-game:network-lens-gt8-kit
 *   npm run city-game:network-lens-gt8-kit -- --production
 *
 * Open (production): https://humanity.llc/play/cedar-rapids/comprehension/gt8-field-walk.html
 * Open (local): http://127.0.0.1:8788/dev/city-game-gt8-field-walk.html
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { seasonComprehensionPath } from "../../site/js/city-game-player-guide-core.mjs";
import { resolveSeasonPathFromCli } from "../../site/js/city-game-season-path-core.mjs";
import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";
import {
  buildGt8FieldWalkKitHtml,
  formatGt8FieldWalkKitReport,
  LOCAL_DEV_GT8_FIELD_WALK_REL,
  productionBoardUrl,
  productionGt8FieldWalkUrl,
  resolveNetworkLensNextStop,
  validateGt8FieldWalkKitHtml,
} from "./city-game-network-lens-gt8-field-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const productionMode = process.argv.includes("--production");
const origin = "https://humanity.llc";

function productionOutputPath(season) {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return join(root, "site/play", slug, "comprehension", "gt8-field-walk.html");
}

function main() {
  const seasonPath = productionMode
    ? join(root, "site/data/city-game-cr-season-01.json")
    : resolveSeasonPathFromCli(root);
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const nextStop = resolveNetworkLensNextStop(season);
  const boardUrl = productionMode
    ? productionBoardUrl(season, origin)
    : `http://127.0.0.1:8788${String(season.rules_path ?? "/play/cedar-rapids/").replace(/\/?$/, "/")}map/`;
  const comprehensionUrl = productionMode
    ? `${origin}${seasonComprehensionPath(season)}`
    : `http://127.0.0.1:8788${seasonComprehensionPath(season)}`;

  const html = buildGt8FieldWalkKitHtml({
    boardUrl,
    comprehensionUrl,
    nextStop,
    production: productionMode,
  });

  const outPath = productionMode
    ? productionOutputPath(season)
    : join(root, LOCAL_DEV_GT8_FIELD_WALK_REL);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");

  const validation = validateGt8FieldWalkKitHtml(html, outPath.replace(`${root}/`, ""));
  if (!validation.ok) {
    console.error("GT-8 field kit validation failed:");
    for (const issue of validation.issues) console.error(`  ✗ ${issue}`);
    process.exit(1);
  }

  const fieldWalkUrl = productionMode
    ? productionGt8FieldWalkUrl(season, origin)
    : `http://127.0.0.1:8788/dev/city-game-gt8-field-walk.html`;

  console.log(formatGt8FieldWalkKitReport({ boardUrl, fieldWalkUrl, production: productionMode }));
  console.log(`\nWrote ${outPath.replace(`${root}/`, "")}`);
}

main();
