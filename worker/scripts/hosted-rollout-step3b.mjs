/**
 * Hosted steward production rollout — step 3b (STRIPE_WEBHOOK_SECRET) — deferred.
 *
 * Per HOSTED_TIER_PRICING_AND_SLA.md G8 and HOSTED_TIER_IMPLEMENTATION_EPICS.md:
 *   Do not enable production Stripe billing until governance confirms Stripe.
 *
 * This script prints setup notes only; it does not verify webhooks.
 *
 * Usage:
 *   npm run hosted:rollout:step3b
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags (STRIPE after G8)
 */
console.log("Hosted steward rollout — step 3b (STRIPE_WEBHOOK_SECRET)\n");
console.log("Status: **deferred** until G8 (Stripe production confirmed by governance).\n");
console.log("You do **not** need step 3b to continue rollout steps 4–6.\n");
console.log("When G8 is approved:\n");
console.log("1. cd worker && npx wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler.toml");
console.log(
  "2. Register Stripe webhook → POST /.well-known/hc/v1/operator/billing/webhook (see E5 in HOSTED_TIER_IMPLEMENTATION_EPICS.md)"
);
console.log(
  "3. Confirm with a signed test event in Stripe dashboard (cannot be auto-verified from this repo).\n"
);
console.log("Until then, continue with:");
console.log("  npm run hosted:rollout:step4   # enable HOSTED_STEWARD_ENABLED when ready");
console.log("  npm run hosted:rollout:step5   # ops dashboard + CI (uses OPERATOR_AUDIT_TOKEN from 3a)");
