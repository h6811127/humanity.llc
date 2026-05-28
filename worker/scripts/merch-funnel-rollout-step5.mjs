/**
 * Merch funnel close-out — step 5 (launch gates + physical QA checklist).
 *
 * Operator sign-off before enabling live Tier 1 payments.
 *
 * Usage:
 *   npm run merch-funnel:rollout:step5
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § 5. Launch gates
 * @see docs/MERCH_PHYSICAL_QA_RUNBOOK.md
 */
function main() {
  console.log("Merch funnel rollout — step 5 (launch gates + physical QA)");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § 5 · docs/MERCH_PHYSICAL_QA_RUNBOOK.md\n");

  console.log("Policy gates (operator sign-off required):");
  console.log("  ☐ docs/FOUNDING_DROP_BRIEF.md — Tier 1 gates");
  console.log("  ☐ docs/MERCH_QR_LIFECYCLE_POLICY.md — checkout_open only after policy pass");
  console.log("  ☐ Shopify orders/paid webhook registered and secret set");
  console.log("  ☐ One test paid order: intent → webhook → mint → Printify submit");

  console.log("\nAutomated code regression (run before physical QA):");
  console.log("  npm run worker:test:merch-print-qa");
  console.log("  npm run worker:test:merch-funnel");

  console.log("\nPhysical QA (docs/MERCH_PHYSICAL_QA_RUNBOOK.md):");
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

main();
