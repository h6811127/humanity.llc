#!/usr/bin/env node
/**
 * Merge summer S6 debrief canon into season JSON.
 * Usage: npm run city-game:merge-summer-s6-debrief [-- --write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeSummerS6Debrief,
  validateSeasonSummerS6,
} from "./city-game-summer-s6-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const write = process.argv.includes("--write");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const merged = mergeSummerS6Debrief(season);
const check = validateSeasonSummerS6(merged);

if (!check.ok) {
  for (const i of check.issues) console.error(i);
  process.exit(1);
}

if (write) {
  writeFileSync(seasonPath, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(
    `Wrote ${seasonPath} — debrief_path + ${check.patternCount} game_theory_patterns`
  );
} else {
  console.log(
    `Dry run OK — would set debrief_path and ${check.patternCount} patterns`
  );
  console.log("Run: npm run city-game:merge-summer-s6-debrief -- --write");
}
