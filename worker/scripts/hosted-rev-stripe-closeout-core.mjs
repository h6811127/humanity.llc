/**
 * WS-REV R5 step 6 — Stripe checkout + webhook readiness helpers.
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-REV
 */
import { BILLING_CHECKOUT_PATH } from "./hosted-rev-prod-smoke-core.mjs";

export const BILLING_WEBHOOK_PATH = "/.well-known/hc/v1/operator/billing/webhook";

export const STRIPE_DEV_VAR_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_HOSTED_STEWARD_V1",
  "STRIPE_PRICE_HOSTED_GAME_SEASON_V1",
  "STRIPE_WEBHOOK_SECRET",
];

/**
 * @param {number} status
 * @param {unknown} body
 */
export function classifyWebhookEndpoint(status, body) {
  if (status === 404 && body?.error === "hosted_steward_disabled") {
    return {
      ok: false,
      configured: false,
      message: "Hosted steward disabled — set HOSTED_STEWARD_ENABLED=1",
    };
  }
  if (status === 503 && body?.error === "billing_not_configured") {
    return {
      ok: true,
      configured: false,
      message: "STRIPE_WEBHOOK_SECRET is not configured",
    };
  }
  if (status === 401 && body?.error === "invalid_webhook_signature") {
    return {
      ok: true,
      configured: true,
      message: "Webhook endpoint live (signature required)",
    };
  }
  if (status === 400 && body?.error === "invalid_webhook_signature") {
    return {
      ok: true,
      configured: true,
      message: "Webhook endpoint live (invalid signature rejected)",
    };
  }
  return {
    ok: false,
    configured: null,
    message: `Unexpected webhook probe: HTTP ${status} ${String(body?.error ?? "")}`.trim(),
  };
}

/**
 * @param {string} content worker/.dev.vars file contents
 * @returns {Record<string, boolean>}
 */
export function parseDevVarsStripeKeys(content) {
  /** @type {Record<string, boolean>} */
  const found = {};
  for (const key of STRIPE_DEV_VAR_KEYS) {
    const match = content.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
    const value = match?.[1]?.trim() ?? "";
    found[key] =
      value.length > 0 &&
      !value.startsWith("#") &&
      !value.includes("…") &&
      !value.includes("your") &&
      value !== '""' &&
      value !== "''";
  }
  return found;
}

/**
 * @param {Record<string, boolean>} keys
 */
export function summarizeDevVarsStripeKeys(keys) {
  const missing = STRIPE_DEV_VAR_KEYS.filter((k) => !keys[k]);
  const checkoutReady =
    keys.STRIPE_SECRET_KEY &&
    keys.STRIPE_PRICE_HOSTED_STEWARD_V1 &&
    keys.STRIPE_PRICE_HOSTED_GAME_SEASON_V1;
  const webhookReady = keys.STRIPE_WEBHOOK_SECRET;
  return { missing, checkoutReady, webhookReady };
}

/**
 * @param {{ apiOrigin?: string }} [opts]
 * @returns {string[]}
 */
export function stripeCloseoutPlaybookLines(opts = {}) {
  const origin = (opts.apiOrigin || "https://humanity.llc").replace(/\/$/, "");
  return [
    "WS-REV R5 step 6 — Stripe test checkout closeout",
    "",
    "0. Probe operator readiness:",
    `   API_ORIGIN=${origin} npm run hosted:rev:stripe-closeout -- --api`,
    "",
    "1. Local dev secrets (optional — copy worker/.dev.vars.example → worker/.dev.vars):",
    "   STRIPE_SECRET_KEY, STRIPE_PRICE_HOSTED_STEWARD_V1, STRIPE_PRICE_HOSTED_GAME_SEASON_V1",
    "   STRIPE_WEBHOOK_SECRET (stripe listen --forward-to …/operator/billing/webhook for local)",
    "",
    "2. Mint steward session bearer (NOT acc_… from checkout URL):",
    "   npm run hosted:steward-session-local",
    "",
    "3. Open Stripe Checkout (test mode):",
    `   STEWARD_SESSION_TOKEN=… API_ORIGIN=${origin} npm run hosted:rev:stripe-closeout -- --checkout hosted_steward_v1`,
    "",
    "4. Complete payment (Stripe test card 4242 4242 4242 4242)",
    "",
    "5. Verify paid entitlements on operator:",
    `   STEWARD_SESSION_TOKEN=… EXPECT_PLAN_ID=hosted_steward_v1 npm run hosted:rev:prod-smoke -- --paid`,
    "",
    "Webhook URL (Stripe Dashboard):",
    `   POST ${origin}${BILLING_WEBHOOK_PATH}`,
    "",
    "Checkout API:",
    `   POST ${origin}${BILLING_CHECKOUT_PATH}`,
  ];
}
