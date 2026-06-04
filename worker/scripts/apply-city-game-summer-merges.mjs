#!/usr/bin/env node
/**
 * Apply summer S2–S6 canon blocks to city-game-cr-season-01.json.
 * Usage: node worker/scripts/apply-city-game-summer-merges.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { mergeSummerS2 } from "./city-game-summer-s2-core.mjs";
import { mergeSummerS3BulletinSchedule } from "./city-game-summer-s3-core.mjs";
import { mergeSummerS4 } from "./city-game-summer-s4-core.mjs";
import { mergeSummerS5Enrollments } from "./city-game-summer-s5-core.mjs";
import { mergeSummerS6Debrief } from "./city-game-summer-s6-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const write = process.argv.includes("--write");

let season = JSON.parse(readFileSync(seasonPath, "utf8"));
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

if (write) {
  writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
  console.log(`Wrote ${seasonPath}`);
} else {
  console.log("Dry run OK — pass --write to update season JSON");
}
