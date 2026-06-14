#!/usr/bin/env node
/**
 * Align site season JSON with a local seed profile (no re-mint).
 *
 *   npm run city-game:sync-season-root              # local dev seed
 *   npm run city-game:sync-season-root -- --production   # production mint artifact
 *
 * Local: worker/.local/city-game-seed.json
 * Production: worker/.local/city-game-production-seed.json (requires prior seed-production)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applySeasonRootSync,
  shouldRefuseLocalSeasonRootSync,
} from "./city-game-sync-season-root-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const useProduction = process.argv.includes("--production");
const forceLocal = process.argv.includes("--force-local");
const seedPath = join(
  root,
  useProduction
    ? "worker/.local/city-game-production-seed.json"
    : "worker/.local/city-game-seed.json"
);
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

if (!existsSync(seedPath)) {
  console.error(
    "Missing %s — run: npm run city-game:seed-%s",
    seedPath,
    useProduction ? "production -- --confirm-production" : "local"
  );
  process.exit(1);
}

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const season = JSON.parse(readFileSync(seasonPath, "utf8"));

if (shouldRefuseLocalSeasonRootSync({ useProduction, forceLocal, season })) {
  console.error(
    "Refusing to sync local seed into production-bound season JSON. Use --production for the production seed, or --force-local when intentionally rewriting local dev URLs."
  );
  process.exit(1);
}

let result;
try {
  result = applySeasonRootSync({ season, seed });
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

writeFileSync(seasonPath, `${JSON.stringify(result.season, null, 2)}\n`);

console.log(
  useProduction ? "Synced season JSON from production seed" : "Synced season JSON from local seed"
);
console.log("  path: %s", seasonPath);
console.log("  season_root_profile_id was: %s", result.previous ?? "(null)");
console.log("  season_root_profile_id now: %s", result.profileId);
if (useProduction) {
  console.log("  scan_url rows updated: %d", result.scanUrlsUpdated);
  console.log("  network_charter.game_node_scan_url → node_04 production scan");
}
console.log("\nNext:");
console.log("  npm run city-game:build-registry");
console.log("  npm run discover:rebuild-pins");
if (useProduction) {
  console.log("  npm run worker:deploy   # bundle season JSON for snapshot nodes[]");
} else {
  console.log("  Restart worker:dev if running, then npm run hosted:steward-session-local");
}
