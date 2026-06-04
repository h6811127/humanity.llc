#!/usr/bin/env node
/**
 * WS-LIVE regression belt — physical software objects + five-layer stack + city game.
 *
 *   npm run verify:live:fast    # desk fast + live-object vitest + city-game (no e2e)
 *   npm run verify:live         # desk full + live-object + city-game + LO-1 e2e + preflight
 *
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-LIVE regression block
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const fast = argv.includes("--fast") || !argv.includes("--full");

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
    console.error(`\n✗ WS-LIVE gate failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("WS-LIVE regression belt");
console.log("Docs: docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-LIVE\n");
if (fast) console.log("Mode: fast (no full Playwright suite)\n");

step("Desk belt", fast ? ["run", "verify:desk:fast"] : ["run", "verify:desk"]);

step("Live-object five-layer vitest", [
  "run",
  "worker:test",
  "--",
  "worker/tests/live-object-compose-child-scan.test.ts",
  "worker/tests/live-object-compose-card-scan.test.ts",
  "worker/tests/live-object-scan-capabilities.test.ts",
  "worker/tests/live-object-stream-policy.test.ts",
  "worker/tests/live-object-time-policy.test.ts",
  "worker/tests/live-object-custody.test.ts",
  "worker/tests/live-object-network-graph.test.ts",
  "worker/tests/live-object-staleness-contract.test.ts",
  "worker/tests/live-object-delegation-spec.test.ts",
  "worker/tests/live-object-succession-spec.test.ts",
  "worker/tests/live-object-child-scan.test.ts",
  "worker/tests/ws-live-preflight-core.test.ts",
  "worker/tests/created-child-object-add-hub-core.test.ts",
  "worker/tests/site-showcase-data.test.ts",
]);

step("City game verify", ["run", "verify:city-game", "--", "--skip-tests"]);

step("WS-LIVE LO-1 kit (generate)", ["run", "ws-live:lo1-kit"]);

if (!fast) {
  step("Playwright — scan page dot", ["run", "e2e:scan-page-dot"]);
  step("Playwright — live control loop", ["run", "e2e:live-control-loop"]);
  step("Playwright — created control (status plate update)", [
    "run",
    "e2e",
    "--",
    "e2e/created-control.spec.ts",
  ]);
}

step("WS-LIVE preflight (--strict)", ["run", "ws-live:preflight", "--", "--strict"]);

console.log("\n✓ WS-LIVE regression belt passed\n");
