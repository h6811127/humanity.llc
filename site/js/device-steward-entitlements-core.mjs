/**
 * Pure steward entitlement → client policy (hosted tier E2/E3).
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md § Phase 10
 */
import {
  gameSeasonBlockFromEntitlementsResponse,
  gameSeasonMeterUsage,
  gameSeasonUsageAtLimit,
} from "./city-game-season-entitlements-core.mjs";
import { STEWARD_NULL_DEVICE_CAP_FALLBACK } from "./device-steward-quota-core.mjs";

const PLAN_SHORT_LABELS = {
  reference_free: "Reference",
  hosted_steward_v1: "Hosted steward",
  hosted_game_season_v1: "Hosted game season",
};

export const STEWARD_SESSION_STORAGE_KEY = "hc_steward_session";
export const STEWARD_DEVICE_ID_STORAGE_KEY = "hc_device_id";
export const STEWARD_ENTITLEMENTS_CACHE_KEY = "hc_steward_entitlements_cache";

/** Client may reuse cached GET body for up to 300s (matches server Cache-Control). */
export const STEWARD_ENTITLEMENTS_CACHE_MAX_AGE_MS = 300_000;

/**
 * @typedef {{
 *   stewardHosted: boolean,
 *   notifyPushLiveProof: boolean,
 *   pollLiveProofAutoDailyCap: number,
 *   pollLiveProofIdleMs: number,
 *   pollLiveProofActiveMs: number,
 *   pollNetworkMaxParallel: number,
 *   pollNetworkManualMaxParallel: number,
 *   walletLargeThreshold: number,
 *   swPeriodicMinMs: number,
 *   planId: string | null,
 *   status: string | null,
 * }} StewardEntitlementsPolicy
 */

