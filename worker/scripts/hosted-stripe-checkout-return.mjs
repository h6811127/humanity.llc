/**
 * Print Stripe Checkout success_url + subscription metadata for hosted steward (step 4).
 *
 * Usage:
 *   npm run hosted:stripe-return-url -- acc_yourAccountId
 *   SITE_ORIGIN=https://humanity.llc npm run hosted:stripe-return-url -- acc_yourAccountId
 *
 * @see docs/STEWARD_DEVICE_ROADMAP.md § step 4
 * @see site/js/device-steward-billing-return-core.mjs
 */
import {
  buildHostedStewardCheckoutReturnUrl,
  stripeHostedStewardMetadata,
} from "../../site/js/device-steward-billing-return-core.mjs";

const accountId = process.argv[2]?.trim();
const origin = (process.env.SITE_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

if (!accountId) {
  console.error("Usage: npm run hosted:stripe-return-url -- acc_<id>");
  console.error("Optional: SITE_ORIGIN=https://humanity.llc");
  process.exit(1);
}

try {
  const meta = stripeHostedStewardMetadata(accountId);
  const landing = buildHostedStewardCheckoutReturnUrl(origin, accountId);
  const wallet = buildHostedStewardCheckoutReturnUrl(origin, accountId, { path: "/wallet/" });

  console.log("Hosted steward — Stripe checkout wiring (E5.6 minimal)\n");
  console.log("Subscription metadata (required for webhook grant):");
  console.log(JSON.stringify(meta.subscription_metadata, null, 2));
  console.log("\nSuggested success_url values:");
  console.log(`  Landing: ${landing}`);
  console.log(`  Wallet:  ${wallet}`);
  console.log(
    "\nAfter payment, steward opens success_url; device-steward-session.mjs persists hc_account_id until link succeeds (import keys if needed)."
  );
  console.log("Commerce checkout must NOT set metadata.account_id (H6).");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
