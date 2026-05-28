/**
 * Steward roadmap step 3 — verify hosted path (Vitest + optional E2E).
 *
 * Per docs/STEWARD_DEVICE_ROADMAP.md § Current engineering steps #3:
 *   Entitlements probe, session link, push policy, free-tier regression (H1–H6).
 *
 * Usage:
 *   npm run hosted:rollout:verify-path
 *   npm run hosted:rollout:verify-path -- --e2e
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Verification commands
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Epic E2 / E4 exit tests
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const runE2e = process.argv.includes("--e2e");

/**
 * @param {string} label
 * @param {string[]} args
 */
function runNpm(label, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("Hosted steward — verify path (roadmap step 3)");
  console.log("Docs: docs/STEWARD_DEVICE_ROADMAP.md · docs/HOSTED_TIER_G0_READINESS.md\n");

  runNpm("G0 Vitest bundle (verify:hosted-g0)", ["run", "verify:hosted-g0"]);
  runNpm("Steward session link (device-steward-session-core)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/device-steward-session-core.test.ts",
  ]);
  runNpm("Stripe checkout return URL (device-steward-billing-return-core)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/device-steward-billing-return-core.test.ts",
  ]);
  runNpm("Child object status plate + scan QR", [
    "run",
    "worker:test",
    "--",
    "worker/tests/created-child-object.test.ts",
    "worker/tests/child-objects.test.ts",
    "worker/tests/issue-child-object-qr.test.ts",
  ]);
  runNpm("Rollout step3a smoke (unit)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rollout-step3a-smoke.test.ts",
    "worker/tests/hosted-rollout-step3a.test.ts",
  ]);
  runNpm("Rollout step4 smoke (unit)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rollout-step4-smoke.test.ts",
    "worker/tests/hosted-rollout-step4.test.ts",
  ]);

  if (runE2e) {
    runNpm("Hosted steward E2E (e2e:steward-hosted)", ["run", "e2e:steward-hosted"]);
  } else {
    console.log("\nPlaywright (optional, before announcing hosted):");
    console.log("  npm run e2e:install   # once per machine");
    console.log("  npm run hosted:rollout:verify-path -- --e2e");
  }

  console.log(
    "\n✅ Roadmap step 3 Vitest complete. Production rollout remains step 2 in HOSTED_TIER_IMPLEMENTATION_EPICS.md."
  );
}

main();
