/**
 * Stripe checkout success_url builder for hosted steward (roadmap step 4).
 * @see docs/STEWARD_DEVICE_ROADMAP.md § step 4
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md — subscription metadata.account_id
 */
import {
  STEWARD_ACCOUNT_URL_PARAM,
  isValidStewardAccountId,
} from "./device-steward-session-core.mjs";

export { STEWARD_ACCOUNT_URL_PARAM };

/**
 * @param {string} origin Site origin (e.g. https://humanity.llc)
 * @param {string} accountId acc_* from steward_accounts
 * @param {{ path?: string, profileId?: string }} [opts]
 * @returns {string}
 */
export function buildHostedStewardCheckoutReturnUrl(origin, accountId, opts = {}) {
  if (!isValidStewardAccountId(accountId)) {
    throw new Error("Invalid steward account_id for checkout return URL.");
  }
  const base = String(origin || "").replace(/\/$/, "");
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    throw new Error("origin must be an absolute http(s) URL.");
  }
  const path = opts.path && opts.path.startsWith("/") ? opts.path : `/${opts.path || ""}`;
  const url = new URL(path, `${base}/`);
  url.searchParams.set(STEWARD_ACCOUNT_URL_PARAM, accountId.trim());
  const profileId = typeof opts.profileId === "string" ? opts.profileId.trim() : "";
  if (profileId) {
    url.searchParams.set("profile_id", profileId);
  }
  return url.href;
}

/**
 * Stripe Checkout / Billing Portal fields (ops copy-paste).
 *
 * @param {string} accountId
 * @returns {{ subscription_metadata: Record<string, string>, success_url_hint: string }}
 */
export function stripeHostedStewardMetadata(accountId) {
  if (!isValidStewardAccountId(accountId)) {
    throw new Error("Invalid steward account_id for Stripe metadata.");
  }
  return {
    subscription_metadata: { account_id: accountId.trim() },
    success_url_hint: `Use buildHostedStewardCheckoutReturnUrl(origin, "${accountId}")`,
  };
}
