#!/usr/bin/env node
/**
 * Operator helper — mint game_node child objects for Cedar Rapids Season 1.
 *
 * Usage:
 *   npm run city-game:mint-node -- node_01
 *   npm run city-game:mint-node -- --all-test   # prototype nodes only (detailed fixtures)
 *   npm run city-game:mint-node -- --all          # full 15-node registry
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAllGameNodeTemplates,
  buildGameNodeMintTemplate,
  SEASON_OBJECT_IDS,
} from "./city-game-node-defaults.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = path.join(root, "site/data/city-game-cr-season-01.json");
const testTemplatesPath = path.join(
  root,
  "worker/tests/fixtures/city-game-node-templates.json"
);

const arg = process.argv[2] ?? "node_01";

if (!fs.existsSync(seasonPath)) {
  console.error("Missing season config:", seasonPath);
  process.exit(1);
}

const season = JSON.parse(fs.readFileSync(seasonPath, "utf8"));

function printNode(node) {
  console.log(`\n=== ${node.node_id} · ${node.public_label} ===`);
  console.log("object_id:", node.object_id);
  console.log("node_role:", node.node_role, "· district:", node.district);
  console.log("\nUnsigned child_object fields (sign with game-operator or owner key):");
  console.log(
    JSON.stringify(
      {
        object_id: node.object_id,
        object_type: "game_node",
        season_id: season.season_id,
        node_role: node.node_role,
        district: node.district,
        public_label: node.public_label,
        public_state: node.public_state,
        status: "active",
        object_streams: node.object_streams,
        game_meta: node.game_meta,
      },
      null,
      2
    )
  );
}

console.log("Cedar Rapids city game — mint helper");
console.log("Season:", season.season_id, "—", season.title);
if (season.season_root_profile_id) {
  console.log("Season root profile_id:", season.season_root_profile_id);
} else {
  console.log("Season root profile_id: (set after create — npm run city-game:season-root)");
}

if (arg === "--all") {
  const nodes = buildAllGameNodeTemplates(season.nodes, season.season_id);
  for (const node of nodes) printNode(node);
} else if (arg === "--all-test") {
  const testTemplates = JSON.parse(fs.readFileSync(testTemplatesPath, "utf8"));
  for (const node of testTemplates.nodes) printNode(node);
} else {
  const registryRow = season.nodes?.find((n) => n.node_id === arg);
  const testTemplates = fs.existsSync(testTemplatesPath)
    ? JSON.parse(fs.readFileSync(testTemplatesPath, "utf8"))
    : { nodes: [] };
  const detailed = testTemplates.nodes.find((n) => n.node_id === arg);
  const node = detailed
    ? detailed
    : registryRow
      ? buildGameNodeMintTemplate(registryRow, season.season_id)
      : null;
  if (!node) {
    console.error("Unknown node:", arg);
    console.error("Try node_01 … node_15, --all-test, or --all");
    process.exit(1);
  }
  printNode(node);
}

console.log("\nObject IDs:", Object.keys(SEASON_OBJECT_IDS).length, "planned slugs in registry.");
console.log("\nNext steps:");
console.log("  1. Set CITY_GAME_ENABLED=1 in worker/wrangler.toml for local dev.");
console.log("  2. npm run city-game:season-root — register issuer_public_key on season root.");
console.log("  3. Sign each payload as child_object (parent_profile_id, created_at, updated_at).");
console.log("  4. POST /.well-known/hc/v1/cards/{profile_id}/objects");
console.log("  5. POST …/objects/{object_id}/issue-qr");
console.log("  6. Flip state at /game-operator/ or POST …/game-update");
console.log("\nUnlock edges:", JSON.stringify(season.unlock_edges ?? []));
