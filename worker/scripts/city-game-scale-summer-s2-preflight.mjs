#!/usr/bin/env node
/**
 * WS-SW summer S2b — artifacts (SW-09) + overharvest (SW-12) on four nodes.
 *   npm run city-game:scale-summer-s2
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildGameNodeMintTemplate } from "./city-game-node-defaults.mjs";
import {
  SUMMER_S2_ARTIFACT_BY_NODE,
  SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE,
  validateSeasonSummerS2,
} from "./city-game-summer-s2-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const validation = validateSeasonSummerS2(season);

  console.log("WS-SW summer S2b — artifacts + overharvest");
  console.log("  Artifacts:", Object.entries(SUMMER_S2_ARTIFACT_BY_NODE).map(([k, v]) => `${k}=${v}`).join(", "));
  console.log(
    "  Overharvest:",
    Object.entries(SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE)
      .map(([k, v]) => `${k}≤${v}`)
      .join(", ")
  );

  for (const i of validation.issues) console.error("  fail:", i);

  const byId = new Map(season.nodes.map((n) => [n.node_id, n]));
  for (const nodeId of [
    ...Object.keys(SUMMER_S2_ARTIFACT_BY_NODE),
    ...Object.keys(SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE),
  ]) {
    const row = byId.get(nodeId);
    if (!row) {
      console.error(`  fail: missing season row ${nodeId}`);
      process.exit(1);
    }
    const template = buildGameNodeMintTemplate(row, season.season_id);
    if (SUMMER_S2_ARTIFACT_BY_NODE[nodeId]) {
      if (template.game_meta.artifact_id !== SUMMER_S2_ARTIFACT_BY_NODE[nodeId]) {
        console.error(
          `  fail: ${nodeId} template artifact_id ${template.game_meta.artifact_id}`
        );
        process.exit(1);
      }
    }
    if (SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE[nodeId] != null) {
      if (
        template.game_meta.overharvest_limit !==
        SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE[nodeId]
      ) {
        console.error(
          `  fail: ${nodeId} template overharvest_limit ${template.game_meta.overharvest_limit}`
        );
        process.exit(1);
      }
    }
  }

  if (!validation.ok) {
    console.error("\n✗ summer S2b failed — fix season JSON / relay_capture_nodes.");
    process.exit(1);
  }

  console.log("\n☑ summer S2b — season + mint templates aligned.");
  console.log("  Doc: docs/CITY_GAME_SUMMER_MOMENTUM.md");
  console.log("  Re-mint: npm run city-game:seed-local -- --force (local D1 meta refresh)");
}

main();
