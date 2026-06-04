#!/usr/bin/env node
/**
 * WS-SW summer S3 — weekly bulletin schedule (CR-E02 / SW-10).
 *   npm run city-game:scale-summer-s3
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUMMER_S3_BULLETIN_NODE_IDS,
  SUMMER_S3_FRIDAY_INTERVAL_HOURS,
  validateSeasonSummerS3,
} from "./city-game-summer-s3-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const result = validateSeasonSummerS3(season);

  console.log("WS-SW summer S3 — weekly bulletin beats");
  console.log("  Interval:", SUMMER_S3_FRIDAY_INTERVAL_HOURS, "h (Friday cadence)");
  console.log("  Anchor nodes:", SUMMER_S3_BULLETIN_NODE_IDS.join(", "));

  for (const i of result.issues) console.error("  fail:", i);

  if (!result.ok) {
    console.error("\n✗ summer S3 failed — npm run city-game:merge-summer-s3-bulletins -- --write");
    process.exit(1);
  }

  console.log("\n☑ summer S3 — bulletin_schedule + signal_war.summer_s3 aligned.");
  console.log("  Doc: docs/CITY_GAME_SUMMER_MOMENTUM.md");
  console.log("  Ticker/scan: bulletin-schedule.ts · live-map-ticker.ts (no extra deploy)");
}

main();
