/**
 * Fetch resolver card status for saved-wallet rows (cached in sessionStorage).
 * Tracks last-seen network status per card for card-disabled-since-visit alerts.
 */
import { walletEntryQrId, loadWallet, saveWallet, normalizeWalletQrIds } from "./device-wallet.mjs";
import { scanUrlHasOfficialQrParam } from "./device-wallet-scan-url-core.mjs";
import { getCardStatusUrl } from "./hc-sign.mjs";
import { fetchResolverJson } from "./resolver-conditional-fetch-core.mjs";
import {
  alertStateForNetworkPoll,
  alertStateFromScanKind,
  CARD_REVOKED_ALERT_STATE,
  isRevokedSinceLastVisitFromBaseline,
} from "./wallet-network-baseline.mjs";
import {
  mergeLastSeenFromNetworkMap,
  networkStatusChip,
  parseNetworkQrScope,
  parseNetworkVerification,
  pruneWalletNetworkCache,
  readCachedNetworkStatus,
  readCachedVerification,
  shouldUseCachedNetworkStatus,
  verificationRecordFromLabelState,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "./device-wallet-network-core.mjs?v=94";
import {
  getWalletStatusPollHealth,
  setWalletStatusPollHealthForSinceVisit,
} from "./device-wallet-since-visit-gate.mjs?v=94";
import {
  buildSinceVisitPollMapsFromTruth,
  clearWalletNetworkTruthForProfile,
  getWalletNetworkTruth,
  getWalletNetworkTruthPollAlertState,
  getWalletNetworkTruthPollScanKind,
  hasWalletNetworkTruthPoll,
  isWalletNetworkTruthPollConfirmed,
  listWalletNetworkTruthPollProfileIds,
  resetWalletNetworkTruth,
  setWalletNetworkTruthFromCacheOnly,
  setWalletNetworkTruthFromPoll,
  shouldSuppressCardDisabledSinceVisitFromTruth,
} from "./device-wallet-network-truth.mjs?v=94";

export { readCachedVerification };
export {
  getWalletNetworkTruthChipStatus,
  isSinceVisitBlockedChipStatus,
  listWalletNetworkTruthPollProfileIds,
  shouldSuppressCardDisabledSinceVisitFromTruth,
} from "./device-wallet-network-truth.mjs?v=94";

const CACHE_KEY = "hc_wallet_network_cache";
const LAST_SEEN_KEY = "hc_wallet_last_seen_network";

// bfcache / fast navigation can keep JS context alive. If we restore from bfcache,
// clear resolver-confirmed in-memory state so we don't re-light banners based on
// a previous visit's confirmed poll.
if (
  typeof window !== "undefined" &&
  typeof window.addEventListener === "function"
) {
  window.addEventListener("pageshow", (e) => {
    /** @type {{ persisted?: boolean } | undefined} */
    const detail = e;
    if (!detail?.persisted) return;
    resetWalletNetworkTruth();
  });
}

/** Strip poll authority for cards not in this refresh tick (large-wallet round-robin). */
function demoteWalletNetworkTruthToCacheOnly(profileId) {
  if (!profileId) return;
  const entry = readCachedEntry(profileId);
  if (entry) {
    setWalletNetworkTruthFromCacheOnly(profileId, {
      chipStatus: entry.status ?? "checking",
      scanKind: entry.scanKind ?? null,
    });
  } else {
    clearWalletNetworkTruthForProfile(profileId);
  }
}

/**
 * @param {Array<{ profile_id?: string }>} entriesInPoll
 * @param {Record<string, string>} statusMap
 * @param {Record<string, string | null>} scanKindMap
 * @param {Set<string>} networkFetchedProfileIds
 * @param {Record<string, string>} resolverConfirmedAlertStateMap
 */
function syncWalletNetworkTruthFromPoll(
  entriesInPoll,
  statusMap,
  scanKindMap,
  networkFetchedProfileIds,
  resolverConfirmedAlertStateMap
) {
  const polledIds = new Set(
    entriesInPoll.map((e) => e.profile_id).filter((pid) => typeof pid === "string" && pid)
  );

  const idsToSync = new Set([...listWalletNetworkTruthPollProfileIds(), ...polledIds]);
  for (const pid of idsToSync) {
    if (!polledIds.has(pid)) {
      demoteWalletNetworkTruthToCacheOnly(pid);
      continue;
    }
    const chipStatus = statusMap[pid] ?? "checking";
    const scanKind = scanKindMap[pid] ?? null;
    if (networkFetchedProfileIds.has(pid)) {
      const alertState = resolverConfirmedAlertStateMap[pid];
      if (alertState != null) {
        setWalletNetworkTruthFromPoll(pid, { chipStatus, scanKind, alertState });
      } else {
        // Active / unreachable poll: drop revoke authority (avoid stale card_revoked SSOT).
        setWalletNetworkTruthFromCacheOnly(pid, { chipStatus, scanKind });
      }
    } else {
      const prior = getWalletNetworkTruth(pid);
      const cachedKind = scanKindMap[pid] ?? null;
      if (
        prior?.source === "poll" &&
        prior.resolverConfirmed &&
        (prior.scanKind !== cachedKind ||
          (prior.alertState === CARD_REVOKED_ALERT_STATE && cachedKind === "active"))
      ) {
        clearWalletNetworkTruthForProfile(pid);
      }
      setWalletNetworkTruthFromCacheOnly(pid, { chipStatus, scanKind });
    }
  }
}

/** @type {string} Fired when hc_wallet_last_seen_network changes (snapshot, Got it, Manage). */
export const NETWORK_BASELINE_CHANGED = "hc-wallet-network-baseline-changed";
export const NETWORK_REFRESHED = "hc-wallet-network-refreshed";

export { alertStateFromScanKind, CARD_REVOKED_ALERT_STATE, networkStatusChip };

function notifyBaselineChanged() {
  window.dispatchEvent(new Event(NETWORK_BASELINE_CHANGED));
}

function notifyNetworkRefreshed(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NETWORK_REFRESHED, {
      detail: { statusMap, alertStateMap, scanKindMap, resolverConfirmedMap },
    })
  );
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const cache = parsed && typeof parsed === "object" ? parsed : {};
    return pruneWalletNetworkCache(cache);
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, unknown>} cache
 * @param {{ protectProfileIds?: Iterable<string>, scopeProfileIds?: Iterable<string> }} [opts]
 */
