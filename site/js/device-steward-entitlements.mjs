/**
 * Browser steward entitlements probe + resolved policy cache (hosted tier E2).
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § E2
 */
import { CITY_GAME_SEASONS_INDEX_URL } from "./city-game-season-resolve.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import { getTabSession } from "./device-keys.mjs";
import { seasonIdForStewardEntitlementsQuery } from "./steward-entitlements-season-id-core.mjs";
import { isDeviceHubExpanded } from "./device-live-control-poll-scheduler.mjs";
import {
  REFERENCE_FREE_POLICY,
  STEWARD_DEVICE_ID_STORAGE_KEY,
  STEWARD_ENTITLEMENTS_CACHE_KEY,
  STEWARD_SESSION_STORAGE_KEY,
  hostedTierHubIndicatorLine,
  parseStewardEntitlementsCache,
  policyFromEntitlementsResponse,
  shouldRefreshStewardEntitlementsCache,
  stewardAutoPollUsageFromBody,
  stewardEntitlementsRequestHeaders,
  stewardPushSubscribeAllowed,
  stewardUsageAtLimit,
} from "./device-steward-entitlements-core.mjs";
import {
  STEWARD_PENDING_ACCOUNT_STORAGE_KEY,
  generateStewardDeviceId,
  isValidStewardAccountId,
  isValidStewardDeviceId,
  parseStewardAccountIdFromUrl,
  resolveStewardAccountLinkTarget,
  stewardBillingReturnPendingLine,
} from "./device-steward-session-core.mjs";

export {
  REFERENCE_FREE_POLICY,
  hostedTierHubIndicatorLine,
  stewardAutoPollUsageFromBody,
  stewardPushSubscribeAllowed,
  stewardUsageAtLimit,
} from "./device-steward-entitlements-core.mjs";
export {
  STEWARD_MANUAL_POLL_HEADER,
} from "./device-steward-quota-core.mjs";

export const STEWARD_ENTITLEMENTS_CHANGED = "hc-steward-entitlements-changed";
export const STEWARD_QUOTA_CHANGED = "hc-steward-quota-changed";

/** @type {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} */
let activePolicy = { ...REFERENCE_FREE_POLICY };

let hubHookBound = false;

/** @type {{ seasons: Array<Record<string, unknown>> } | null} */
let cachedSeasonsIndex = null;
let seasonsIndexPromise = null;

async function loadSeasonsIndexForEntitlements() {
  if (cachedSeasonsIndex) return cachedSeasonsIndex;
  if (!seasonsIndexPromise) {
    seasonsIndexPromise = fetch(CITY_GAME_SEASONS_INDEX_URL, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return { seasons: [] };
        const body = await res.json();
        if (!body || typeof body !== "object") return { seasons: [] };
        const seasons = Array.isArray(body.seasons) ? body.seasons : [];
        cachedSeasonsIndex = { seasons };
        return cachedSeasonsIndex;
      })
      .catch(() => ({ seasons: [] }));
  }
  return seasonsIndexPromise;
}

/**
 * @param {string | null | undefined} profileId
 */
async function stewardEntitlementsSeasonIdQuery(profileId) {
  const index = await loadSeasonsIndexForEntitlements();
  const seasonId = seasonIdForStewardEntitlementsQuery(index, profileId);
  return seasonId ? `season_id=${encodeURIComponent(seasonId)}` : "";
}

/**
 * @returns {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy}
 */
export function getStewardEntitlementsPolicy() {
  return activePolicy;
}

/**
 * Last cached GET /steward/entitlements JSON (usage + game_season).
 * @returns {Record<string, unknown> | null}
 */
export function getStewardEntitlementsResponseBody() {
  return readEntitlementsCache()?.body ?? null;
}

/**
 * @returns {string | null}
 */
