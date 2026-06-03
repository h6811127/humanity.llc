#!/usr/bin/env node
/**
 * Point site season JSON at the profile from worker/.local/city-game-seed.json
 * (no re-mint). Fixes steward entitlements ?season_id= 403 after local seed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

if (!existsSync(seedPath)) {
  console.error("Missing %s — run: npm run city-game:seed-local", seedPath);
  process.exit(1);
}

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const profileId = seed.profile_id?.trim();
if (!profileId) {
  console.error("city-game-seed.json has no profile_id");
  process.exit(1);
}

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const previous = season.season_root_profile_id?.trim() || null;

if (previous === profileId) {
  console.log("Already aligned: season_root_profile_id = %s", profileId);
  process.exit(0);
}

season.season_root_profile_id = profileId;
writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);

console.log("Updated %s", seasonPath);
console.log("  was: %s", previous ?? "(null)");
console.log("  now: %s", profileId);
console.log("\nRestart worker:dev if it is running, then:");
console.log("  npm run hosted:steward-session-local");
