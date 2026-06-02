#!/usr/bin/env node
/**
 * Cedar Rapids city game regression bundle (Phase C/D exit gate).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const skipTests = process.argv.includes("--skip-tests");
const requireLaunch = process.argv.includes("--require-launch");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

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
    "worker/tests/city-game-seed-site-codes.test.ts",
    "worker/tests/city-game-smoke-contribute-core.test.ts",
    "worker/tests/city-game-season-registry.test.ts",
    "worker/tests/unlock-engine.test.ts",
    "worker/tests/vouch-graph.test.ts",
    "worker/tests/city-game-launch-gates.test.ts",
    "worker/tests/city-game-smoke-local-core.test.ts",
    "worker/tests/game-operator-core.test.ts",
  ]);
}

console.log("\n=== city-game season verify ===\n");
const verifyArgs = ["worker/scripts/verify-city-game-season.mjs"];
if (requireLaunch) verifyArgs.push("--require-launch");
run("node", verifyArgs);

console.log("\n✅ verify:city-game complete.");
