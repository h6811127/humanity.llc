#!/usr/bin/env node
/**
 * Cross-surface desk regression belt — one command before merge / in CI.
 *
 * Usage:
 *   npm run verify:desk              # Vitest belt + core E2E + build
 *   npm run verify:desk:fast         # Vitest belt only (CI default)
 *   npm run verify:desk -- --fast
 *   npm run verify:desk -- --full    # default belt + full Playwright suite
 *   npm run verify:desk -- --custody # + custody preflight / Vitest / E2E
 *   npm run verify:desk -- --city-game
 *
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md · .github/workflows/verify-desk.yml
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const argv = process.argv.slice(2);
const fast = argv.includes("--fast");
const full = argv.includes("--full");
const custody = argv.includes("--custody");
const cityGame = argv.includes("--city-game");

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
    console.error(`\n✗ Desk gate failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Humanity desk regression belt");
console.log("Docs: docs/PRODUCT_WORKSTREAM_COORDINATION.md · PR template\n");
if (fast) console.log("Mode: --fast (Vitest + verify:fast exits, no Playwright)\n");
if (full) console.log("Mode: --full (+ entire Playwright suite)\n");
if (custody) console.log("Mode: --custody\n");
if (cityGame) console.log("Mode: --city-game\n");

step("Vitest (full worker/tests)", ["run", "worker:test"]);

step("Hub card disappeared (fast)", ["run", "hub-card-disappeared:verify:fast"]);
step("Steward scan handoff (fast)", ["run", "steward-scan-handoff:verify:fast"]);
step("Merch funnel exit (fast)", ["run", "merch-funnel:verify-exit:fast"]);

step("Ownership restore Vitest", ["run", "worker:test:view-only-restore"]);
step("Hub restore Vitest", ["run", "worker:test:hub-restore-always"]);

step("Safari keys / tab session Vitest", [
  "run",
  "worker:test",
  "--",
  "worker/tests/device-quiet-tab-rehydrate.test.ts",
  "worker/tests/device-tab-session.test.ts",
  "worker/tests/device-wallet-save-core.test.ts",
]);

step("Shell boot + status graph modules", ["run", "worker:test:shell-boot"]);

step("Landing copy contract (sticker hero + launch doors)", ["run", "verify:landing"]);

if (custody) {
  step("Custody C1 preflight", ["run", "custody:c1-preflight"]);
  step("Custody Vitest", ["run", "worker:test:custody"]);
}

if (cityGame) {
  step("City game verify", ["run", "verify:city-game"]);
}

step("Static site build check", ["run", "build"]);

if (!fast) {
  step("Playwright — safari keys persistence", ["run", "e2e:safari-keys-persistence"]);
  step("Playwright — scan page dot", ["run", "e2e:scan-page-dot"]);
  step("Playwright — scan revoke freshness (M3.6)", ["run", "e2e:scan-revoke-freshness"]);
  step("Playwright — key-loss sad path", ["run", "e2e:key-loss-sad-path"]);
  step("Playwright — status dot + inbox", [
    "run",
    "e2e",
    "--",
    "e2e/device-status-dot.spec.ts",
    "e2e/device-inbox.spec.ts",
  ]);
  if (custody) {
    step("Playwright — custody device unlock", ["run", "e2e:custody-device-unlock"]);
  }
}

if (full) {
  step("Playwright — full suite", ["run", "e2e"]);
}

console.log("\n✅ Desk regression belt passed.");
if (fast) {
  console.log("   E2E skipped (--fast). Before merge: npm run verify:desk");
}
console.log("   Post-deploy: docs/DEVICE_OS_QA.md P0 (especially P0-3, P0-W on production WebKit).");
