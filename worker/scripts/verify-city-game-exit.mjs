#!/usr/bin/env node
/**
 * Cedar Rapids city game regression bundle (Phase C/D exit gate).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUMMER_OPEN_NODE_COUNT,
  SUMMER_WAVE_OPEN_NODE_COUNT,
} from "./city-game-summer-scale-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const skipTests = process.argv.includes("--skip-tests");
const requireLaunch = process.argv.includes("--require-launch");
const runE2e = process.argv.includes("--e2e");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const nodeCount = Array.isArray(season.nodes) ? season.nodes.length : 0;
const allowedCounts = new Set([SUMMER_OPEN_NODE_COUNT, SUMMER_WAVE_OPEN_NODE_COUNT]);
if (!allowedCounts.has(nodeCount)) {
  console.error(
    `\nSeason JSON has ${nodeCount} nodes in ${seasonPath} (expected ${SUMMER_OPEN_NODE_COUNT} pilot or ${SUMMER_WAVE_OPEN_NODE_COUNT} wave-open).`
  );
  if (nodeCount === SUMMER_OPEN_NODE_COUNT) {
    console.error("Run: npm run city-game:merge-wave-open -- --write");
    console.error("Then: npm run city-game:build-registry\n");
  } else {
    console.error("Fix season registry or restore pilot spine before continuing.\n");
  }
  process.exit(1);
}

console.log("=== city-game build registry ===\n");
run("npm", ["run", "city-game:build-registry"]);

if (!skipTests) {
  console.log("=== city-game vitest ===\n");
  run("npm", [
    "run",
    "worker:test",
    "--",
    "worker/tests/city-game.test.ts",
    "worker/tests/city-game-scan.test.ts",
    "worker/tests/city-game-contribute.test.ts",
    "worker/tests/city-game-season-window.test.ts",
    "worker/tests/city-game-season-readiness.test.ts",
    "worker/tests/network-graph-core.test.ts",
    "worker/tests/city-game-seed-site-codes.test.ts",
    "worker/tests/city-game-smoke-contribute-core.test.ts",
    "worker/tests/city-game-season-registry.test.ts",
    "worker/tests/city-game-season-loader.test.ts",
    "worker/tests/city-game-season-entitlements.test.ts",
    "worker/tests/city-game-season-entitlements-api.test.ts",
    "worker/tests/city-game-season-entitlements-core.test.ts",
    "worker/tests/city-game-season-path-core.test.ts",
    "worker/tests/unlock-engine.test.ts",
    "worker/tests/relay-contribute.test.ts",
    "worker/tests/relay-decay-cron.test.ts",
    "worker/tests/unlock-evaluator.test.ts",
    "worker/tests/vouch-graph.test.ts",
    "worker/tests/city-game-launch-gates.test.ts",
    "worker/tests/city-game-smoke-local-core.test.ts",
    "worker/tests/game-operator-core.test.ts",
    "worker/tests/city-game-mobile-lore.test.ts",
    "worker/tests/city-game-mobile-lore-core.test.ts",
    "worker/tests/city-game-game-theory.test.ts",
    "worker/tests/city-game-launch-surfaces.test.ts",
    "worker/tests/scan-game-scarcity-ceiling-core.test.ts",
    "worker/tests/resolver-origin.test.ts",
    "worker/tests/city-game-lan-hub-core.test.ts",
    "worker/tests/city-game-local-env-core.test.ts",
    "worker/tests/city-game-comprehension-kit-core.test.ts",
    "worker/tests/city-game-install-qa-core.test.ts",
    "worker/tests/city-game-install-qa-scenario-core.test.ts",
    "worker/tests/city-game-install-qa-walk-core.test.ts",
    "worker/tests/city-game-install-map-core.test.ts",
    "worker/tests/city-game-operator-ops-core.test.ts",
    "worker/tests/city-game-launch-checklist-core.test.ts",
    "worker/tests/city-game-map-board-b13-core.test.ts",
    "worker/tests/city-game-smoke-production-core.test.ts",
    "worker/tests/city-game-bulletin-schedule.test.ts",
    "worker/tests/city-game-route-window-schedule.test.ts",
    "worker/tests/city-game-player-guide-core.test.ts",
    "worker/tests/city-game-play-page-core.test.ts",
    "worker/tests/city-game-map-page-core.test.ts",
    "worker/tests/city-game-map-board-core.test.ts",
    "worker/tests/city-game-map-explore-core.test.ts",
    "worker/tests/city-game-map-filter-core.test.ts",
    "worker/tests/city-game-map-interaction-core.test.ts",
    "worker/tests/live-map-ticker.test.ts",
    "worker/tests/city-game-season-snapshot.test.ts",
    "worker/tests/map-fog-filter.test.ts",
    "worker/tests/dual-victory.test.ts",
    "worker/tests/faction-network-score.test.ts",
    "worker/tests/city-game-faction-badge.test.ts",
    "worker/tests/city-game-debrief-core.test.ts",
    "worker/tests/map-node-snapshot.test.ts",
    "worker/tests/city-game-map-snapshot-core.test.ts",
    "worker/tests/city-game-contribute-load.test.ts",
    "worker/tests/quorum-contribute.test.ts",
    "worker/tests/city-game-vouch-copy.test.ts",
    "worker/tests/city-game-scan-analytics-gate.test.ts",
    "worker/tests/city-game-scaffold-play-core.test.ts",
    "worker/tests/city-game-rules-publish-core.test.ts",
    "worker/tests/city-game-season-setup-guide-core.test.ts",
    "worker/tests/city-game-season-template-core.test.ts",
    "worker/tests/city-game-terminal-mint-deprecation-core.test.ts",
    "worker/tests/city-game-self-serve-staging-core.test.ts",
    "worker/tests/created-child-object-game-node-print-pack-core.test.ts",
  ]);
}

console.log("\n=== city-game season verify ===\n");
const verifyArgs = ["worker/scripts/verify-city-game-season.mjs"];
if (requireLaunch) verifyArgs.push("--require-launch");
run("node", verifyArgs);

console.log("\n=== city-game scaffold play pages ===\n");
run("node", ["worker/scripts/city-game-scaffold-play.mjs", "--all", "--check"]);

if (runE2e) {
  console.log("\n=== city-game self-serve setup e2e ===\n");
  run("npm", ["run", "e2e:city-game-self-serve-setup"]);
}

console.log("\n✅ verify:city-game complete.");
