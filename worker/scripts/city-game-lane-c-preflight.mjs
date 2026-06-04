#!/usr/bin/env node
/**
 * Lane C summer momentum — one status report for field + launch gates.
 *   npm run city-game:lane-c-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessLaneC, formatLaneCPreflightReport } from "./city-game-lane-c-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const wranglerPath = join(root, "worker/wrangler.toml");

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const report = assessLaneC({
    season,
    localSeed: loadJson(seedPath),
    productionSeed: loadJson(prodSeedPath),
    wranglerToml: existsSync(wranglerPath) ? readFileSync(wranglerPath, "utf8") : "",
  });

  console.log(formatLaneCPreflightReport(report));

  const engineeringFail = !report.laneB.ok || !report.c3.ready || report.surfaces.issues.length > 0;
  if (engineeringFail) process.exit(1);
}

main();