/** @type {StewardEntitlementsPolicy} */
export const REFERENCE_FREE_POLICY = Object.freeze({
  stewardHosted: false,
  notifyPushLiveProof: false,
  pollLiveProofAutoDailyCap: 400,
  pollLiveProofIdleMs: 60_000,
  pollLiveProofActiveMs: 5_000,
  pollNetworkMaxParallel: 2,
  pollNetworkManualMaxParallel: 1,
  walletLargeThreshold: 10,
  swPeriodicMinMs: 900_000,
  planId: "reference_free",
  status: "active",
});

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function numberEntitlement(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function autoPollDailyCapEntitlement(value, fallback) {
  if (value === null) return STEWARD_NULL_DEVICE_CAP_FALLBACK;
  return numberEntitlement(value, fallback);
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} entitlements
 * @param {boolean} fallback
 */
function booleanEntitlement(key, entitlements, fallback) {
  if (Object.prototype.hasOwnProperty.call(entitlements, key)) {
    return entitlements[key] === true;
  }
  return fallback;
}

/**
 * @param {Record<string, unknown>} entitlements
 * @param {StewardEntitlementsPolicy} base
 * @returns {StewardEntitlementsPolicy}
 */
export function entitlementsMapToPolicy(entitlements, base = REFERENCE_FREE_POLICY) {
  return {
    stewardHosted: booleanEntitlement("steward.hosted", entitlements, base.stewardHosted),
    notifyPushLiveProof: booleanEntitlement(
      "notify.push.live_proof",
      entitlements,
      base.notifyPushLiveProof
    ),
    pollLiveProofAutoDailyCap: autoPollDailyCapEntitlement(
      entitlements["poll.live_proof.auto_daily_cap"],
      base.pollLiveProofAutoDailyCap
    ),
    pollLiveProofIdleMs: numberEntitlement(
      entitlements["poll.live_proof.idle_ms"],
      base.pollLiveProofIdleMs
    ),
    pollLiveProofActiveMs: numberEntitlement(
      entitlements["poll.live_proof.active_ms"],
      base.pollLiveProofActiveMs
    ),
    pollNetworkMaxParallel: numberEntitlement(
      entitlements["poll.network.max_parallel"],
      base.pollNetworkMaxParallel
    ),
    pollNetworkManualMaxParallel: numberEntitlement(
      entitlements["poll.network.manual_max_parallel"],
      base.pollNetworkManualMaxParallel
    ),
    walletLargeThreshold: numberEntitlement(
      entitlements["wallet.large_threshold"],
      base.walletLargeThreshold
    ),
    swPeriodicMinMs: numberEntitlement(
      entitlements["sw.periodic_min_ms"],
      base.swPeriodicMinMs
    ),
    planId: base.planId,
    status: base.status,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {StewardEntitlementsPolicy}
 */
export function policyFromEntitlementsResponse(body) {
  if (!body || typeof body !== "object") {
    return { ...REFERENCE_FREE_POLICY };
  }
  const ent =
    body.entitlements && typeof body.entitlements === "object"
      ? /** @type {Record<string, unknown>} */ (body.entitlements)
      : {};
  const planId =
    typeof body.plan_id === "string" && body.plan_id ? body.plan_id : "reference_free";
  const status =
    typeof body.status === "string" && body.status ? body.status : "active";
  return Object.freeze({
    ...entitlementsMapToPolicy(ent, REFERENCE_FREE_POLICY),
    planId,
    status,
  });
}

/**
 * @param {string | null | undefined} raw
 * @returns {{ fetchedAt: number, etag: string | null, body: Record<string, unknown> } | null}
 */
export function parseStewardEntitlementsCache(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const fetchedAt =
      typeof parsed.fetchedAt === "number" && Number.isFinite(parsed.fetchedAt)
        ? parsed.fetchedAt
        : 0;
    const etag =
      typeof parsed.etag === "string" && parsed.etag ? parsed.etag : null;
    const body =
      parsed.body && typeof parsed.body === "object"
        ? /** @type {Record<string, unknown>} */ (parsed.body)
        : null;
    if (!body) return null;
    return { fetchedAt, etag, body };
  } catch {
    return null;
  }
}

/**
 * @param {{ fetchedAt: number, etag: string | null, body: Record<string, unknown> }} cache
 * @param {number} [now]
 */
export function shouldRefreshStewardEntitlementsCache(cache, now = Date.now()) {
  return now - cache.fetchedAt >= STEWARD_ENTITLEMENTS_CACHE_MAX_AGE_MS;
}

/**
 * @param {{ etag: string | null } | null | undefined} cache
 * @returns {Record<string, string>}
 */
export function stewardEntitlementsRequestHeaders(cache) {
  if (cache?.etag) {
    return { "If-None-Match": cache.etag };
  }
  return {};
}

/**
 * @param {StewardEntitlementsPolicy} policy
 */
export function stewardPushSubscribeAllowed(policy) {
  return policy.stewardHosted === true && policy.notifyPushLiveProof === true;
}

/**
 * @param {string | null | undefined} planId
 */
function hostedPlanShortLabel(planId) {
  if (!planId) return PLAN_SHORT_LABELS.reference_free;
  return PLAN_SHORT_LABELS[planId] ?? planId;
}

/**
 * M5-safe hub monitoring line (plan + usage; no upgrade or “verified” copy).
 * @param {StewardEntitlementsPolicy} policy
 * @param {Record<string, unknown> | null} [body] GET /steward/entitlements JSON
 * @returns {string | null}
 */
export function hostedTierHubIndicatorLine(policy, body = null) {
  const pollUsage = stewardAutoPollUsageFromBody(body);
  if (pollUsage && stewardUsageAtLimit(pollUsage.used, pollUsage.limit)) {
    return "Daily automatic live-proof check limit reached on this device. Use Check for live proof or try again tomorrow.";
  }

  const gameBlock = gameSeasonBlockFromEntitlementsResponse(body);
  if (gameBlock) {
    for (const event of ["game.contribute", "game.snapshot.get", "game.game_update"]) {
      const row = gameSeasonMeterUsage(gameBlock.usage, event);
      if (row && gameSeasonUsageAtLimit(row.used, row.limit)) {
        return "City game daily limit reached for this season. Resolver writes pause until the UTC day resets.";
      }
    }
  }

  const usageSuffix =
    pollUsage != null
      ? ` · auto checks ${pollUsage.used}/${pollUsage.limit} today`
      : "";

  if (policy.stewardHosted) {
    return `${hostedPlanShortLabel(policy.planId)} plan${usageSuffix} — higher automatic check limits on this device. Verification labels are unchanged.`;
  }

  if (policy.planId === "reference_free" && pollUsage) {
    return `${hostedPlanShortLabel(policy.planId)} plan${usageSuffix}`;
  }

  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {{ used: number, limit: number, periodKey: string | null } | null}
 */
export function stewardAutoPollUsageFromBody(body) {
  if (!body || typeof body !== "object") return null;
  const usage =
    body.usage && typeof body.usage === "object"
      ? /** @type {Record<string, unknown>} */ (body.usage)
      : null;
  if (!usage) return null;
  const counters =
    usage.counters && typeof usage.counters === "object"
      ? /** @type {Record<string, number>} */ (usage.counters)
      : {};
  const limits =
    usage.limits && typeof usage.limits === "object"
      ? /** @type {Record<string, number>} */ (usage.limits)
      : {};
  const used =
    typeof counters["poll.live_proof.auto"] === "number"
      ? Math.floor(counters["poll.live_proof.auto"])
      : null;
  const limit =
    typeof limits["poll.live_proof.auto"] === "number"
      ? Math.floor(limits["poll.live_proof.auto"])
      : null;
  if (used == null || limit == null) return null;
  const periodKey =
    typeof usage.period_key === "string" && usage.period_key
      ? usage.period_key
      : null;
  return { used, limit, periodKey };
}

/**
 * @param {number} used
 * @param {number} limit
 */
export function stewardUsageAtLimit(used, limit) {
  return limit > 0 && used >= limit;
}
