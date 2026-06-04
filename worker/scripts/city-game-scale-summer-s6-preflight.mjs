#!/usr/bin/env node
/**
 * WS-SW summer S6 — post-season debrief (**SW-14**).
 *   npm run city-game:scale-summer-s6
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUMMER_S6_DEBRIEF_PATH,
  validateSeasonSummerS6,
} from "./city-game-summer-s6-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const result = validateSeasonSummerS6(season);

  console.log("WS-SW summer S6 — post-season debrief (SW-14)");
  console.log("  Path:", SUMMER_S6_DEBRIEF_PATH);
  console.log("  Window ends:", season.window?.ends_at ?? "(missing)");
  console.log("  Patterns:", result.patternCount ?? 0);

  for (const i of result.issues) console.error("  fail:", i);

  if (!result.ok) {
    console.error("\n✗ summer S6 failed — npm run city-game:merge-summer-s6-debrief -- --write");
    process.exit(1);
  }

  console.log("\n☑ summer S6 — debrief page + season JSON ready.");
  console.log("  Pattern bodies gate until window.ends_at (no lecture during play).");
  console.log("  Doc: docs/CITY_GAME_SUMMER_MOMENTUM.md");
}

main();
