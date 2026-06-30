#!/usr/bin/env node
/**
 * Agent D — public network player flow regression (discover → board → scan shells).
 *
 * Usage:
 *   npm run verify:public-network-player-flow:fast
 *   npm run verify:public-network-player-flow        # + Playwright integrator e2e
 *   npm run verify:public-network-player-flow:production  # post-deploy HTML fetch
 *
 * @see site/js/public-network-player-nav-core.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const full = process.argv.includes("--full");
const runE2e = process.argv.includes("--e2e") || full;

/** @param {string} label @param {string[]} npmArgs */
function step(label, npmArgs) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", npmArgs, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n✗ Player flow gate failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Public network player flow verify");
console.log("Surfaces: / · /play/season/ · /play/cedar-rapids/ · map · /discover/*\n");

step("Player flow shell Vitest", [
  "run",
  "worker:test",
  "--",
  "worker/tests/public-network-player-flow-pages.test.ts",
  "worker/tests/public-network-player-flow-contract.test.ts",
  "worker/tests/public-network-player-nav-core.test.ts",
  "worker/tests/public-networks-portal-core.test.ts",
  "worker/tests/play-season-public-networks-page.test.ts",
  "worker/tests/city-game-map-first-visit-banner-core.test.ts",
  "worker/tests/city-game-map-page-core.test.ts",
  "worker/tests/city-game-map-page-scaffold-core.test.ts",
  "worker/tests/city-game-play-page-scaffold-core.test.ts",
  "worker/tests/public-network-player-flow-field-kit-core.test.ts",
  "worker/tests/public-network-player-flow-sign-off-core.test.ts",
  "worker/tests/public-network-player-flow-scan-onboarding.test.ts",
  "worker/tests/city-game-reference-network-core.test.ts",
]);

if (full) {
  step("Landing copy contract (homepage discovery entry)", ["run", "verify:landing"]);
  step("LO-4 reference network kit (--check)", [
    "run",
    "city-game:reference-network-kit",
    "--",
    "--check",
  ]);
  step("Player flow field walk kit (--check)", ["run", "player-flow:field-kit:check"]);
  step("C2 comprehension kit player flow link", [
    "run",
    "worker:test",
    "--",
    "worker/tests/city-game-comprehension-kit-core.test.ts",
  ]);
  step("Player flow preflight (kit + install QA markers)", ["run", "player-flow:preflight"]);
  step("Game scan onboarding capture (PD-5)", ["run", "city-game:capture-scan-onboarding"]);
}

if (runE2e) {
  step("Playwright — player flow integrator", ["run", "e2e:public-network-player-flow"]);
}

console.log("\n✅ Public network player flow gate passed.");
if (!runE2e) {
  console.log("   E2E skipped. Pre-merge: npm run verify:public-network-player-flow");
}