function saveCache(cache, opts = {}) {
  try {
    const next = pruneWalletNetworkCache(cache, {
      protectProfileIds: opts.protectProfileIds,
      scopeProfileIds: opts.scopeProfileIds,
    });
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** @see docs/DEVICE_TAB_RESOLVER_SYNC.md */
export function loadWalletNetworkCacheForSync() {
  return loadCache();
}

/** @see docs/DEVICE_TAB_RESOLVER_SYNC.md */
export function saveWalletNetworkCacheForSync(cache, protectProfileIds) {
  saveCache(cache, {
    protectProfileIds: protectProfileIds ?? Object.keys(cache),
  });
}

/**
 * Apply a leader network snapshot on follower tabs (cache + truth + NETWORK_REFRESHED).
 * @param {Array<{
 *   profile_id: string,
 *   status: string,
 *   scanKind: string | null,
 *   qrScope?: string | null,
 *   resolverConfirmed: boolean,
 *   alertState?: string | null,
 * }>} snapshotEntries
 * @param {number} [snapshotAt]
 */
export function applyResolverNetworkSnapshot(snapshotEntries, snapshotAt = Date.now()) {
  const statusMap = {};
  const alertStateMap = {};
  const scanKindMap = {};
  const qrScopeMap = {};
  const resolverConfirmedMap = {};

  for (const row of snapshotEntries) {
    const pid = row.profile_id;
    if (!pid) continue;
    statusMap[pid] = row.status;
    scanKindMap[pid] = row.scanKind ?? null;
    qrScopeMap[pid] = row.qrScope ?? null;
    if (row.resolverConfirmed) {
      resolverConfirmedMap[pid] = true;
      const alert =
        row.alertState ?? alertStateForNetworkPoll(row.scanKind, row.status);
      if (alert != null) alertStateMap[pid] = alert;
    }
    const chipStatus = row.status;
    const scanKind = row.scanKind ?? null;
    if (row.resolverConfirmed && alertStateMap[pid] != null) {
      setWalletNetworkTruthFromPoll(pid, {
        chipStatus,
        scanKind,
        alertState: alertStateMap[pid],
      });
    } else {
      setWalletNetworkTruthFromCacheOnly(pid, { chipStatus, scanKind });
    }
  }

  persistWalletFromNetworkPoll({
    statusMap,
    alertStateMap,
    scanKindMap,
    qrScopeMap,
    qrIdMap,
    scanUrlMap,
  });
  notifyNetworkRefreshed(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap);
}

function readCachedEntry(profileId) {
  const cache = loadCache();
  const entry = cache[profileId];
  if (!entry || !readCachedNetworkStatus({ [profileId]: entry }, profileId, Date.now(), WALLET_NETWORK_CACHE_TTL_MS)) {
    return null;
  }
  return entry;
}

/** @param {string} profileId */
export function getCachedNetworkStatus(profileId) {
  return readCachedNetworkStatus(loadCache(), profileId, Date.now(), WALLET_NETWORK_CACHE_TTL_MS);
}

/** @param {string} profileId */
export function getCachedNetworkAlertState(profileId) {
  const entry = readCachedEntry(profileId);
  if (!entry) return null;
  return alertStateForNetworkPoll(entry.scanKind, entry.status);
}

/** True after at least one resolver-confirmed status read this page visit. */
export function hasLatestResolverNetworkPoll() {
  return hasWalletNetworkTruthPoll();
}

/** True when this profile had a resolver-confirmed status read this visit (not cache-only). */
export function isResolverConfirmedProfile(profileId) {
  return isWalletNetworkTruthPollConfirmed(profileId);
}

/**
 * Per-profile since-visit suppress (A3/A4): SSOT chip must be poll-confirmed and reachable.
 * Global health gate is separate (`device-wallet-since-visit-gate.mjs`).
 * @param {string} profileId
 */
export function shouldSuppressCardDisabledSinceVisitForProfile(profileId) {
  return shouldSuppressCardDisabledSinceVisitFromTruth(profileId);
}

/** Fresh resolver-backed alert state from the latest wallet poll (SSOT). */
export function getLatestResolvedAlertState(profileId) {
  return getWalletNetworkTruthPollAlertState(profileId);
}

/** @param {string} profileId */
export function getLatestResolvedScanKind(profileId) {
  return getWalletNetworkTruthPollScanKind(profileId);
}

/**
 * Maps for since-visit UI from resolver-confirmed reads this visit only (SSOT).
 * @param {Array<{ profile_id?: string }>} [entries] omit to use truth poll profile ids only
 */
export function buildResolverConfirmedWalletPollMaps(entries) {
  return buildSinceVisitPollMapsFromTruth(entries);
}

/** @param {string} profileId */
export function getNetworkLastSeenBaseline(profileId) {
  if (!profileId) return null;
  const last = loadLastSeen()[profileId];
  return last == null ? null : String(last);
}

/** @param {string} profileId */
export function getCachedNetworkScanKind(profileId) {
  const entry = readCachedEntry(profileId);
  return entry?.scanKind ?? null;
}

/** @param {string} profileId */
export function getCachedNetworkQrScope(profileId) {
  const entry = readCachedEntry(profileId);
  return entry?.qrScope ?? null;
}

/** @param {string} profileId */
export function getCachedNetworkSeenAt(profileId) {
  const cache = loadCache();
  const entry = cache?.[profileId];
  return typeof entry?.at === "number" ? entry.at : null;
}

/** @param {string} profileId */
export function getCachedVerification(profileId) {
  return readCachedVerification(loadCache(), profileId, Date.now(), WALLET_NETWORK_CACHE_TTL_MS);
}

/**
 * @param {unknown} body
 * @returns {{
 *   status: string,
 *   scanKind: string | null,
 *   qrScope: string | null,
 *   alertState: string,
 *   qrId: string | null,
 *   scanUrl: string | null,
 * }}
 */
function parseNetworkFetchBody(body) {
  const scanKind = typeof body?.scan?.kind === "string" ? body.scan.kind : null;
  const qrScope = parseNetworkQrScope(body);
  const status = body?.scan?.card?.status || "unknown";
  const { verificationLabel, verificationState } = parseNetworkVerification(body);
  const qrIdRaw = typeof body?.scan?.qr_id === "string" ? body.scan.qr_id.trim() : "";
  const scanUrlRaw = typeof body?.scan?.scan_url === "string" ? body.scan.scan_url.trim() : "";
  return {
    status,
    scanKind,
    qrScope,
    alertState: alertStateForNetworkPoll(scanKind, status),
    verificationLabel,
    verificationState,
    qrId: qrIdRaw || null,
    scanUrl: scanUrlHasOfficialQrParam(scanUrlRaw) ? scanUrlRaw : null,
  };
}

/**
 * Resolver-confirmed poll truth only for kinds that carry card/QR network state.
 * @param {string | null | undefined} scanKind
 * @param {number} httpStatus
 */
function shouldResolverConfirmStatusPoll(scanKind, httpStatus) {
  const kind = String(scanKind || "").toLowerCase();
  if (kind === "card_revoked" || kind === "qr_revoked") return true;
  if (httpStatus >= 200 && httpStatus < 300) {
    return (
      kind === "active" ||
      kind.startsWith("card_") ||
      kind.startsWith("qr_")
    );
  }
  return false;
}

/**
 * @param {unknown} body
 * @returns {boolean}
 */
function hasStatusPollScanBody(body) {
  return (
    body != null &&
    typeof body === "object" &&
    typeof /** @type {{ scan?: { kind?: unknown } }} */ (body).scan?.kind === "string"
  );
}

/**
 * @param {string} pid
 * @param {ReturnType<typeof parseNetworkFetchBody>} parsed
 * @param {number} httpStatus
 * @param {number} now
 * @param {Record<string, WalletNetworkCacheEntry>} cache
 * @param {Record<string, string>} statusMap
 * @param {Record<string, string | null>} scanKindMap
 * @param {Record<string, string | null>} qrScopeMap
 * @param {Record<string, string>} alertStateMap
 * @param {Record<string, string>} resolverConfirmedAlertStateMap
 * @param {Record<string, string | null>} resolverConfirmedScanKindMap
 * @param {Record<string, string | null>} [qrIdMap]
 * @param {Record<string, string | null>} [scanUrlMap]
 */
function applyParsedStatusPoll(
  pid,
  parsed,
  httpStatus,
  now,
  cache,
  statusMap,
  scanKindMap,
  qrScopeMap,
  alertStateMap,
  resolverConfirmedAlertStateMap,
  resolverConfirmedScanKindMap,
  qrIdMap = {},
  scanUrlMap = {}
) {
  statusMap[pid] = parsed.status;
  scanKindMap[pid] = parsed.scanKind;
  qrScopeMap[pid] = parsed.qrScope;
  if (parsed.qrId) qrIdMap[pid] = parsed.qrId;
  if (parsed.scanUrl) scanUrlMap[pid] = parsed.scanUrl;
  if (
    parsed.alertState != null &&
    shouldResolverConfirmStatusPoll(parsed.scanKind, httpStatus)
  ) {
    alertStateMap[pid] = parsed.alertState;
    resolverConfirmedAlertStateMap[pid] = parsed.alertState;
    resolverConfirmedScanKindMap[pid] = parsed.scanKind;
  }
  cache[pid] = {
    status: parsed.status,
    scanKind: parsed.scanKind,
    qrScope: parsed.qrScope,
    verificationLabel: parsed.verificationLabel,
    verificationState: parsed.verificationState,
    at: now,
  };
}

/**
 * Wallet rows that would trigger a resolver GET on the next full refresh.
 *
 * @param {Array<{ profile_id: string, qr_id?: string | null }>} entries
 * @param {number} [now]
 */
export function listWalletEntriesNeedingNetworkFetch(entries, now = Date.now()) {
  const cache = loadCache();
  const lastSeen = loadLastSeen();
  return entries.filter((entry) => {
    const pid = entry.profile_id;
    if (!pid) return false;
    if (!isResolverConfirmedProfile(pid)) return true;
    const cached = cache[pid];
    return !shouldUseCachedNetworkStatus(
      lastSeen,
      pid,
      cached,
      now,
      WALLET_NETWORK_CACHE_TTL_MS
    );
  });
}

/**
 * G4: when a wallet status round hits 429 or every fetched row is offline/error, degrade
 * since-visit gating until a trustworthy poll completes.
 * @param {Set<string>} networkFetchedProfileIds
 * @param {Record<string, string>} statusMap
 * @param {boolean} saw429
 */
function applyWalletStatusPollHealthFromRound(networkFetchedProfileIds, statusMap, saw429) {
  if (networkFetchedProfileIds.size === 0) return;
  let next = "ok";
  if (saw429) {
    next = "degraded";
  } else {
    const allUnreachable = [...networkFetchedProfileIds].every(
      (pid) => statusMap[pid] === "offline" || statusMap[pid] === "error"
    );
    if (allUnreachable) next = "degraded";
  }
  const prev = getWalletStatusPollHealth();
  if (prev === next) return;
  setWalletStatusPollHealthForSinceVisit(next);
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("hc-resolver-health-changed"));
  }
}

