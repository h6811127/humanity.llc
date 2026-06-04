/**
 * Poll resolver for pending live-control challenges on saved wallet cards.
 * Signing stays on /created/  -  inbox only surfaces waiting requests.
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md (Phases 1–5 shipped; 7–8 budget, leader, large wallet)
 */
import {
  isWatchLiveProofEnabled,
  LIVE_PROOF_CHECKED_AT_SESSION_KEY,
} from "./device-hub-network-tools-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import {
  isLiveControlAutoPollBudgetExhausted,
  LIVE_CONTROL_AUTO_POLL_STORAGE_KEY,
  liveControlAutoPollBudgetSerializedAtCap,
  recordLiveControlAutoPoll,
} from "./device-live-control-poll-budget-core.mjs";
import {
  getStewardEntitlementsPolicy,
  stewardPushSubscribeAllowed,
  stewardResolverRequestHeaders,
  STEWARD_ENTITLEMENTS_CHANGED,
  STEWARD_MANUAL_POLL_HEADER,
  STEWARD_QUOTA_CHANGED,
} from "./device-steward-entitlements.mjs";
import {
  isStewardQuotaExceededBody,
  stewardQuotaUsageFromBody,
} from "./device-steward-quota-core.mjs";
import {
  initStewardPushClient,
  isStewardPushHealthy,
  stewardPushSuppressesAutoPoll,
  syncStewardPushConnection,
  STEWARD_PUSH_LIVE_PROOF_EVENT,
  STEWARD_PUSH_STATE_CHANGED,
} from "./device-steward-push.mjs";
import { shouldIgnoreLiveControlSnapshotFromSameTab } from "./device-live-control-poll-leader-core.mjs";
import {
  bindLiveControlPollLeaderSnapshot,
  broadcastLiveControlPollSnapshot,
  claimLiveControlPollLeader,
  getLiveControlPollTabId,
  isLiveControlPollLeaderTab,
  touchLiveControlPollLeader,
} from "./device-live-control-poll-leader.mjs";
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs?v=93";
import { selectLiveControlPollEntries } from "./device-wallet-scale-core.mjs";
import {
  forwardLiveProofPushToServiceWorker,
  syncLiveProofServiceWorkerState,
} from "./device-browser-notifications-sw.mjs";
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import { fetchResolverJson } from "./resolver-conditional-fetch-core.mjs";
import { activateWalletEntryGated } from "./device-control-activation.mjs";
import {
  buildLiveControlProofHref,
  classifyChallengeHttpStatus,
  formatLiveControlExpiry,
  isPollableWalletEntry,
  liveControlInboxChanged,
  parsePendingChallengeBody,
  getLiveControlPollHealth,
  setLiveControlPollHealth,
  applySingleCardPollHealth,
  applyLiveControlPollConfirmation,
  entriesForHubExpandLiveProofVerification,
  filterConfirmedLiveControlPending,
  pendingItemsFromPollSlots,
  pruneLiveControlPollSlots,
  updateLiveControlPollSlot,
} from "./device-live-control-inbox-core.mjs";
import {
  liveControlPollIntervalMs,
  liveControlPollAllowedByResolverHealth,
  liveControlAutoPollShouldRun,
  liveControlPollLoopShouldRun,
  liveControlPollTickShouldFetch,
  nextRoundRobinIndex,
  pickRoundRobinPollIndex,
  resolveLiveControlPollScope,
} from "./device-live-control-poll-scheduler.mjs";
import {
  findWalletEntryByProfileId,
  listPollableWalletEntries,
  walletEntryQrId,
} from "./device-wallet.mjs";

export { getLiveControlPollHealth } from "./device-live-control-inbox-core.mjs";
export {
  formatLiveControlExpiry,
  LIVE_PROOF_INBOX_ACTION_COPY,
  liveProofInboxAggregateTitle,
  liveProofInboxRowSubtitle,
} from "./device-live-control-inbox-core.mjs";
export {
  LIVE_CONTROL_POLL_MS_ACTIVE,
  LIVE_CONTROL_POLL_MS_IDLE,
  liveControlPollIntervalMs,
  liveControlPollAllowedByResolverHealth,
  liveControlPollLoopShouldRun,
  liveControlPollingShouldRun,
  resolveLiveControlPollScope,
} from "./device-live-control-poll-scheduler.mjs";

