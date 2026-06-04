#!/usr/bin/env node
/**
 * Merge summer S5 faction badge + mobile lore enrollments into season JSON.
 * Usage: npm run city-game:merge-summer-s5-enrollment [-- --write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeSummerS5Enrollments,
  validateSeasonSummerS5,
} from "./city-game-summer-s5-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const write = process.argv.includes("--write");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const merged = mergeSummerS5Enrollments(season);
const check = validateSeasonSummerS5(merged);

if (!check.ok) {
  for (const i of check.issues) console.error(i);
  process.exit(1);
}

if (write) {
  writeFileSync(seasonPath, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(
    `Wrote ${seasonPath} — ${merged.mobile_lore_enrollment.length} mobile_lore_enrollment rows (${check.badgeCount} faction badges)`
  );
} else {
  console.log(
    `Dry run OK — would write ${merged.mobile_lore_enrollment.length} enrollments (${check.badgeCount} badges)`
  );
  console.log("Run: npm run city-game:merge-summer-s5-enrollment -- --write");
}
