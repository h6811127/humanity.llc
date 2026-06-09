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

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const useProduction = process.argv.includes("--production");
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
const profileId = seed.profile_id?.trim();
if (!profileId) {
  console.error("Seed has no profile_id");
  process.exit(1);
}

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const previous = season.season_root_profile_id?.trim() || null;

/** @type {Map<string, { scan_url?: string; qr_id?: string }>} */
const seedByNode = new Map(
  (Array.isArray(seed.nodes) ? seed.nodes : [])
    .filter((row) => row?.node_id)
    .map((row) => [String(row.node_id), row])
);

let scanUrlsUpdated = 0;
if (Array.isArray(season.nodes)) {
  for (const node of season.nodes) {
    const nodeId = String(node?.node_id ?? "").trim();
    const seedRow = seedByNode.get(nodeId);
    if (!seedRow?.scan_url) continue;
    if (node.scan_url !== seedRow.scan_url) {
      node.scan_url = seedRow.scan_url;
      scanUrlsUpdated += 1;
    }
    if (seedRow.qr_id && node.qr_id !== seedRow.qr_id) {
      node.qr_id = seedRow.qr_id;
    }
  }
}

const node04 = seedByNode.get("node_04");
if (
  node04?.scan_url &&
  season.network_charter &&
  typeof season.network_charter === "object"
) {
  season.network_charter.game_node_scan_url = node04.scan_url;
}

season.season_root_profile_id = profileId;
writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);

console.log(
  useProduction ? "Synced season JSON from production seed" : "Synced season JSON from local seed"
);
console.log("  path: %s", seasonPath);
console.log("  season_root_profile_id was: %s", previous ?? "(null)");
console.log("  season_root_profile_id now: %s", profileId);
if (useProduction) {
  console.log("  scan_url rows updated: %d", scanUrlsUpdated);
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
