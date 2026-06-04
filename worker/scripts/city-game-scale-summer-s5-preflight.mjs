#!/usr/bin/env node
/**
 * WS-SW summer S5 — faction badge enrollment (**SW-11** / **SW-15**).
 *   npm run city-game:scale-summer-s5
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUMMER_S5_FACTIONS,
  validateSeasonSummerS5,
} from "./city-game-summer-s5-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const result = validateSeasonSummerS5(season);

  console.log("WS-SW summer S5 — faction badges + mobile lore");
  console.log("  Factions:", SUMMER_S5_FACTIONS.join(", "));
  console.log(
    "  Enrollments:",
    (season.mobile_lore_enrollment ?? []).length,
    `(${result.badgeCount ?? 0} faction_badge)`
  );

  for (const i of result.issues) console.error("  fail:", i);

  if (!result.ok) {
    console.error("\n✗ summer S5 failed — npm run city-game:merge-summer-s5-enrollment -- --write");
    process.exit(1);
  }

  console.log("\n☑ summer S5 — badge enrollments on disk.");
  console.log("  Scan enrolled pa_* QRs when minted on owner profile.");
  console.log("  Add real hoodies: npm run city-game:enroll-mobile-lore -- --write --role faction_badge …");
  console.log("  Doc: docs/CITY_GAME_SUMMER_MOMENTUM.md");
}

main();
