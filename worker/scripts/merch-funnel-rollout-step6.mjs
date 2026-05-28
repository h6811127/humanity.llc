/**
 * Merch funnel close-out — step 6 (full regression before live payments).
 *
 * Runs merch funnel Vitest bundles + customize E2E.
 *
 * Usage:
 *   npm run merch-funnel:rollout:step6
 *   npm run merch-funnel:rollout:step6 -- --verify
 *   npm run merch-funnel:rollout:step6 -- --vitest
 *   npm run merch-funnel:rollout:step6 -- --e2e
 *
 * @see docs/MERCH_FUNNEL_MVP.md § Exit checklist
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
  console.log("Step 6 — full merch funnel regression\n");
  console.log("  npm run verify:merch-funnel");
  console.log("    (= worker:test:merch-funnel + worker:test:merch-print-qa + shop-config rollout tests)");
  console.log("  npm run e2e:merch-funnel");
  console.log("\nOperator smoke (after deploy):");
  console.log("  npm run merch-funnel:rollout:step2 -- --verify --strict");
  console.log("  API_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step3 -- --verify");
}

function main() {
  console.log("Merch funnel rollout — step 6 (regression)");
  console.log("Docs: docs/MERCH_FUNNEL_MVP.md § Exit checklist\n");

  if (!verify && !vitestOnly && !e2eOnly) {
    printRegressionChecklist();
    console.log("\n⏭  Run full regression:");
    console.log("   npm run merch-funnel:rollout:step6 -- --verify");
    return;
  }

  if (verify || vitestOnly) {
    runNpm("verify:merch-funnel (Vitest)", ["run", "verify:merch-funnel"]);
  }

  if (verify || e2eOnly) {
    runNpm("e2e:merch-funnel (Playwright)", ["run", "e2e:merch-funnel"]);
  }

  if (verify) {
    console.log("\n✅ Step 6 complete (Vitest + E2E). Merch funnel engineering regression passed.");
    console.log("   Operator still required: step 2/3 smoke on production + step 5 physical QA.");
  } else if (vitestOnly) {
    console.log("\n✅ Step 6a complete. Next: npm run merch-funnel:rollout:step6 -- --e2e");
  } else if (e2eOnly) {
    console.log("\n✅ Step 6b complete.");
  }
}

main();
