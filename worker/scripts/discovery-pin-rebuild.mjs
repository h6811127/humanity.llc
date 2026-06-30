#!/usr/bin/env node
/**
 * Rebuild DiscoveryPin index for Cedar Rapids (WS-DISCOVER-P0 · P1-2 geo · P1-6 standalone).
 * Syncs per-region pin share splats in site/_redirects.
 *
 *   npm run discover:rebuild-pins
 *   npm run discover:rebuild-pins -- --check
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverPinRedirectsInSync,
  discoveryRegionsFromPinIndexes,
  slugFromDiscoveryIndexFilename,
  syncDiscoverPinRedirectsInFile,
} from "../../site/js/discovery-redirects-sync-core.mjs";
import {
  discoveryPinIndexSitePath,
  finalizeDiscoveryPinIndex,
  projectDiscoveryPinIndexFromSeason,
  resolveDiscoveryRegionFromSeason,
} from "../../site/js/discovery-pin-projection-core.mjs";
import {
  discoveryStandaloneObjectsSitePath,
  mergeStandaloneDiscoveryPins,
  parseDiscoveryStandaloneObjectsManifest,
  projectDiscoveryPinsFromStandaloneObjects,
} from "../../site/js/discovery-standalone-object-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const redirectsPath = join(root, "site/_redirects");
const dataDir = join(root, "site/data");
const checkOnly = process.argv.includes("--check");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const region = resolveDiscoveryRegionFromSeason(season);
const rel = discoveryPinIndexSitePath(season);
const outPath = join(root, rel);

/**
 * @param {string} slug
 */
function loadStandaloneObjectsForRegion(slug) {
  const relPath = discoveryStandaloneObjectsSitePath(slug);
  if (!relPath) return [];
  const filePath = join(root, relPath);
  if (!existsSync(filePath)) return [];
  const manifest = parseDiscoveryStandaloneObjectsManifest(JSON.parse(readFileSync(filePath, "utf8")));
  if (manifest.region && manifest.region !== slug) {
    console.warn(`  Standalone manifest region mismatch: ${manifest.region} vs ${slug}`);
  }
  return manifest.objects;
}

/**
 * @returns {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPinIndex}
 */
function buildDiscoveryPinIndex() {
  const seasonIndex = projectDiscoveryPinIndexFromSeason(season);
  const standaloneObjects = loadStandaloneObjectsForRegion(region);
  const standalonePins = projectDiscoveryPinsFromStandaloneObjects(
    standaloneObjects,
    region,
    seasonIndex.index_version
  );
  const mergedPins = mergeStandaloneDiscoveryPins(seasonIndex.pins, /** @type {typeof seasonIndex.pins} */ (standalonePins));
  return finalizeDiscoveryPinIndex(mergedPins, region);
}

const index = buildDiscoveryPinIndex();

console.log("DiscoveryPin rebuild (WS-DISCOVER-P0)\n");
console.log(`  Region:  ${region}`);
console.log(`  Pins:    ${index.pins.length}`);
console.log(`  Nodes:   ${Array.isArray(season.nodes) ? season.nodes.length : 0}`);
console.log(`  Version: ${index.index_version.slice(0, 48)}…`);

/**
 * @returns {string[]}
 */
function listDiscoveryRegionsOnDisk() {
  /** @type {Array<{ region?: string; filename?: string }>} */
  const rows = [];
  for (const name of readdirSync(dataDir)) {
    if (!name.startsWith("discovery-") || !name.endsWith(".json")) continue;
    if (name.startsWith("discovery-standalone-")) continue;
    const path = join(dataDir, name);
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      rows.push({ region: parsed.region, filename: name });
    } catch {
      rows.push({ filename: name });
    }
  }
  if (!rows.some((row) => row.region === region || slugFromDiscoveryIndexFilename(row.filename) === region)) {
    rows.push({ region, filename: rel.split("/").pop() });
  }
  return discoveryRegionsFromPinIndexes(rows);
}

function syncRedirects(regions) {
  const before = readFileSync(redirectsPath, "utf8");
  const after = syncDiscoverPinRedirectsInFile(before, regions);
  if (after !== before) {
    writeFileSync(redirectsPath, after, "utf8");
    console.log(`  Redirects: synced ${regions.length} region(s) in site/_redirects`);
  } else {
    console.log(`  Redirects: already synced (${regions.length} region(s))`);
  }
}

const regions = listDiscoveryRegionsOnDisk();

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
    const redirects = readFileSync(redirectsPath, "utf8");
    if (!discoverPinRedirectsInSync(redirects, regions)) {
      console.error("\n✗ Discovery pin redirects stale — run npm run discover:rebuild-pins");
      process.exit(1);
    }
    console.log("\n✅ Pin index and redirects match season JSON");
    process.exit(0);
  } catch {
    console.error("\n✗ Missing pin index — run npm run discover:rebuild-pins");
    process.exit(1);
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`\n✅ Wrote ${rel}`);
syncRedirects(regions);
