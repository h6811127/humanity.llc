/**
 * Merch funnel close-out — step 5 (launch gates + physical QA checklist).
 *
 * Engineering: `--preflight` runs automated regression before operator physical QA.
 * Digital smoke: `--verify` runs preflight + production Glitch PDP/API (no ink required).
 *
 * Usage:
 *   npm run merch-funnel:rollout:step5
 *   npm run merch-funnel:rollout:step5 -- --preflight
 *   SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step5 -- --verify
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § 5. Launch gates
 * @see docs/MERCH_PHYSICAL_QA_RUNBOOK.md
 * @see docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runMerchRolloutPreflightVitest, runNpm } from "./merch-funnel-rollout-preflight.mjs";
import { smokeShopGlitchProductPage } from "./merch-rollout-shop-pdp-smoke.mjs";

const siteOrigin = (process.env.SITE_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const apiOrigin = (process.env.API_ORIGIN || siteOrigin).replace(/\/$/, "");
const preflight = process.argv.includes("--preflight");
const verify = process.argv.includes("--verify");

function printOperatorChecklist() {
  console.log("Merch funnel rollout — step 5 (launch gates + physical QA)");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § 5 · docs/MERCH_PHYSICAL_QA_RUNBOOK.md\n");

  console.log("Engineering (automated — run before physical QA):");
  console.log("  npm run merch-funnel:rollout:step5 -- --preflight");
  console.log("  SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step5 -- --verify");
  console.log("    (preflight + production Glitch PDP/API; no printed sample required)\n");

  console.log("Tier 0 Glitch drop (digital view path — shipped in repo):");
  console.log("  ☐ /shop/products/tier0_glitch_hoodie_v1/ loads (Pages + Worker catalog)");
  console.log("  ☐ checkout_open stays false until Shopify variant + verify-config pass");
  console.log("  ☐ Before live Glitch checkout:");
  console.log("      npm run merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1");
  console.log("      docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md § Operator checklist\n");

  console.log("Policy gates (operator sign-off before live Tier 1 payments):");
  console.log("  ☐ docs/FOUNDING_DROP_BRIEF.md — Tier 1 gates");
  console.log("  ☐ docs/MERCH_QR_LIFECYCLE_POLICY.md — checkout_open only after policy pass");
  console.log("  ☐ Shopify orders/paid webhook registered and secret set");
  console.log("  ☐ One test paid order: intent → webhook → mint → Printify submit");

  console.log("\nPhysical QA (docs/MERCH_PHYSICAL_QA_RUNBOOK.md — required before Tier 1 checkout):");
  console.log("  ☐ A. Scan reliability — 3 phones, arm's length + ~2 m");
  console.log("  ☐ B. Stranger comprehension — bearer limits visible");
  console.log("  ☐ C. Revoke drill — per-item print_artifact");
  console.log("  ☐ D. Owner live update — same ink, new manifesto");

  console.log("\nWhen physical QA passes:");
  console.log("  • Mark exit checklist in docs/MERCH_FUNNEL_MVP.md");
  console.log("  • Add sign-off line to docs/FOUNDING_DROP_BRIEF.md Tier 1 gates");

  console.log(
    "\n⏭  After gates + sample sign-off: npm run merch-funnel:rollout:step6 -- --verify"
  );
}

function runPreflight() {
  console.log("Step 5 preflight — automated merch regression (no production fetch)\n");
  runMerchRolloutPreflightVitest();
  runNpm("worker:test:merch-print-qa", ["run", "worker:test:merch-print-qa"]);
  runNpm("verify:merch-funnel (Vitest)", ["run", "verify:merch-funnel"]);
  console.log("\n✅ Step 5 preflight OK (code regression).");
  console.log("Next: operator physical QA per docs/MERCH_PHYSICAL_QA_RUNBOOK.md");
  console.log("  SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step5 -- --verify");
}

async function runVerify() {
  console.log("Step 5 verify — digital Glitch PDP gate + preflight\n");
  runPreflight();
  await smokeShopGlitchProductPage(siteOrigin, { apiOrigin });
  runNpm("merch-funnel:verify-config (repo tier0 + Tier 1 status)", [
    "run",
    "merch-funnel:verify-config",
  ]);
  console.log(
    "\n✅ Step 5 digital verify OK (Glitch PDP + API + config audit; checkout may still be gated)."
  );
  console.log("   Operator: complete physical QA before enabling Tier 1 or Glitch checkout.");
  console.log("   Next: npm run merch-funnel:rollout:step6 -- --verify");
}

async function main() {
  if (preflight) {
    runPreflight();
    return;
  }
  if (verify) {
    await runVerify();
    return;
  }
  printOperatorChecklist();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
