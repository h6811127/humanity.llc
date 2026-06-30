#!/usr/bin/env node
/**
 * Discovery plane regression belt — WS-DISCOVER P0–P3.
 *
 * Usage:
 *   npm run verify:discover           # Vitest + pin index + _headers
 *   npm run verify:discover -- --e2e  # + Playwright browse spec
 *
 * @see docs/DISCOVERY_PROJECTION.md
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const runE2e = process.argv.includes("--e2e");

/** @param {string} label @param {string[]} npmArgs */
function step(label, npmArgs) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync("npm", npmArgs, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n✗ Discovery gate failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Discovery plane verify (WS-DISCOVER P0–P3)");
console.log("Docs: docs/DISCOVERY_PROJECTION.md\n");

step("Pin index + redirects (discover:rebuild-pins --check)", [
  "run",
  "discover:rebuild-pins",
  "--",
  "--check",
]);

step("Discovery Vitest belt", [
  "run",
  "worker:test",
  "--",
  "worker/tests/discovery-pin-projection-core.test.ts",
  "worker/tests/discovery-public-listing-core.test.ts",
  "worker/tests/discovery-geo-projection-core.test.ts",
  "worker/tests/discovery-near-me-core.test.ts",
  "worker/tests/discovery-region-path-core.test.ts",
  "worker/tests/discovery-region-browse-core.test.ts",
  "worker/tests/discovery-pin-snapshot-core.test.ts",
  "worker/tests/discovery-redirects-sync-core.test.ts",
  "worker/tests/discovery-map-crosslink-core.test.ts",
  "worker/tests/discovery-standalone-object-core.test.ts",
  "worker/tests/discovery-regions-index-core.test.ts",
  "worker/tests/discovery-network-filter-core.test.ts",
  "worker/tests/discovery-primary-object-core.test.ts",
  "worker/tests/site-headers.test.ts",
]);

if (runE2e) {
  step("Playwright — discovery region browse", ["run", "e2e:discovery-region-browse"]);
}

console.log("\n✅ verify:discover complete.");
if (!runE2e) {
  console.log("   E2E skipped. Before merge: npm run verify:discover -- --e2e");
}