/** Back off live-control polls after Worker/edge 429 (see investigation doc). */
const RATE_LIMIT_BACKOFF_MS = 60_000;

export const LIVE_CONTROL_POLL_SCOPE_CHANGED = "hc-live-control-poll-scope-changed";

/** @see device-status.mjs RESOLVER_HEALTH_CHANGED */
const RESOLVER_HEALTH_CHANGED = "hc-resolver-health-changed";

let pollBackoffUntil = 0;
let stewardServerQuotaPaused = false;

export function isStewardServerQuotaPaused() {
  return stewardServerQuotaPaused;
}

/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[]} */
let pending = [];

/** Pending challenge discovered on scan page for the scanned profile (Phase 9). */
/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem | null} */
let scanPageLiveProofPending = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let pollTimer = null;
let pollFeatureEnabled = false;
let scopeListenersBound = false;
let scheduledIntervalMs = 0;

/** @type {Map<string, import("./device-live-control-inbox-core.mjs").LiveControlPendingItem | null>} */
const pollSlots = new Map();

/** Challenge ids confirmed by a successful GET in this tab (display gate). */
const confirmedChallengeIds = new Set();

let roundRobinCursor = 0;
let pollSyncInFlight = false;
/** Hub-expand verification sweep (Fix 1 step 2). */
let hubExpandVerifyInFlight = false;
/** Edge-trigger: verify once when poll scope opens, not on every scope-changed tick. */
let pollScopeWasActive = false;
/** Resolver health from device-status health fetch (detail.networkStatus), not wallet poll health. */
let resolverHealthForExpandVerify = "unset";
/** Tracks SSE push suppressing auto poll so we restart the loop when push drops. */
let stewardPushWasSuppressingAutoPoll = false;

function readPersistedLiveProofCheckedAt() {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const n = Number(sessionStorage.getItem(LIVE_PROOF_CHECKED_AT_SESSION_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {number} at
 */
function persistLiveProofCheckedAt(at) {
  lastLiveProofCheckAt = at;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LIVE_PROOF_CHECKED_AT_SESSION_KEY, String(at));
  } catch {
    /* ignore */
  }
}

let lastLiveProofCheckAt = readPersistedLiveProofCheckedAt();

export const LIVE_PROOF_CHECKED_EVENT = "hc-live-proof-checked";
export const LIVE_CONTROL_BUDGET_CHANGED = "hc-live-control-poll-budget-changed";

/** @typedef {{
 *   pending: import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[],
 *   health: import("./device-live-control-inbox-core.mjs").LiveControlPollHealth,
 *   at: number,
 *   tabId?: string,
 * }} LiveControlLeaderSnapshot */

export function getLastLiveProofCheckAt() {
  return lastLiveProofCheckAt;
}

function mergeLiveControlPendingCache() {
  if (!scanPageLiveProofPending) return [...pending];
  const profileId = scanPageLiveProofPending.entry?.profile_id;
  const withoutScanDup = pending.filter(
    (item) => item.entry?.profile_id !== profileId
  );
  return [...withoutScanDup, scanPageLiveProofPending];
}

/** Cached pending from polls, snapshots, or scan-page watch (may be unconfirmed). */
export function getLiveControlPending() {
  return mergeLiveControlPendingCache();
}

/**
 * Pending the shell may surface — only server-confirmed challenges (Fix 1 gate).
 */
export function getLiveControlPendingForDisplay() {
  return filterConfirmedLiveControlPending(
    mergeLiveControlPendingCache(),
    confirmedChallengeIds
  );
}

/**
 * Scan-page owner watch (one profile, one GET per tick) — Phase 9.
 * @param {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem | null} item
 */
export function setScanPageLiveProofPending(item) {
  const prevId = scanPageLiveProofPending?.challenge_id ?? null;
  const nextId = item?.challenge_id ?? null;
  scanPageLiveProofPending = item;
  if (item?.challenge_id) {
    confirmedChallengeIds.add(item.challenge_id);
  } else if (prevId) {
    confirmedChallengeIds.delete(prevId);
  }
  if (prevId !== nextId) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
}

export function getLiveControlPendingCount() {
  return getLiveControlPendingForDisplay().length;
}

/**
 * Clear cached live-proof inbox state after shell bfcache resume.
 * Display stays empty until a fresh GET confirms pending (Fix 1 step 1).
 */
export function resetLiveControlInboxOnShellResume() {
  const hadCache =
    pending.length > 0 ||
    pollSlots.size > 0 ||
    scanPageLiveProofPending != null ||
    confirmedChallengeIds.size > 0;

  pending = [];
  pollSlots.clear();
  scanPageLiveProofPending = null;
  confirmedChallengeIds.clear();

  if (typeof window !== "undefined" && hadCache) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ kind: import("./device-live-control-inbox-core.mjs").LiveControlPollKind, item?: import("./device-live-control-inbox-core.mjs").LiveControlPendingItem }} result
 */
