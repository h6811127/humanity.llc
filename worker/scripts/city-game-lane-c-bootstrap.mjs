#!/usr/bin/env node
/**
 * Lane C Phase 0 — engineering bootstrap (registry 40 + summer S2–S6 canon).
 *   npm run city-game:lane-c-bootstrap
 *   npm run city-game:lane-c-bootstrap -- --write
 *
 * Does not mint D1 objects or sign human gates (B7, C5).
 * @see docs/CITY_GAME_SUMMER_LANE_C.md § Phase 0–1
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { mergeSummerS5Enrollments, validateSeasonSummerS5 } from "./city-game-summer-s5-core.mjs";
import { validateSeasonSummerS6 } from "./city-game-summer-s6-core.mjs";
import {
  syncInstallMapRegistrySection,
  updateInstallMapPhaseCGateLine,
} from "./city-game-install-map-sync-core.mjs";
import {
  INSTALL_MAP_REL,
} from "./city-game-install-map-core.mjs";
import { assessLaneBMomentum, seasonRegistryNodeCount } from "./city-game-lane-c-core.mjs";
import {
  CR_SEASON_PATH,
  loadAndMergeWaveOpenSeason,
} from "./merge-city-game-wave-open.mjs";
import { SUMMER_OPEN_NODE_COUNT } from "./city-game-summer-scale-core.mjs";
import { mergeSummerS2 } from "./city-game-summer-s2-core.mjs";
import { mergeSummerS3BulletinSchedule } from "./city-game-summer-s3-core.mjs";
import { mergeSummerS4 } from "./city-game-summer-s4-core.mjs";
import { mergeSummerS6Debrief } from "./city-game-summer-s6-core.mjs";
import { validateSeasonSummerS2 } from "./city-game-summer-s2-core.mjs";
import { validateSeasonSummerS3 } from "./city-game-summer-s3-core.mjs";
import { validateSeasonSummerS4 } from "./city-game-summer-s4-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const write = process.argv.includes("--write");

function loadSeason() {
  return JSON.parse(readFileSync(CR_SEASON_PATH, "utf8"));
}

/**
 * @param {Record<string, unknown>} season
 */
function applySummerCanonMerges(season) {
  if (!season.signal_war || typeof season.signal_war !== "object") {
    season.signal_war = {};
  }
  season.signal_war.summer_s3 = {
    friday_interval_hours: 168,
    bulletin_nodes: ["node_01", "node_05", "node_15", "node_21", "node_22", "node_31"],
    min_weekly_beats: 5,
  };
  let merged = mergeSummerS2(season);
  merged = mergeSummerS3BulletinSchedule(merged);
  merged = mergeSummerS4(merged);
  merged = mergeSummerS5Enrollments(merged);
  merged = mergeSummerS6Debrief(merged);
  return merged;
}

function main() {
  let season = loadSeason();
  const steps = [];

  if (seasonRegistryNodeCount(season) < SUMMER_OPEN_NODE_COUNT) {
    steps.push(`wave-open merge (${seasonRegistryNodeCount(season)} → ${SUMMER_OPEN_NODE_COUNT} nodes)`);
    if (write) {
      season = loadAndMergeWaveOpenSeason({ write: true });
    } else {
      season = loadAndMergeWaveOpenSeason({ write: false });
    }
  }

  steps.push("summer S2–S6 canon on season JSON");
  if (write) steps.push("install map registry sync");
  season = applySummerCanonMerges(season);

  const laneB = assessLaneBMomentum(season);
  const s5 = validateSeasonSummerS5(season);
  const s6 = validateSeasonSummerS6(season);

  if (write) {
    writeFileSync(CR_SEASON_PATH, `${JSON.stringify(season, null, 2)}\n`);
    console.log(`Wrote ${CR_SEASON_PATH} — ${season.nodes.length} nodes`);

    const installMapPath = join(root, INSTALL_MAP_REL);
    let installMapDoc = readFileSync(installMapPath, "utf8");
    installMapDoc = updateInstallMapPhaseCGateLine(
      syncInstallMapRegistrySection(installMapDoc, season.nodes ?? []),
      season.nodes.length
    );
    writeFileSync(installMapPath, installMapDoc, "utf8");
    console.log(`Wrote ${installMapPath} — ${season.nodes.length} registry rows`);
  } else {
    console.log(
      `Dry run — would write ${season.nodes.length} nodes + Lane B canon. Pass --write to apply.`
    );
  }

  console.log("\nLane C bootstrap steps:");
  for (const s of steps) console.log(`  • ${s}`);

  const issues = [
    ...laneB.issues,
    ...s5.issues,
    ...s6.issues,
  ];
  if (issues.length) {
    console.error("\nValidation issues:");
    for (const i of issues) console.error(`  • ${i}`);
    process.exit(1);
  }

  console.log(`\n☑ Season JSON ready for Lane C (${season.nodes.length} nodes, Lane B canon).`);
  console.log("\nNext (field):");
  console.log("  npm run city-game:build-registry");
  console.log("  node worker/scripts/spread-city-game-map-layout.mjs --write");
  console.log("  npm run city-game:seed-local -- --write-season   # or seed-wave-open if spine exists");
  console.log("  npm run city-game:dev -- --lan");
  console.log("  npm run city-game:install-qa-walk -- --lan");
  console.log("  npm run city-game:lane-c-preflight");
  console.log("\nPlaybook: docs/CITY_GAME_SUMMER_LANE_C.md");

  if (!write) process.exit(0);
}

main();
