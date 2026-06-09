#!/usr/bin/env node
/**
 * Rebuild DiscoveryPin index for Cedar Rapids (WS-DISCOVER-P0).
 *
 *   npm run discover:rebuild-pins
 *   npm run discover:rebuild-pins -- --check
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoveryPinIndexSitePath,
  projectDiscoveryPinIndexFromSeason,
  resolveDiscoveryRegionFromSeason,
} from "../../site/js/discovery-pin-projection-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const checkOnly = process.argv.includes("--check");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const index = projectDiscoveryPinIndexFromSeason(season);
const rel = discoveryPinIndexSitePath(season);
const outPath = join(root, rel);
const region = resolveDiscoveryRegionFromSeason(season);

console.log("DiscoveryPin rebuild (WS-DISCOVER-P0)\n");
console.log(`  Region:  ${region}`);
console.log(`  Pins:    ${index.pins.length}`);
console.log(`  Nodes:   ${Array.isArray(season.nodes) ? season.nodes.length : 0}`);
console.log(`  Version: ${index.index_version.slice(0, 48)}…`);

if (checkOnly) {
  try {
    const existing = JSON.parse(readFileSync(outPath, "utf8"));
    const same =
      existing.index_version === index.index_version &&
      existing.pins?.length === index.pins.length;
    if (!same) {
      console.error("\n✗ Pin index stale — run npm run discover:rebuild-pins");
      process.exit(1);
    }
    console.log("\n✅ Pin index matches season JSON");
    process.exit(0);
  } catch {
    console.error("\n✗ Missing pin index — run npm run discover:rebuild-pins");
    process.exit(1);
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`\n✅ Wrote ${rel}`);