export function readStewardSessionToken() {
  try {
    const raw = sessionStorage.getItem(STEWARD_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    return token || null;
  } catch {
    return null;
  }
}

/**
 * @param {{ token: string, account_id?: string }} session
 */
export function writeStewardSession(session) {
  try {
    sessionStorage.setItem(STEWARD_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearStewardSession() {
  void import("./device-steward-web-push.mjs").then((mod) => {
    if (typeof mod.clearStewardWebPushSubscription === "function") {
      void mod.clearStewardWebPushSubscription();
    }
  });
  try {
    sessionStorage.removeItem(STEWARD_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Stable per-browser install id for metering headers.
 * @returns {string}
 */
export function getOrCreateStewardDeviceId() {
  try {
    const existing = localStorage.getItem(STEWARD_DEVICE_ID_STORAGE_KEY)?.trim();
    if (existing && isValidStewardDeviceId(existing)) return existing;
    const id = generateStewardDeviceId();
    localStorage.setItem(STEWARD_DEVICE_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return generateStewardDeviceId();
  }
}

/**
 * Optional bearer + device headers for authenticated resolver GETs.
 * @returns {Record<string, string>}
 */
export function stewardResolverRequestHeaders() {
  const token = readStewardSessionToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    "X-HC-Device-Id": getOrCreateStewardDeviceId(),
  };
}

/**
 * Hub monitoring line after Stripe checkout return, before session link completes.
 *
 * @returns {string | null}
 */
export function getStewardBillingReturnPendingLine() {
  if (readStewardSessionToken()) return null;
  let pending = null;
  try {
    const raw = sessionStorage.getItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY);
    pending = isValidStewardAccountId(raw) ? String(raw).trim() : null;
  } catch {
    /* ignore */
  }
  const urlAccountId =
    typeof location !== "undefined" ? parseStewardAccountIdFromUrl(location.search) : null;
  const accountId = resolveStewardAccountLinkTarget(urlAccountId, pending);
  if (!accountId) return null;
  return stewardBillingReturnPendingLine(!!getTabSession()?.owner_private_key_b58);
}

/**
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} policy
 */
function setActivePolicy(policy) {
  const prev = activePolicy;
  activePolicy = policy;
  const changed =
    prev.stewardHosted !== policy.stewardHosted ||
    prev.pollLiveProofAutoDailyCap !== policy.pollLiveProofAutoDailyCap ||
    prev.pollLiveProofIdleMs !== policy.pollLiveProofIdleMs ||
    prev.walletLargeThreshold !== policy.walletLargeThreshold ||
    prev.swPeriodicMinMs !== policy.swPeriodicMinMs;
  if (changed) {
    window.dispatchEvent(new Event(STEWARD_ENTITLEMENTS_CHANGED));
  }
}

/**
 * @returns {{ fetchedAt: number, etag: string | null, body: Record<string, unknown> } | null}
 */
function readEntitlementsCache() {
  try {
    return parseStewardEntitlementsCache(
      sessionStorage.getItem(STEWARD_ENTITLEMENTS_CACHE_KEY)
    );
  } catch {
    return null;
  }
}

/**
 * @param {{ fetchedAt: number, etag: string | null, body: Record<string, unknown> }} cache
 */
function writeEntitlementsCache(cache) {
  try {
    sessionStorage.setItem(STEWARD_ENTITLEMENTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function applyReferenceFreePolicy() {
  setActivePolicy({ ...REFERENCE_FREE_POLICY });
}

/**
 * Fetch effective entitlements when this tab has signing keys and a steward session.
 *
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy>}
 */
export async function refreshStewardEntitlements(opts = {}) {
  if (!getTabSession()) {
    applyReferenceFreePolicy();
    return activePolicy;
  }

  const token = readStewardSessionToken();
  if (!token) {
    applyReferenceFreePolicy();
    return activePolicy;
  }

  const cache = readEntitlementsCache();
  if (cache && !opts.force && !shouldRefreshStewardEntitlementsCache(cache)) {
    const policy = policyFromEntitlementsResponse(cache.body);
    setActivePolicy(policy);
    return policy;
  }

  const profileId = getTabSession()?.profile_id;
  const seasonQuery = await stewardEntitlementsSeasonIdQuery(profileId);
  const url = `${resolverApiOrigin()}/.well-known/hc/v1/steward/entitlements${
    seasonQuery ? `?${seasonQuery}` : ""
  }`;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-HC-Device-Id": getOrCreateStewardDeviceId(),
    ...stewardEntitlementsRequestHeaders(cache),
  };

  try {
    const res = await fetch(url, { method: "GET", headers, credentials: "omit" });
    if (res.status === 304 && cache) {
      const policy = policyFromEntitlementsResponse(cache.body);
      setActivePolicy(policy);
      return policy;
    }
    if (res.status === 401) {
      clearStewardSession();
      try {
        sessionStorage.removeItem(STEWARD_ENTITLEMENTS_CACHE_KEY);
      } catch {
        /* ignore */
      }
      applyReferenceFreePolicy();
      return activePolicy;
    }
    if (!res.ok) {
      if (cache) {
        const policy = policyFromEntitlementsResponse(cache.body);
        setActivePolicy(policy);
        return policy;
      }
      return activePolicy;
    }
    const body = await res.json();
    const etag = res.headers.get("ETag") || res.headers.get("etag");
    writeEntitlementsCache({
      fetchedAt: Date.now(),
      etag: etag && etag.trim() ? etag.trim() : null,
      body: body && typeof body === "object" ? body : {},
    });
    const policy = policyFromEntitlementsResponse(
      body && typeof body === "object" ? body : null
    );
    setActivePolicy(policy);
    return policy;
  } catch {
    if (cache) {
      const policy = policyFromEntitlementsResponse(cache.body);
      setActivePolicy(policy);
      return policy;
    }
    return activePolicy;
  }
}

/**
 * Hub expand / tab visible: refresh when signing keys are loaded in this tab.
 */
export function refreshStewardEntitlementsOnHubContext() {
  if (!getTabSession()) return;
  const hub = document.getElementById("device-hub");
  const hubOpen = isDeviceHubExpanded(hub);
  const visible = document.visibilityState === "visible";
  if (!hubOpen && !visible) return;
  void refreshStewardEntitlements();
}

/**
 * Call once from hub init (idempotent).
 */
export function initStewardEntitlementsHubHook() {
  if (hubHookBound) return;
  hubHookBound = true;

  window.addEventListener("hc-device-hub-changed", () => {
    refreshStewardEntitlementsOnHubContext();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshStewardEntitlementsOnHubContext();
    }
  });

  void import("./device-steward-session.mjs").then((mod) => {
    mod.initStewardSessionClient();
  });
}
