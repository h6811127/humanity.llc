#!/usr/bin/env node
/**
 * Merge summer S3 weekly bulletin beats into city-game-cr-season-01.json.
 * Usage: npm run city-game:merge-summer-s3-bulletins [-- --write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeSummerS3BulletinSchedule,
  validateSeasonSummerS3,
} from "./city-game-summer-s3-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const write = process.argv.includes("--write");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
if (!season.signal_war || typeof season.signal_war !== "object") {
  season.signal_war = {};
}
season.signal_war.summer_s3 = {
  friday_interval_hours: 168,
  bulletin_nodes: [
    "node_01",
    "node_05",
    "node_15",
    "node_21",
    "node_22",
    "node_31",
  ],
  min_weekly_beats: 5,
};

const merged = mergeSummerS3BulletinSchedule(season);
const check = validateSeasonSummerS3(merged);
if (!check.ok) {
  for (const i of check.issues) console.error(i);
  process.exit(1);
}

if (write) {
  writeFileSync(seasonPath, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Wrote ${seasonPath} — ${merged.bulletin_schedule.entries.length} bulletin entries`);
} else {
  console.log(
    `Dry run OK — would write ${merged.bulletin_schedule.entries.length} bulletin entries`
  );
  console.log("Run: npm run city-game:merge-summer-s3-bulletins -- --write");
}
