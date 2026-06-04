#!/usr/bin/env node
/**
 * Trim committed season JSON to 15-node pilot spine (keeps signal_war summer canon).
 * Usage: node worker/scripts/restore-pilot-season-json.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { mergeSummerS2 } from "./city-game-summer-s2-core.mjs";
import { mergeSummerS3BulletinSchedule } from "./city-game-summer-s3-core.mjs";
import { mergeSummerS4 } from "./city-game-summer-s4-core.mjs";
import { mergeSummerS5Enrollments } from "./city-game-summer-s5-core.mjs";
import { mergeSummerS6Debrief } from "./city-game-summer-s6-core.mjs";
import { PILOT_SEASON_NODE_COUNT } from "./city-game-summer-scale-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const write = process.argv.includes("--write");

const spineNum = (id) => Number(String(id).replace("node_", ""));
let season = JSON.parse(readFileSync(seasonPath, "utf8"));

season.nodes = (season.nodes ?? []).filter((n) => spineNum(n.node_id) <= PILOT_SEASON_NODE_COUNT);
const keepIds = new Set(season.nodes.map((n) => n.node_id));

if (season.map_layout?.nodes) {
  const next = {};
  for (const id of keepIds) {
    if (season.map_layout.nodes[id]) next[id] = season.map_layout.nodes[id];
  }
  season.map_layout.nodes = next;
}
if (Array.isArray(season.unlock_edges)) {
  season.unlock_edges = season.unlock_edges.filter(
    (e) => keepIds.has(e.from) && keepIds.has(e.to)
  );
}
if (season.contribute_codes) {
  const cc = {};
  for (const id of keepIds) {
    if (season.contribute_codes[id]) cc[id] = season.contribute_codes[id];
  }
  season.contribute_codes = cc;
}
if (season.automation?.relay_capture_nodes) {
  season.automation.relay_capture_nodes = season.automation.relay_capture_nodes.filter((id) =>
    keepIds.has(id)
  );
}
season.automation = { ...season.automation, relay_capture_player_enabled: false };

if (!season.signal_war || typeof season.signal_war !== "object") {
  season.signal_war = {};
}
season.signal_war.summer_s3 = {
  friday_interval_hours: 168,
  bulletin_nodes: ["node_01", "node_05", "node_15", "node_21", "node_22", "node_31"],
  min_weekly_beats: 5,
};
season = mergeSummerS2(season);
season = mergeSummerS3BulletinSchedule(season);
season = mergeSummerS4(season);
season = mergeSummerS5Enrollments(season);
season = mergeSummerS6Debrief(season);

if (!write) {
  console.log(`Dry run: ${season.nodes.length} nodes, relay=${season.automation.relay_capture_player_enabled}`);
  process.exit(0);
}

writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
console.log(`Wrote ${seasonPath} (${season.nodes.length} nodes)`);
