/**
 * Hosted steward production rollout — step 6 (regression before steward announcement).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0):
 *   6. Run verify:hosted-g0 (Vitest) then e2e:steward-hosted (Playwright)
 *
 * Usage:
 *   npm run hosted:rollout:step6
 *   npm run hosted:rollout:step6 -- --verify       # vitest + e2e (full step 6)
 *   npm run hosted:rollout:step6 -- --vitest       # step 6a only (first)
 *   npm run hosted:rollout:step6 -- --e2e          # step 6b only
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Verification commands
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const verify = process.argv.includes("--verify");
const vitestOnly = process.argv.includes("--vitest");
const e2eOnly = process.argv.includes("--e2e");

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

function printRegressionChecklist() {
  console.log("Step 6a — Vitest regression (free-tier + hosted bundles)\n");
  console.log("   npm run verify:hosted-g0");
  console.log("   (= worker:test:hosted-free-tier + worker:test:steward-hosted)\n");
  console.log("Step 6b — Playwright hosted E2E\n");
  console.log("   npm run e2e:install   # once per machine");
  console.log("   npm run e2e:steward-hosted");
  console.log("   (= e2e:hosted-tier + e2e:hosted-tier-push)\n");
  console.log("Exit tests: docs/HOSTED_TIER_G0_READINESS.md § Exit tests mapped\n");
}

function main() {
  console.log("Hosted steward rollout — step 6 (regression)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  if (!verify && !vitestOnly && !e2eOnly) {
    printRegressionChecklist();
    console.log("⏭  Run full regression before announcing hosted steward to customers:");
    console.log("   npm run hosted:rollout:step6 -- --verify");
    console.log("   npm run hosted:rollout:step6 -- --vitest   # step 6a only");
    console.log("   npm run hosted:rollout:step6 -- --e2e      # step 6b only");
    return;
  }

  if (verify || vitestOnly) {
    runNpm("Step 6a — verify:hosted-g0", ["run", "verify:hosted-g0"]);
  }

  if (verify || e2eOnly) {
    runNpm("Step 6b — e2e:steward-hosted", ["run", "e2e:steward-hosted"]);
  }

  if (verify) {
    console.log("\n✅ Step 6 complete (Vitest + E2E). Hosted steward rollout checklist finished.");
  } else if (vitestOnly) {
    console.log("\n✅ Step 6a complete. Next: npm run hosted:rollout:step6 -- --e2e");
  } else if (e2eOnly) {
    console.log("\n✅ Step 6b complete.");
  }
}

main();
