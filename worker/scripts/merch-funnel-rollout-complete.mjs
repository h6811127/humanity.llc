/**
 * Merch funnel — engineering rollout complete (after steps 1–6).
 *
 * Runs step 6 regression and prints operator-only next steps (physical QA, live checkout).
 *
 * Usage:
 *   npm run merch-funnel:rollout:complete
 *   npm run merch-funnel:rollout:complete -- --preflight
 *   npm run merch-funnel:rollout:complete -- --verify
 *   SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:complete -- --verify --production
 *
 * @see docs/MERCH_FUNNEL_MVP.md § Operator close-out
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Production rollout commands
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const preflight = process.argv.includes("--preflight");
const verify = process.argv.includes("--verify");
const production = process.argv.includes("--production");

/**
 * @param {string[]} args
 */
function runNpm(args) {
  const result = spawnSync("npm", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printOperatorNextSteps() {
  console.log("\n--- Operator-only (not gated by this script) ---\n");
  console.log("  • Physical QA — docs/MERCH_PHYSICAL_QA_RUNBOOK.md");
  console.log("  • Paste Shopify variant URLs → site/data/shop-config.json");
  console.log("  • Tier 1 live checkout:");
  console.log("      npm run merch-funnel:verify-config -- --require-checkout");
  console.log("  • Glitch hoodie checkout:");
  console.log("      npm run merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1");
  console.log("  • One paid test order → webhook → mint → Printify (docs/MERCH_HEADLESS_COMMERCE.md)");
  console.log("\nProduction smoke after deploy:");
  console.log("  npm run merch-funnel:rollout:post-deploy -- --all");
}

function main() {
  console.log("Merch funnel rollout — engineering complete (steps 1–6 shipped in repo)");
  console.log("Docs: docs/MERCH_FUNNEL_MVP.md · docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md\n");

  if (preflight) {
    runNpm(["run", "merch-funnel:rollout:step6", "--", "--preflight"]);
    console.log("\n✅ Engineering preflight complete.");
    printOperatorNextSteps();
    return;
  }

  if (verify) {
    const step6Args = ["run", "merch-funnel:rollout:step6", "--", "--verify"];
    if (!production) {
      step6Args.push("--skip-production-smoke");
    }
    runNpm(step6Args);
    runNpm(["run", "worker:test", "--", "worker/tests/scan.test.ts", "-t", "merch"]);
    console.log("\n✅ Engineering rollout complete (step 6 + scan merch regression).");
    printOperatorNextSteps();
    return;
  }

  console.log("Run one of:");
  console.log("  npm run merch-funnel:rollout:complete -- --preflight");
  console.log("  npm run merch-funnel:rollout:complete -- --verify");
  console.log(
    "  SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:complete -- --verify --production"
  );
  printOperatorNextSteps();
}

main();