/**
 * @param {Array<{ profile_id: string, qr_id?: string | null }>} entries
 * @param {(result: {
 *   statusMap: Record<string, string>,
 *   alertStateMap: Record<string, string>,
 *   scanKindMap: Record<string, string | null>,
 *   resolverConfirmedMap: Record<string, boolean>,
 * }) => void} [onDone]
 * @param {{ generation?: number, isCurrentGeneration?: () => boolean, maxParallel?: number, forceRefresh?: boolean }} [options]
 */
export async function refreshWalletNetworkStatuses(entries, onDone, options = {}) {
  const { generation, isCurrentGeneration, forceRefresh = false } = options;
  const entryProfileIds = entries.map((e) => e.profile_id).filter(Boolean);
  const cache = pruneWalletNetworkCache(loadCache(), {
    protectProfileIds: entryProfileIds,
    scopeProfileIds: entryProfileIds,
  });
  const statusMap = {};
  const alertStateMap = {};
  const scanKindMap = {};
  const qrScopeMap = {};
  const qrIdMap = {};
  const scanUrlMap = {};
  const resolverConfirmedAlertStateMap = {};
  const resolverConfirmedScanKindMap = {};
  const fetches = [];
  /** Profile IDs that took a network fetch this poll (not session-cache short circuit). */
  const networkFetchedProfileIds = new Set();
  let walletStatusPollSaw429 = false;
  const now = Date.now();
  const lastSeen = loadLastSeen();
  const maxParallel =
    typeof options.maxParallel === "number" && options.maxParallel > 0
      ? options.maxParallel
      : Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const pid = entry.profile_id;
    const cached = cache[pid];
    if (
      !forceRefresh &&
      shouldUseCachedNetworkStatus(lastSeen, pid, cached, now, WALLET_NETWORK_CACHE_TTL_MS)
    ) {
      statusMap[pid] = cached.status;
      scanKindMap[pid] = cached.scanKind ?? null;
      qrScopeMap[pid] = cached.qrScope ?? null;
      continue;
    }
    networkFetchedProfileIds.add(pid);
    fetches.push(
      (async () => {
        try {
          const statusUrl = getCardStatusUrl(pid, walletEntryQrId(entry));
          const { status, body, notModified } = await fetchResolverJson(statusUrl);
          if (notModified && cached) {
            statusMap[pid] = cached.status;
            scanKindMap[pid] = cached.scanKind ?? null;
            qrScopeMap[pid] = cached.qrScope ?? null;
            cache[pid] = { ...cached, at: now };
            return;
          }
          if (status === 429) {
            walletStatusPollSaw429 = true;
          }
          if (status < 200 || status >= 300) {
            if (hasStatusPollScanBody(body)) {
              applyParsedStatusPoll(
                pid,
                parseNetworkFetchBody(body),
                status,
                now,
                cache,
                statusMap,
                scanKindMap,
                qrScopeMap,
                alertStateMap,
                resolverConfirmedAlertStateMap,
                resolverConfirmedScanKindMap,
                qrIdMap,
                scanUrlMap
              );
              return;
            }
            statusMap[pid] = "error";
            scanKindMap[pid] = null;
            qrScopeMap[pid] = null;
            cache[pid] = {
              status: "error",
              scanKind: null,
              qrScope: null,
              verificationLabel: null,
              verificationState: null,
              at: now,
            };
            return;
          }
          applyParsedStatusPoll(
            pid,
            parseNetworkFetchBody(body),
            status,
            now,
            cache,
            statusMap,
            scanKindMap,
            qrScopeMap,
            alertStateMap,
            resolverConfirmedAlertStateMap,
            resolverConfirmedScanKindMap,
            qrIdMap,
            scanUrlMap
          );
        } catch {
          statusMap[pid] = "offline";
          scanKindMap[pid] = null;
          qrScopeMap[pid] = null;
          cache[pid] = {
            status: "offline",
            scanKind: null,
            qrScope: null,
            verificationLabel: null,
            verificationState: null,
            at: now,
          };
        }
      })()
    );
  }

  if (fetches.length > 0 && Number.isFinite(maxParallel)) {
    for (let i = 0; i < fetches.length; i += maxParallel) {
      await Promise.all(fetches.slice(i, i + maxParallel));
      if (generation != null && isCurrentGeneration && !isCurrentGeneration()) {
        onDone?.();
        return;
      }
    }
  } else if (fetches.length > 0) {
    await Promise.all(fetches);
  }

  if (generation != null && isCurrentGeneration && !isCurrentGeneration()) {
    onDone?.();
    return;
  }

  saveCache(cache, {
    protectProfileIds: entryProfileIds,
    scopeProfileIds: entryProfileIds,
  });
  applyWalletStatusPollHealthFromRound(
    networkFetchedProfileIds,
    statusMap,
    walletStatusPollSaw429
  );
  syncWalletNetworkTruthFromPoll(
    entries,
    statusMap,
    scanKindMap,
    networkFetchedProfileIds,
    resolverConfirmedAlertStateMap
  );
  const resolverConfirmedMap = Object.fromEntries(
    Object.keys(resolverConfirmedAlertStateMap).map((pid) => [pid, true])
  );
  const bannerAlertStateMap = { ...resolverConfirmedAlertStateMap };
  const bannerScanKindMap = { ...resolverConfirmedScanKindMap };
  persistWalletFromNetworkPoll({
    statusMap,
    alertStateMap,
    scanKindMap,
    qrScopeMap,
    qrIdMap,
    scanUrlMap,
  });
  notifyNetworkRefreshed(
    statusMap,
    bannerAlertStateMap,
    bannerScanKindMap,
    resolverConfirmedMap
  );
  onDone?.({
    statusMap,
    alertStateMap: bannerAlertStateMap,
    scanKindMap: bannerScanKindMap,
    resolverConfirmedMap,
    networkFetchedProfileIds: [...networkFetchedProfileIds],
  });
}

