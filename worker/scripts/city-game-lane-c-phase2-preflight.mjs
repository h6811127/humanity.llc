#!/usr/bin/env node
/**
 * Lane C Phase 2 — physical install prep (B7 / O2 / C3).
 *   npm run city-game:lane-c-phase2-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessLaneC,
  seasonRegistryNodeCount,
} from "./city-game-lane-c-core.mjs";
import {
  assessInstallMapReady,
  INSTALL_MAP_REL,
  parseInstallMapRegistry,
} from "./city-game-install-map-core.mjs";
import {
  assessInstallQaEngineeringReady,
  INSTALL_QA_REL,
} from "./city-game-install-qa-core.mjs";
import { LANE_C_SUMMER_MARKETING_TARGET } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const installMapPath = join(root, INSTALL_MAP_REL);
const installQaPath = join(root, INSTALL_QA_REL);
const localSeedPath = join(root, "worker/.local/city-game-seed.json");

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const registry = seasonRegistryNodeCount(season);
  const installMapDoc = readFileSync(installMapPath, "utf8");
  const installQaDoc = existsSync(installQaPath) ? readFileSync(installQaPath, "utf8") : "";
  const localSeed = loadJson(localSeedPath);

  const map = assessInstallMapReady({
    installMapDoc,
    localSeed,
    requiredNodeCount: registry,
  });
  const c3 = assessInstallQaEngineeringReady({
    installQaDoc,
    localSeed,
    requiredNodeCount: registry,
  });
  const laneC = assessLaneC({ season, localSeed });

  console.log("Cedar Rapids · Lane C Phase 2 — physical install (B7)");
  console.log(`  Season registry: ${registry} nodes (summer target ${LANE_C_SUMMER_MARKETING_TARGET})`);
  console.log(`  Install map rows: ${map.rowCount}/${registry}`);
  console.log(`  Map QR issued: ${map.qrReady ? "☑" : "☐"}`);
  console.log(`  Map installed: ${map.installedReady ? "☑" : "☐"}`);
  console.log(`  Local seed URLs: ${localSeed ? (localSeed.nodes ?? []).filter((n) => n.scan_url || n.local_scan_url).length : 0}/${registry}`);
  console.log(`  C3 engineering: ${c3.ready ? "☑" : "☐"}`);
  console.log(`  B7 signed (human): ${laneC.humanB7 ? "☑" : "☐"}`);

  const blockers = [];
  if (registry < LANE_C_SUMMER_MARKETING_TARGET) {
    blockers.push(
      `npm run city-game:lane-c-bootstrap -- --write (${registry}/${LANE_C_SUMMER_MARKETING_TARGET} nodes)`
    );
  }
  if (map.rowCount < registry) {
    blockers.push("npm run city-game:sync-install-map -- --write");
  }
  if (!laneC.laneB.ok) {
    blockers.push("Lane B canon — npm run city-game:lane-c-bootstrap -- --write");
  }
  if (!c3.ready) blockers.push(...c3.issues);

  if (blockers.length) {
    console.log("\nEngineering blockers:");
    for (const b of blockers) console.log(`  • ${b}`);
    process.exit(1);
  }

  console.log("\n☑ Phase 2 engineering ready for field B7.");
  console.log("\nField kit:");
  console.log("  npm run city-game:seed-wave-open          # if seed < registry");
  console.log("  npm run city-game:install-map-sign-off -- --mark-qr-issued --apply");
  console.log("  npm run city-game:dev -- --lan");
  console.log("  npm run city-game:install-qa-walk -- --lan");
  console.log(`  npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes ${registry}`);
  console.log("\nPlaybook: docs/CITY_GAME_SUMMER_LANE_C.md § Phase 2");
}

main();