function applyPollResultToSlots(entry, result) {
  applyLiveControlPollConfirmation(confirmedChallengeIds, entry, pollSlots, result);
  updateLiveControlPollSlot(pollSlots, entry, result);
}

export function isLiveControlInboxPollingActive() {
  return pollTimer != null;
}

function readPollScope() {
  if (typeof document === "undefined") {
    return resolveLiveControlPollScope({
      hubEl: null,
      inboxSheetOpen: false,
      walletPage: false,
      watchEnabled: false,
      stewardShellPage: false,
    });
  }
  return resolveLiveControlPollScope({
    hubEl: document.getElementById("device-hub"),
    inboxSheetOpen: document.body.classList.contains("device-inbox-sheet-open"),
    walletPage: document.body.classList.contains("page-wallet"),
    watchEnabled: isWatchLiveProofEnabled(),
    stewardShellPage: Boolean(document.getElementById("shell-notif-badge")),
  });
}

function readAutoPollBudgetRaw() {
  try {
    return localStorage.getItem(LIVE_CONTROL_AUTO_POLL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function isLiveControlAutoPollBudgetPaused() {
  const cap = getStewardEntitlementsPolicy().pollLiveProofAutoDailyCap;
  return isLiveControlAutoPollBudgetExhausted(readAutoPollBudgetRaw(), Date.now(), cap);
}

function ensurePollLeaderClaim() {
  if (isLiveControlPollLeaderTab()) return true;
  claimLiveControlPollLeader();
  return isLiveControlPollLeaderTab();
}

function readPollLoopShouldRun() {
  return liveControlAutoPollShouldRun({
    watchEnabled: isWatchLiveProofEnabled(),
    scopeActive: readPollScope(),
    resolverHealth: getResolverHealthStatus(),
    budgetExhausted: isLiveControlAutoPollBudgetPaused(),
    isPollLeader: isLiveControlPollLeaderTab(),
    stewardPushHealthy: stewardPushSuppressesAutoPoll(),
  });
}

function collectPendingProfileIds() {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const item of pending) {
    const pid = item?.entry?.profile_id;
    if (typeof pid === "string" && pid) ids.add(pid);
  }
  for (const [key, slot] of pollSlots) {
    if (!slot) continue;
    const pid = key.split(":")[0];
    if (pid) ids.add(pid);
  }
  return ids;
}

function resolvePollEntries(allPollable) {
  const session = getTabSession();
  const activeProfileId =
    session && typeof session.profile_id === "string" ? session.profile_id : null;
  return selectLiveControlPollEntries(
    allPollable,
    {
      walletSize: allPollable.length,
      activeProfileId,
      pendingProfileIds: collectPendingProfileIds(),
    },
    getStewardEntitlementsPolicy()
  );
}

function recordAutoPollBudgetUse() {
  try {
    const next = recordLiveControlAutoPoll(readAutoPollBudgetRaw());
    localStorage.setItem(LIVE_CONTROL_AUTO_POLL_STORAGE_KEY, next);
    window.dispatchEvent(new Event(LIVE_CONTROL_BUDGET_CHANGED));
  } catch {
    /* ignore */
  }
}

/**
 * @param {unknown} body
 */
function applyStewardServerQuotaPause(body) {
  stewardServerQuotaPaused = true;
  const usage = stewardQuotaUsageFromBody(body);
  const cap =
    usage?.limit ?? getStewardEntitlementsPolicy().pollLiveProofAutoDailyCap;
  try {
    localStorage.setItem(
      LIVE_CONTROL_AUTO_POLL_STORAGE_KEY,
      liveControlAutoPollBudgetSerializedAtCap(cap)
    );
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(LIVE_CONTROL_BUDGET_CHANGED));
  window.dispatchEvent(new Event(STEWARD_QUOTA_CHANGED));
}

/**
 * @param {boolean} manual
 * @returns {RequestInit}
 */
function liveControlChallengeFetchInit(manual) {
  const headers = new Headers(stewardResolverRequestHeaders());
  if (manual) {
    headers.set(STEWARD_MANUAL_POLL_HEADER, "1");
  }
  return { headers };
}

/**
 * Apply inbox state from the leader tab (no Worker fetch on this tab).
 * @param {LiveControlLeaderSnapshot} snapshot
 */
export function applyLiveControlInboxSnapshot(snapshot) {
  const sourceTabId = typeof snapshot.tabId === "string" ? snapshot.tabId : "";
  if (shouldIgnoreLiveControlSnapshotFromSameTab(sourceTabId, getLiveControlPollTabId())) {
    return;
  }

  const next = Array.isArray(snapshot.pending) ? [...snapshot.pending] : [];
  const prevHealth = getLiveControlPollHealth();
  setLiveControlPollHealth(
    snapshot.health === "degraded" || snapshot.health === "offline"
      ? snapshot.health
      : "ok"
  );
  const changed =
    liveControlInboxChanged(pending, next) || prevHealth !== getLiveControlPollHealth();
  pending = next;
  persistLiveProofCheckedAt(snapshot.at || Date.now());
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
}

/** Share inbox + checked-at with other tabs (no leader lock required). */
function broadcastLiveControlSnapshotToPeers() {
  const tabId = getLiveControlPollTabId();
  if (!tabId) return;
  broadcastLiveControlPollSnapshot({
    pending: getLiveControlPendingForDisplay(),
    health: getLiveControlPollHealth(),
    at: lastLiveProofCheckAt,
    tabId,
  });
}

function publishLeaderSnapshot() {
  if (!isLiveControlPollLeaderTab()) return;
  touchLiveControlPollLeader();
  broadcastLiveControlSnapshotToPeers();
}

/**
 * @param {{ manual?: boolean }} [opts]
 */
function publishLiveControlSnapshotAfterPoll(opts = {}) {
  if (opts.manual === true) {
    broadcastLiveControlSnapshotToPeers();
    return;
  }
  publishLeaderSnapshot();
}

function clearPollTimer() {
  if (pollTimer != null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
  scheduledIntervalMs = 0;
}

function armPollTimer() {
  clearPollTimer();
  if (!pollFeatureEnabled || !readPollLoopShouldRun()) return;
  const ms = liveControlPollIntervalMs(pending.length, getStewardEntitlementsPolicy());
  scheduledIntervalMs = ms;
  pollTimer = window.setTimeout(() => {
    pollTimer = null;
    void runPollTick();
  }, ms);
}

async function runPollTick() {
  if (!pollFeatureEnabled || !readPollLoopShouldRun()) {
    clearPollTimer();
    return;
  }
  if (
    !liveControlPollTickShouldFetch({
      documentVisible: document.visibilityState === "visible",
      backoffUntil: pollBackoffUntil,
    })
  ) {
    armPollTimer();
    return;
  }
  const prevInterval = liveControlPollIntervalMs(
    pending.length,
    getStewardEntitlementsPolicy()
  );
  await refreshLiveControlInbox();
  if (!pollFeatureEnabled || !readPollLoopShouldRun()) {
    clearPollTimer();
    return;
  }
  const nextInterval = liveControlPollIntervalMs(
    pending.length,
    getStewardEntitlementsPolicy()
  );
  if (nextInterval !== prevInterval || scheduledIntervalMs === 0) {
    armPollTimer();
    return;
  }
  armPollTimer();
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ manual?: boolean }} [opts]
 * @returns {Promise<{ kind: import("./device-live-control-inbox-core.mjs").LiveControlPollKind, item?: import("./device-live-control-inbox-core.mjs").LiveControlPendingItem }>}
 */
async function fetchPendingForEntry(entry, opts = {}) {
  if (!isPollableWalletEntry(entry)) return { kind: "none" };

  const profileId = entry.profile_id;
  const qrId = walletEntryQrId(entry);
  if (!qrId) return { kind: "none" };

  const manual = opts.manual === true;
  const pushTriggered = opts.pushTriggered === true;

  try {
    const url = getPendingLiveControlChallengeUrl(profileId, qrId);
    const { status, body, notModified } = await fetchResolverJson(
      url,
      liveControlChallengeFetchInit(manual && !pushTriggered)
    );
    const httpKind = classifyChallengeHttpStatus(status);
    if (httpKind === "unchanged" || notModified) return { kind: "unchanged" };
    if (httpKind === "none") return { kind: "none" };
    if (httpKind === "rate_limited") {
      if (!manual && isStewardQuotaExceededBody(body)) {
        applyStewardServerQuotaPause(body);
      }
      return { kind: "rate_limited" };
    }
    if (httpKind === "unreachable") return { kind: "unreachable" };
    const item = parsePendingChallengeBody(body, entry);
    return item ? { kind: "pending", item } : { kind: "none" };
  } catch {
    return { kind: "unreachable" };
  }
}

/**
 * @param {{ manual?: boolean }} [opts] manual=true runs one check even when watch is off
 */
export async function refreshLiveControlInbox(opts = {}) {
  const manual = opts.manual === true;
  if (!manual && !isWatchLiveProofEnabled()) {
    return pending;
  }
  if (!liveControlPollAllowedByResolverHealth(getResolverHealthStatus())) {
    return pending;
  }
  if (Date.now() < pollBackoffUntil) return pending;

  if (!manual) {
    if (!ensurePollLeaderClaim() || !isLiveControlPollLeaderTab()) {
      return pending;
    }
    if (isLiveControlAutoPollBudgetPaused()) {
      return pending;
    }
  }

  const allPollable = listPollableWalletEntries();
  const entries = resolvePollEntries(allPollable);
  pruneLiveControlPollSlots(pollSlots, allPollable);

  if (entries.length === 0) {
    pollSlots.clear();
    confirmedChallengeIds.clear();
    roundRobinCursor = 0;
    const prevHealth = getLiveControlPollHealth();
    const changed =
      liveControlInboxChanged(pending, []) || prevHealth !== "ok";
    pending = [];
    setLiveControlPollHealth("ok");
    if (changed) {
      window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
    }
    persistLiveProofCheckedAt(Date.now());
    window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
    publishLiveControlSnapshotAfterPoll(opts);
    return pending;
  }

  const pollIndex = pickRoundRobinPollIndex(roundRobinCursor, entries.length);
  const entry = entries[pollIndex];
  const result = await fetchPendingForEntry(entry, { manual });
  if (!manual) recordAutoPollBudgetUse();
  roundRobinCursor = nextRoundRobinIndex(roundRobinCursor, entries.length);

  if (result.kind === "rate_limited") {
    pollBackoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
  } else {
    applyPollResultToSlots(entry, result);
  }

  const next = pendingItemsFromPollSlots(entries, pollSlots);
  const prevHealth = getLiveControlPollHealth();
  setLiveControlPollHealth(applySingleCardPollHealth(prevHealth, result.kind));
  const changed =
    liveControlInboxChanged(pending, next) || prevHealth !== getLiveControlPollHealth();
  pending = next;
  persistLiveProofCheckedAt(Date.now());
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
  publishLiveControlSnapshotAfterPoll(opts);
  return pending;
}

/**
 * Apply a server push hint with one targeted challenge GET (E4c).
 *
 * @param {{
 *   profile_id?: string,
 *   qr_id?: string,
 *   expires_at?: string,
 * }} hint
 */
export async function applyLiveProofPendingFromPush(hint) {
  const profileId =
    typeof hint.profile_id === "string" ? hint.profile_id.trim() : "";
  if (!profileId) return pending;

  if (hint.expires_at) {
    const exp = Date.parse(hint.expires_at);
    if (Number.isFinite(exp) && exp <= Date.now()) return pending;
  }

  const entry = findWalletEntryByProfileId(profileId);
  if (!entry || !isPollableWalletEntry(entry)) return pending;

  const result = await fetchPendingForEntry(entry, { pushTriggered: true });
  const allPollable = listPollableWalletEntries();
  applyPollResultToSlots(entry, result);
  const next = pendingItemsFromPollSlots(allPollable, pollSlots);
  const prevHealth = getLiveControlPollHealth();
  setLiveControlPollHealth(applySingleCardPollHealth(prevHealth, result.kind));
  const changed =
    liveControlInboxChanged(pending, next) || prevHealth !== getLiveControlPollHealth();
  pending = next;
  persistLiveProofCheckedAt(Date.now());
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
  if (isLiveControlPollLeaderTab()) publishLeaderSnapshot();
  else broadcastLiveControlSnapshotToPeers();
  return pending;
}

/** One live-proof round-robin check (manual hub control when watch is off). */
export async function checkLiveProofNow() {
  return refreshLiveControlInbox({ manual: true });
}

/**
 * Background alerts: probe all pollable cards once before OS notify (tab hidden).
 * Does not require Watch; bounded by wallet size + resolver health.
 */
export async function probeLiveControlInboxForBackgroundAlerts() {
  if (!liveControlPollAllowedByResolverHealth(getResolverHealthStatus())) {
    return getLiveControlPendingForDisplay();
  }
  if (Date.now() < pollBackoffUntil) {
    return getLiveControlPendingForDisplay();
  }

  const allPollable = listPollableWalletEntries();
  pruneLiveControlPollSlots(pollSlots, allPollable);
  if (allPollable.length === 0) {
    return getLiveControlPendingForDisplay();
  }

  const entries = resolvePollEntries(allPollable);
  let rateLimited = false;
  for (const entry of entries) {
    const result = await fetchPendingForEntry(entry, { manual: true });
    if (result.kind === "rate_limited") {
      rateLimited = true;
      break;
    }
    applyPollResultToSlots(entry, result);
  }

  if (rateLimited) {
    pollBackoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
  }

  const next = pendingItemsFromPollSlots(entries, pollSlots);
  const prevHealth = getLiveControlPollHealth();
  const displayBefore = getLiveControlPendingForDisplay();
  setLiveControlPollHealth(rateLimited ? prevHealth : "ok");
  pending = next;
  const displayAfter = getLiveControlPendingForDisplay();
  const changed =
    liveControlInboxChanged(displayBefore, displayAfter) ||
    prevHealth !== getLiveControlPollHealth();
  persistLiveProofCheckedAt(Date.now());
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
  if (isLiveControlPollLeaderTab()) publishLeaderSnapshot();
  else broadcastLiveControlSnapshotToPeers();
  return displayAfter;
}

/**
 * Hub expand / inbox open: verify cached pending and discover real pending via manual GETs.
 * Runs when watch is off; does not start the auto-poll loop.
 */
export async function verifyLiveControlInboxOnHubExpand() {
  if (!pollFeatureEnabled || hubExpandVerifyInFlight) {
    return getLiveControlPendingForDisplay();
  }
  if (isWatchLiveProofEnabled()) {
    return getLiveControlPendingForDisplay();
  }
  if (!readPollScope()) {
    return getLiveControlPendingForDisplay();
  }
  if (!liveControlPollAllowedByResolverHealth(getResolverHealthStatus())) {
    return getLiveControlPendingForDisplay();
  }
  if (Date.now() < pollBackoffUntil) {
    return getLiveControlPendingForDisplay();
  }

  hubExpandVerifyInFlight = true;
  try {
    const allPollable = listPollableWalletEntries();
    pruneLiveControlPollSlots(pollSlots, allPollable);

    if (allPollable.length === 0) {
      pollSlots.clear();
      confirmedChallengeIds.clear();
      roundRobinCursor = 0;
      const prevHealth = getLiveControlPollHealth();
      const changed =
        liveControlInboxChanged(pending, []) || prevHealth !== "ok";
      pending = [];
      setLiveControlPollHealth("ok");
      if (changed) {
        window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
      }
      persistLiveProofCheckedAt(Date.now());
      window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
      publishLiveControlSnapshotAfterPoll({ manual: true });
      return getLiveControlPendingForDisplay();
    }

    const session = getTabSession();
    const activeProfileId =
      session && typeof session.profile_id === "string" ? session.profile_id : null;
    const policy = getStewardEntitlementsPolicy();
    const cachedPending = mergeLiveControlPendingCache();
    const toVerify = entriesForHubExpandLiveProofVerification(
      allPollable,
      cachedPending,
      activeProfileId,
      policy
    );

    let rateLimited = false;
    for (const entry of toVerify) {
      const result = await fetchPendingForEntry(entry, { manual: true });
      if (result.kind === "rate_limited") {
        rateLimited = true;
        break;
      }
      applyPollResultToSlots(entry, result);
    }

    if (rateLimited) {
      pollBackoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    }

    const entries = resolvePollEntries(allPollable);
    const next = pendingItemsFromPollSlots(entries, pollSlots);
    const prevHealth = getLiveControlPollHealth();
    const displayBefore = getLiveControlPendingForDisplay();
    setLiveControlPollHealth(rateLimited ? prevHealth : "ok");
    pending = next;
    const displayAfter = getLiveControlPendingForDisplay();
    const changed =
      liveControlInboxChanged(displayBefore, displayAfter) ||
      prevHealth !== getLiveControlPollHealth();
    persistLiveProofCheckedAt(Date.now());
    if (changed) {
      window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
    }
    window.dispatchEvent(new Event(LIVE_PROOF_CHECKED_EVENT));
    publishLiveControlSnapshotAfterPoll({ manual: true });
    return getLiveControlPendingForDisplay();
  } finally {
    hubExpandVerifyInFlight = false;
  }
}

/** Apply watch toggle without re-registering listeners. */
export function applyLiveControlWatchPreference() {
  if (!isWatchLiveProofEnabled()) {
    clearPollTimer();
  } else if (pollFeatureEnabled) {
    syncLiveControlInboxPolling();
  }
  void syncLiveProofServiceWorkerState();
}

/** Notify hub/inbox sheet open state changed (also dispatched by shell). */
export function syncLiveControlInboxPolling() {
  if (!pollFeatureEnabled) return;

  syncStewardPushConnection();
  const scopeActive = readPollScope();
  const resolverHealth = getResolverHealthStatus();
  const watchEnabled = isWatchLiveProofEnabled();

  if (!scopeActive) {
    clearPollTimer();
    return;
  }

  if (!liveControlPollAllowedByResolverHealth(resolverHealth)) {
    clearPollTimer();
    return;
  }

  if (watchEnabled) {
    ensurePollLeaderClaim();
  }

  if (pollTimer == null) {
    if (pollSyncInFlight) return;
    if (!readPollLoopShouldRun()) return;
    pollSyncInFlight = true;
    void refreshLiveControlInbox().finally(() => {
      pollSyncInFlight = false;
      if (pollFeatureEnabled && readPollLoopShouldRun()) armPollTimer();
    });
    return;
  }

  if (!readPollLoopShouldRun()) {
    return;
  }

  const ms = liveControlPollIntervalMs(pending.length, getStewardEntitlementsPolicy());
  if (ms !== scheduledIntervalMs) {
    armPollTimer();
  }
}

function bindLiveControlPollScopeListeners() {
  if (scopeListenersBound || typeof window === "undefined") return;
  scopeListenersBound = true;

  window.addEventListener(LIVE_CONTROL_POLL_SCOPE_CHANGED, () => {
    const scopeActive = readPollScope();
    const scopeBecameActive = scopeActive && !pollScopeWasActive;
    pollScopeWasActive = scopeActive;
    if (scopeBecameActive && !isWatchLiveProofEnabled()) {
      void verifyLiveControlInboxOnHubExpand().finally(() => {
        syncLiveControlInboxPolling();
      });
      return;
    }
    syncLiveControlInboxPolling();
  });

  window.addEventListener(RESOLVER_HEALTH_CHANGED, (e) => {
    const detail =
      e instanceof CustomEvent && e.detail && typeof e.detail === "object" ? e.detail : null;
    const networkStatus = detail?.networkStatus;
    if (
      networkStatus === "ok" ||
      networkStatus === "degraded" ||
      networkStatus === "offline"
    ) {
      const prev = resolverHealthForExpandVerify;
      resolverHealthForExpandVerify = networkStatus;
      const recoveredToOk =
        networkStatus === "ok" && (prev === "degraded" || prev === "offline");
      if (recoveredToOk && readPollScope() && !isWatchLiveProofEnabled()) {
        void verifyLiveControlInboxOnHubExpand().finally(() => {
          syncLiveControlInboxPolling();
        });
        return;
      }
    }
    syncLiveControlInboxPolling();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearPollTimer();
      return;
    }
    syncLiveControlInboxPolling();
  });

  window.addEventListener(STEWARD_ENTITLEMENTS_CHANGED, () => {
    syncLiveControlInboxPolling();
    void syncLiveProofServiceWorkerState();
  });

  window.addEventListener(STEWARD_PUSH_STATE_CHANGED, () => {
    const suppressing = stewardPushSuppressesAutoPoll();
    if (stewardPushWasSuppressingAutoPoll && !suppressing) {
      clearPollTimer();
    }
    stewardPushWasSuppressingAutoPoll = suppressing;
    syncLiveControlInboxPolling();
    void syncLiveProofServiceWorkerState();
  });

  window.addEventListener(STEWARD_PUSH_LIVE_PROOF_EVENT, (e) => {
    const detail =
      e instanceof CustomEvent && e.detail && typeof e.detail === "object"
        ? e.detail
        : null;
    if (!detail) return;
    void (async () => {
      await applyLiveProofPendingFromPush(detail);
      await forwardLiveProofPushToServiceWorker(detail, {
        pushEntitled: stewardPushSubscribeAllowed(getStewardEntitlementsPolicy()),
        pushHealthy: isStewardPushHealthy(),
      });
    })();
  });
}

/**
 * Enable live-control polling for this tab (landing / wallet). Does not start until scope is active.
 */
export function enableLiveControlInboxPolling() {
  pollFeatureEnabled = true;
  stewardPushWasSuppressingAutoPoll = stewardPushSuppressesAutoPoll();
  initStewardPushClient();
  bindLiveControlPollScopeListeners();
  bindLiveControlPollLeaderSnapshot(applyLiveControlInboxSnapshot);
  syncLiveControlInboxPolling();
}

/** @deprecated Use enableLiveControlInboxPolling + scope events. */
export function startLiveControlInboxPolling() {
  enableLiveControlInboxPolling();
}

export function stopLiveControlInboxPolling() {
  pollFeatureEnabled = false;
  clearPollTimer();
}

/**
 * @param {{
 *   entry: Record<string, unknown>,
 *   challenge_id: string,
 *   owner_url?: string | null,
 * }} item
 */
export async function openLiveControlProof(item) {
  const result = await activateWalletEntryGated(item.entry);
  if (!result.ok) {
    if (result.needsPin) {
      const pin = window.prompt("Enter PIN to take control in this tab:");
      if (pin != null && pin.trim()) {
        const retry = await activateWalletEntryGated(item.entry, { pin });
        if (!retry.ok) return;
      } else {
        return;
      }
    } else {
      return;
    }
  }
  location.href = buildLiveControlProofHref(item, location.origin);
}
