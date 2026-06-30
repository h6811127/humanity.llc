#!/usr/bin/env node
/**
 * Agent D player flow field walk kit — human sign-off for discover → board → scan shells.
 *
 *   npm run player-flow:field-kit
 *   npm run player-flow:field-kit -- --production
 *   npm run player-flow:field-kit -- --check
 *
 * Open (local): http://127.0.0.1:8788/dev/public-network-player-flow-field-walk.html
 * Open (prod):  https://humanity.llc/play/cedar-rapids/comprehension/player-flow-field-walk.html
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatPlayerFlowFieldKitReport,
  LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL,
  PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME,
  productionPlayerFlowFieldWalkUrl,
  validatePlayerFlowFieldWalkKitHtml,
} from "../../site/js/public-network-player-flow-field-kit-core.mjs";
import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";
import {
  assessPlayerFlowFieldKitReady,
  buildPlayerFlowFieldKitHtml,
  CR_SEASON_REL,
} from "./public-network-player-flow-field-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const checkOnly = process.argv.includes("--check");
const productionMode = process.argv.includes("--production");

function productionOutputPath(season) {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return join(
    root,
    "site/play",
    slug,
    "comprehension",
    PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME
  );
}

const report = assessPlayerFlowFieldKitReady(root, { requireProduction: productionMode || checkOnly });
console.log(formatPlayerFlowFieldKitReport(report));

if (checkOnly) {
  process.exit(report.ready ? 0 : 1);
}

const html = buildPlayerFlowFieldKitHtml(root, { production: productionMode });
const validation = validatePlayerFlowFieldWalkKitHtml(html);
if (!validation.ok) {
  console.error("\n✗ Generated kit HTML invalid:");
  for (const issue of validation.issues) console.error(`  · ${issue}`);
  process.exit(1);
}

const outPath = productionMode
  ? productionOutputPath(JSON.parse(readFileSync(join(root, CR_SEASON_REL), "utf8")))
  : join(root, LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`\n✅ Wrote ${outPath.replace(`${root}/`, "")}`);
if (productionMode) {
  console.log(`   Open: ${productionPlayerFlowFieldWalkUrl(JSON.parse(readFileSync(join(root, CR_SEASON_REL), "utf8")))}`);
} else {
  console.log("   Open: http://127.0.0.1:8788/dev/public-network-player-flow-field-walk.html");
}
