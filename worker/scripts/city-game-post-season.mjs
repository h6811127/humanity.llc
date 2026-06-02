#!/usr/bin/env node
/**
 * Mark Cedar Rapids season ended in season JSON (post-season close).
 *
 * Usage:
 *   npm run city-game:post-season -- --check
 *   npm run city-game:post-season -- --write
 *
 * Sets season.status = "ended" so scan/contribute show post-season copy.
 * Does not flip CITY_GAME_ENABLED or pause child objects — see operator runbook.
 *
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md § Post-season
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

const write = process.argv.includes("--write");
const check = process.argv.includes("--check") || !write;

const season = JSON.parse(readFileSync(seasonPath, "utf8"));

if (check && !write) {
  console.log("Season:", season.season_id);
  console.log("Status:", season.status ?? "(unset)");
  if (season.status === "ended") {
    console.log("\n✓ Season marked ended — scan window phase resolves to after.");
  } else {
    console.log("\nSeason still active/planned. Run with --write after the weekend closes.");
  }
  process.exit(0);
}

if (season.status === "ended") {
  console.log("Already ended — no change.");
  process.exit(0);
}

season.status = "ended";
season.ended_at = new Date().toISOString();
writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
console.log("Wrote", seasonPath, "→ status: ended");
console.log("\nNext: operator runbook post-season node pause / living-infra subset (Q5).");
