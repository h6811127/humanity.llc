/**
 * Merch funnel close-out — step 6 (full regression before live payments).
 *
 * Runs merch funnel Vitest bundles + merch E2E + optional production Glitch PDP smoke.
 *
 * Usage:
 *   npm run merch-funnel:rollout:step6
 *   npm run merch-funnel:rollout:step6 -- --preflight   # rollout Vitest + verify:merch-funnel (no Playwright)
 *   npm run merch-funnel:rollout:step6 -- --verify      # preflight + E2E + production smoke + verify-config
 *   npm run merch-funnel:rollout:step6 -- --vitest
 *   npm run merch-funnel:rollout:step6 -- --e2e
 *   SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step6 -- --verify --skip-production-smoke
 *
 * @see docs/MERCH_FUNNEL_MVP.md § Exit checklist
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Production rollout commands
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runMerchRolloutPreflightVitest, runNpm } from "./merch-funnel-rollout-preflight.mjs";
import { smokeShopGlitchProductPage } from "./merch-rollout-shop-pdp-smoke.mjs";

const siteOrigin = (process.env.SITE_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const apiOrigin = (process.env.API_ORIGIN || siteOrigin).replace(/\/$/, "");

const verify = process.argv.includes("--verify");
const vitestOnly = process.argv.includes("--vitest");
const e2eOnly = process.argv.includes("--e2e");
const preflight = process.argv.includes("--preflight");
const skipProductionSmoke = process.argv.includes("--skip-production-smoke");

function printRegressionChecklist() {
  console.log("Prerequisites: steps 1–5 complete (operator deploy + physical QA as needed).\n");
  console.log("Engineering preflight (local, no Playwright):");
  console.log("   npm run merch-funnel:rollout:step6 -- --preflight\n");
  console.log("Step 6 — full merch funnel regression (engineering close-out)\n");
  console.log("  npm run merch-funnel:rollout:step6 -- --verify");
  console.log("    (= preflight Vitest + e2e:merch-funnel + production Glitch PDP/API + verify-config)");
  console.log("  npm run merch-funnel:verify-exit   # same Vitest/E2E gate + wrangler route guard");
  console.log("\nE2E includes:");
  console.log("  • e2e/merch-funnel-customize.spec.ts");
  console.log("  • e2e/merch-funnel-checkout.spec.ts");
  console.log("  • e2e/merch-checkout-sad-path.spec.ts (M1–M2 gate + checkout closed)");
  console.log("  • e2e/shop-product-detail.spec.ts (Glitch drop + hub CTA)");
  console.log("\nOperator-only (not replaced by step 6):");
  console.log("  npm run merch-funnel:rollout:step5 -- --verify   # digital production gate");
  console.log("  docs/MERCH_PHYSICAL_QA_RUNBOOK.md                # printed ink QA");
}

function runPreflight() {
  console.log("Step 6 preflight — local gate before Playwright regression\n");
  runMerchRolloutPreflightVitest();
  runNpm("verify:merch-funnel (Vitest)", ["run", "verify:merch-funnel"]);
  console.log("\n✅ Step 6 preflight OK.");
  console.log("Next (Playwright, before live Tier 1 checkout):");
  console.log("  npm run e2e:install   # once per machine");
  console.log("  npm run merch-funnel:rollout:step6 -- --e2e");
  console.log("  npm run merch-funnel:rollout:step6 -- --verify");
}

async function runFullVerify() {
  console.log("Step 6 verify — engineering close-out (Vitest + E2E + production smoke)\n");
  runPreflight();
  runNpm("e2e:merch-funnel (Playwright)", ["run", "e2e:merch-funnel"]);
  if (!skipProductionSmoke) {
    await smokeShopGlitchProductPage(siteOrigin, { apiOrigin });
  } else {
    console.log("\n(skipped production Glitch PDP smoke — --skip-production-smoke)\n");
  }
  runNpm("merch-funnel:verify-config", ["run", "merch-funnel:verify-config"]);
  console.log("\n✅ Step 6 complete — engineering regression passed.");
  console.log("   Glitch drop: view path gated by step 5/6 smoke; checkout still operator-gated.");
  console.log("   Before live Tier 1 or Glitch checkout:");
  console.log("     • docs/MERCH_PHYSICAL_QA_RUNBOOK.md");
  console.log("     • npm run merch-funnel:verify-config -- --require-checkout");
  console.log("     • npm run merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1");
}

async function main() {
  console.log("Merch funnel rollout — step 6 (regression)");
  console.log("Docs: docs/MERCH_FUNNEL_MVP.md § Exit checklist\n");

  if (preflight) {
    runPreflight();
    return;
  }

  if (!verify && !vitestOnly && !e2eOnly) {
    printRegressionChecklist();
    console.log("\n⏭  Run full regression:");
    console.log("   npm run merch-funnel:rollout:step6 -- --preflight");
    console.log("   npm run merch-funnel:rollout:step6 -- --verify");
    return;
  }

  if (verify) {
    await runFullVerify();
    return;
  }

  if (vitestOnly) {
    runPreflight();
    console.log("\n✅ Step 6a complete. Next: npm run merch-funnel:rollout:step6 -- --e2e");
    return;
  }

  if (e2eOnly) {
    runNpm("e2e:merch-funnel (Playwright)", ["run", "e2e:merch-funnel"]);
    console.log("\n✅ Step 6b complete.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