function loadLastSeen() {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastSeen(map) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * True when the resolver now reports card disabled but this device last recorded otherwise.
 * @param {string} profileId
 * @param {string | null | undefined} currentAlertState
 */
export function isRevokedSinceLastVisit(profileId, currentAlertState) {
  const last = loadLastSeen()[profileId];
  return isRevokedSinceLastVisitFromBaseline(last, currentAlertState);
}

/** @param {string} profileId @param {string} alertState */
export function recordNetworkSeen(profileId, alertState) {
  if (!profileId) return;
  const map = loadLastSeen();
  map[profileId] = String(alertState || "").toLowerCase();
  saveLastSeen(map);
  notifyBaselineChanged();
}

/** Snapshot current cached alert states when leaving the site (end of visit). */
export function snapshotNetworkSeenOnExit() {
  // DH-4: Only persist baselines from resolver-confirmed reads in this visit.
  if (!hasWalletNetworkTruthPoll()) return;
  const seen = loadLastSeen();
  for (const pid of listWalletNetworkTruthPollProfileIds()) {
    const alertState = getWalletNetworkTruthPollAlertState(pid);
    if (!alertState) continue;
    seen[pid] = String(alertState).toLowerCase();
  }
  saveLastSeen(seen);
  notifyBaselineChanged();

  // Prevent stale in-memory resolver-confirmed state from being re-applied when the
  // browser keeps the JS context (bfcache / fast navigation).
  resetWalletNetworkTruth();
}

/**
 * After a fresh resolver fetch, store baseline for cards that are not in transition.
 * @param {Record<string, string>} alertStateMap
 */
export function syncLastSeenFromNetworkMap(alertStateMap) {
  saveLastSeen(mergeLastSeenFromNetworkMap(alertStateMap, loadLastSeen()));
}

/**
 * Mirror resolver poll into hc_wallet (status, scan_kind, qr_id backfill). Alerts use scan.kind + baseline.
 * @param {{
 *   statusMap?: Record<string, string>,
 *   alertStateMap?: Record<string, string>,
 *   scanKindMap?: Record<string, string | null>,
 *   qrScopeMap?: Record<string, string | null>,
 *   qrIdMap?: Record<string, string | null>,
 *   scanUrlMap?: Record<string, string | null>,
 * }} poll
 */
export function persistWalletFromNetworkPoll(poll) {
  const {
    statusMap = {},
    scanKindMap = {},
    qrScopeMap = {},
    qrIdMap = {},
    scanUrlMap = {},
  } = poll;
  if (poll.alertStateMap) syncLastSeenFromNetworkMap(poll.alertStateMap);

  const stored = loadWallet();
  const cache = loadCache();
  const { entries, changed: qrBackfill } = normalizeWalletQrIds(stored);
  let changed = qrBackfill;
  const next = entries.map((e) => {
    const pid = e.profile_id;
    const net = statusMap[pid];
    const scanKind = scanKindMap[pid] ?? null;
    const resolvedQr = walletEntryQrId(e);
    const hadScanKind = Object.prototype.hasOwnProperty.call(e, "scan_kind");
    const currentScanKind = hadScanKind ? e.scan_kind ?? null : null;
    const qrChanged = resolvedQr && e.qr_id !== resolvedQr;
    const cached = cache[pid];
    const qrScope = qrScopeMap[pid] ?? cached?.qrScope ?? e.qr_scope ?? null;
    const verification = cached
      ? verificationRecordFromLabelState(cached.verificationLabel, cached.verificationState)
      : e.verification;
    const verificationDirty =
      verification &&
      JSON.stringify(verification) !== JSON.stringify(e.verification ?? null);
    const hadQrScope = Object.prototype.hasOwnProperty.call(e, "qr_scope");
    const currentQrScope = hadQrScope ? e.qr_scope ?? null : null;
    const qrScopeDirty = qrScope != null && currentQrScope !== qrScope;
    const polledQrId = qrIdMap[pid] ?? null;
    const polledScanUrl = scanUrlMap[pid] ?? null;
    const qrIdDirty = polledQrId && e.qr_id !== polledQrId;
    const scanUrlDirty =
      polledScanUrl &&
      e.scan_url !== polledScanUrl &&
      !scanUrlHasOfficialQrParam(e.scan_url);
    if (
      (net && (e.status !== net || currentScanKind !== scanKind || qrChanged || qrScopeDirty)) ||
      verificationDirty ||
      qrScopeDirty ||
      qrIdDirty ||
      scanUrlDirty
    ) {
      changed = true;
      return {
        ...e,
        ...(qrChanged || qrIdDirty ? { qr_id: polledQrId ?? resolvedQr } : {}),
        ...(scanUrlDirty ? { scan_url: polledScanUrl } : {}),
        ...(qrScopeDirty ? { qr_scope: qrScope } : {}),
        ...(net ? { status: net, scan_kind: scanKind } : {}),
        ...(verification ? { verification } : {}),
      };
    }
    return e;
  });
  if (changed) saveWallet(next);
}
