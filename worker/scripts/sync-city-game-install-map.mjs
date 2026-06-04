#!/usr/bin/env node
/**
 * Sync install map registry from season JSON (wave-open rows).
 *   npm run city-game:sync-install-map [-- --write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { seasonRegistryNodeCount } from "./city-game-lane-c-core.mjs";
import {
  INSTALL_MAP_REL,
  parseInstallMapRegistry,
} from "./city-game-install-map-core.mjs";
import {
  syncInstallMapRegistrySection,
  updateInstallMapPhaseCGateLine,
} from "./city-game-install-map-sync-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const installMapPath = join(root, INSTALL_MAP_REL);
const write = process.argv.includes("--write");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const before = readFileSync(installMapPath, "utf8");
const beforeRows = parseInstallMapRegistry(before).length;
const merged = updateInstallMapPhaseCGateLine(
  syncInstallMapRegistrySection(before, season.nodes ?? []),
  seasonRegistryNodeCount(season)
);
const afterRows = parseInstallMapRegistry(merged).length;

if (!write) {
  console.log(
    `Dry run — install map ${beforeRows} → ${afterRows} rows (season ${season.nodes?.length ?? 0})`
  );
  console.log("Run: npm run city-game:sync-install-map -- --write");
  process.exit(0);
}

writeFileSync(installMapPath, merged, "utf8");
console.log(`Wrote ${installMapPath} — ${afterRows} registry rows`);
