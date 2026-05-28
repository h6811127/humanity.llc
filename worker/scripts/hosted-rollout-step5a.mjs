/**
 * Hosted steward production rollout — step 5a (pin Cloudflare Workers metrics, E6.1).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout step 5 (first):
 *   Pin CF dashboard views for humanity-llc-resolver (manual, external).
 *
 * Usage:
 *   npm run hosted:rollout:step5a
 *
 * @see docs/HOSTED_STEWARD_CF_DASHBOARD.md
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md
 */
const cfDashboardDoc = "docs/HOSTED_STEWARD_CF_DASHBOARD.md";

export function printCfDashboardSetup() {
  console.log("Step 5a — Pin Cloudflare Workers metrics (E6.1, manual)\n");
  console.log(`See ${cfDashboardDoc} for full detail.\n`);
  console.log("1. Open Cloudflare dashboard → Workers & Pages → humanity-llc-resolver → Metrics.");
  console.log("2. Pin 7-day and 24-hour views for on-call review.");
  console.log("3. Note these hosted-tier paths for 429/5xx spikes:");
  for (const row of [
    "/.well-known/hc/v1/steward/entitlements",
    "/.well-known/hc/v1/steward/push",
    "/.well-known/hc/v1/cards/*/live-control/challenges",
    "/.well-known/hc/v1/operator/steward-ops",
    "/.well-known/hc/v1/operator/billing/webhook",
  ]) {
    console.log(`   • ${row}`);
  }
  console.log("4. Compare daily CF metrics with steward-ops snapshot + E6.2 CI.\n");
}

function main() {
  console.log("Hosted steward rollout — step 5a (Cloudflare dashboard)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  printCfDashboardSetup();

  console.log("⏭  Complete the dashboard steps above manually, then continue:");
  console.log("   npm run hosted:rollout:step5        # GitHub secret + runbook checklist");
  console.log(
    "   OPERATOR_AUDIT_TOKEN=... npm run hosted:rollout:step5 -- --verify   # E6.2 path"
  );
}

main();
