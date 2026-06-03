/**
 * WS-REV R3 — production smoke helpers (hosted revenue path).
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-REV R3
 */

export const HOSTED_STEWARD_PLAN_ID = "hosted_steward_v1";
export const HOSTED_GAME_SEASON_PLAN_ID = "hosted_game_season_v1";
export const REFERENCE_FREE_PLAN_ID = "reference_free";

export const PAID_PLAN_IDS = [HOSTED_STEWARD_PLAN_ID, HOSTED_GAME_SEASON_PLAN_ID];

export const BILLING_CHECKOUT_PATH = "/.well-known/hc/v1/steward/billing/checkout";

/**
 * @param {unknown} body
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertHostedExtensionEnabled(body) {
  const hosted = body?.extensions?.hosted_steward;
  if (!hosted || hosted.status !== "enabled") {
    return {
      ok: false,
      message: "capabilities.extensions.hosted_steward is not enabled",
    };
  }
  const endpoints = hosted.endpoints ?? {};
  if (!endpoints.billing_checkout) {
    return {
      ok: false,
      message: "capabilities missing hosted_steward.endpoints.billing_checkout",
    };
  }
  return { ok: true };
}

/**
 * @param {unknown} body operator/plans JSON
 */
export function assertRevenuePlansCatalog(body) {
  const planIds = Array.isArray(body?.plans)
    ? body.plans.map((p) => p?.plan_id).filter(Boolean)
    : [];
  const missing = PAID_PLAN_IDS.filter((id) => !planIds.includes(id));
  if (missing.length) {
    let message = `operator/plans missing: ${missing.join(", ")} (have: ${planIds.join(", ")})`;
    if (missing.includes(HOSTED_GAME_SEASON_PLAN_ID)) {
      message +=
        " — apply migration 0031_game_season_metering.sql (npm run hosted:rollout:step1 -- --remote)";
    }
    return { ok: false, message };
  }
  return { ok: true };
}

/**
 * Unauthenticated checkout must not mint sessions or leak Stripe keys.
 *
 * @param {number} status
 * @param {unknown} body
 */
export function assertBillingCheckoutRequiresSession(status, body) {
  if (status !== 401) {
    return {
      ok: false,
      message: `billing/checkout without bearer expected 401, got ${status}`,
    };
  }
  if (body?.error !== "UNAUTHORIZED") {
    return {
      ok: false,
      message: `billing/checkout expected UNAUTHORIZED, got ${String(body?.error)}`,
    };
  }
  return { ok: true };
}

/**
 * Stripe not configured on operator is acceptable before G8.
 *
 * @param {number} status
 * @param {unknown} body
 */
export function classifyBillingCheckoutConfigured(status, body) {
  if (status === 503 && body?.error === "billing_not_configured") {
    return { configured: false, ok: true };
  }
  if (status === 401) {
    return { configured: true, ok: true };
  }
  return {
    configured: null,
    ok: false,
    message: `billing/checkout with bearer probe expected 401 or 503 billing_not_configured, got ${status}`,
  };
}

/**
 * @param {unknown} body entitlements JSON
 * @param {string} [expectedPlanId]
 */
export function assertPaidStewardEntitlements(body, expectedPlanId) {
  const planId = typeof body?.plan_id === "string" ? body.plan_id : "";
  const status = typeof body?.status === "string" ? body.status : "";

  if (!PAID_PLAN_IDS.includes(planId)) {
    return {
      ok: false,
      message: `Expected paid plan_id (${PAID_PLAN_IDS.join(" | ")}), got ${planId || "(missing)"}`,
    };
  }

  if (expectedPlanId && planId !== expectedPlanId) {
    return {
      ok: false,
      message: `Expected plan_id ${expectedPlanId}, got ${planId}`,
    };
  }

  if (status !== "active" && status !== "trialing" && status !== "past_due") {
    return {
      ok: false,
      message: `Unexpected paid account status: ${status || "(missing)"}`,
    };
  }

  const ent = body?.entitlements;
  if (!ent || typeof ent !== "object") {
    return { ok: false, message: "entitlements block missing" };
  }

  if (planId === HOSTED_STEWARD_PLAN_ID && ent["steward.hosted"] !== true) {
    return {
      ok: false,
      message: "hosted_steward_v1 account missing steward.hosted entitlement",
    };
  }

  const usage = body?.usage;
  const hasUsage =
    usage &&
    typeof usage === "object" &&
    usage.counters &&
    typeof usage.counters === "object";

  return {
    ok: true,
    planId,
    status,
    hasUsage: Boolean(hasUsage),
    hasGameSeason: Boolean(body?.game_season),
  };
}

/**
 * @param {string} origin
 */
export function hostedRevApiPaths(origin) {
  const base = origin.replace(/\/$/, "");
  return {
    health: `${base}/.well-known/hc/v1/health`,
    capabilities: `${base}/.well-known/hc/v1/operator/capabilities`,
    plans: `${base}/.well-known/hc/v1/operator/plans`,
    billingCheckout: `${base}${BILLING_CHECKOUT_PATH}`,
    entitlements: `${base}/.well-known/hc/v1/steward/entitlements`,
  };
}
