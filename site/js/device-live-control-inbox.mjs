/**
 * Poll resolver for pending live-control challenges on saved wallet cards.
 * Signing stays on /created/  -  inbox only surfaces waiting requests.
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md (Phases 1–3 — scoped polling + round-robin + health gate)
 */
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs";
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import { activateWalletEntry } from "./device-keys.mjs";
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
  pendingItemsFromPollSlots,
  pruneLiveControlPollSlots,
  updateLiveControlPollSlot,
} from "./device-live-control-inbox-core.mjs";
import {
  liveControlPollIntervalMs,
  liveControlPollAllowedByResolverHealth,
  liveControlPollLoopShouldRun,
  liveControlPollTickShouldFetch,
  nextRoundRobinIndex,
  pickRoundRobinPollIndex,
  resolveLiveControlPollScope,
} from "./device-live-control-poll-scheduler.mjs";
import { loadWallet, walletEntryQrId } from "./device-wallet.mjs";

export { getLiveControlPollHealth } from "./device-live-control-inbox-core.mjs";
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

/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[]} */
let pending = [];

/** @type {ReturnType<typeof setTimeout> | null} */
let pollTimer = null;
let pollFeatureEnabled = false;
let scopeListenersBound = false;
let scheduledIntervalMs = 0;

/** @type {Map<string, import("./device-live-control-inbox-core.mjs").LiveControlPendingItem | null>} */
const pollSlots = new Map();

let roundRobinCursor = 0;
let pollSyncInFlight = false;

export { formatLiveControlExpiry };

export function getLiveControlPending() {
  return [...pending];
}

export function getLiveControlPendingCount() {
  return pending.length;
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
    });
  }
  return resolveLiveControlPollScope({
    hubEl: document.getElementById("device-hub"),
    inboxSheetOpen: document.body.classList.contains("device-inbox-sheet-open"),
    walletPage: document.body.classList.contains("page-wallet"),
  });
}

function readPollLoopShouldRun() {
  return liveControlPollLoopShouldRun({
    scopeActive: readPollScope(),
    resolverHealth: getResolverHealthStatus(),
  });
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
  const ms = liveControlPollIntervalMs(pending.length);
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
  const prevInterval = liveControlPollIntervalMs(pending.length);
  await refreshLiveControlInbox();
  if (!pollFeatureEnabled || !readPollLoopShouldRun()) {
    clearPollTimer();
    return;
  }
  const nextInterval = liveControlPollIntervalMs(pending.length);
  if (nextInterval !== prevInterval || scheduledIntervalMs === 0) {
    armPollTimer();
    return;
  }
  armPollTimer();
}

/**
 * @param {Record<string, unknown>} entry
 * @returns {Promise<{ kind: import("./device-live-control-inbox-core.mjs").LiveControlPollKind, item?: import("./device-live-control-inbox-core.mjs").LiveControlPendingItem }>}
 */
async function fetchPendingForEntry(entry) {
  if (!isPollableWalletEntry(entry)) return { kind: "none" };

  const profileId = entry.profile_id;
  const qrId = walletEntryQrId(entry);
  if (!qrId) return { kind: "none" };

  try {
    const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
      cache: "no-store",
    });
    const httpKind = classifyChallengeHttpStatus(res.status);
    if (httpKind === "none") return { kind: "none" };
    if (httpKind === "rate_limited") return { kind: "rate_limited" };
    if (httpKind === "unreachable") return { kind: "unreachable" };
    const body = await res.json();
    const item = parsePendingChallengeBody(body, entry);
    return item ? { kind: "pending", item } : { kind: "none" };
  } catch {
    return { kind: "unreachable" };
  }
}

export async function refreshLiveControlInbox() {
  if (!liveControlPollAllowedByResolverHealth(getResolverHealthStatus())) {
    return pending;
  }
  if (Date.now() < pollBackoffUntil) return pending;
  const entries = loadWallet().filter((e) => isPollableWalletEntry(e));
  pruneLiveControlPollSlots(pollSlots, entries);

  if (entries.length === 0) {
    pollSlots.clear();
    roundRobinCursor = 0;
    const prevHealth = getLiveControlPollHealth();
    const changed =
      liveControlInboxChanged(pending, []) || prevHealth !== "ok";
    pending = [];
    setLiveControlPollHealth("ok");
    if (changed) {
      window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
    }
    return pending;
  }

  const pollIndex = pickRoundRobinPollIndex(roundRobinCursor, entries.length);
  const entry = entries[pollIndex];
  const result = await fetchPendingForEntry(entry);
  roundRobinCursor = nextRoundRobinIndex(roundRobinCursor, entries.length);

  if (result.kind === "rate_limited") {
    pollBackoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
  } else {
    updateLiveControlPollSlot(pollSlots, entry, result);
  }

  const next = pendingItemsFromPollSlots(entries, pollSlots);
  const prevHealth = getLiveControlPollHealth();
  setLiveControlPollHealth(applySingleCardPollHealth(prevHealth, result.kind));
  const changed =
    liveControlInboxChanged(pending, next) || prevHealth !== getLiveControlPollHealth();
  pending = next;
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  return pending;
}

/** Notify hub/inbox sheet open state changed (also dispatched by shell). */
export function syncLiveControlInboxPolling() {
  if (!pollFeatureEnabled) return;

  if (!readPollScope()) {
    clearPollTimer();
    return;
  }

  if (!liveControlPollAllowedByResolverHealth(getResolverHealthStatus())) {
    clearPollTimer();
    return;
  }

  if (pollTimer == null) {
    if (pollSyncInFlight) return;
    pollSyncInFlight = true;
    void refreshLiveControlInbox().finally(() => {
      pollSyncInFlight = false;
      if (pollFeatureEnabled && readPollLoopShouldRun()) armPollTimer();
    });
    return;
  }

  const ms = liveControlPollIntervalMs(pending.length);
  if (ms !== scheduledIntervalMs) {
    armPollTimer();
  }
}

function bindLiveControlPollScopeListeners() {
  if (scopeListenersBound || typeof window === "undefined") return;
  scopeListenersBound = true;

  window.addEventListener(LIVE_CONTROL_POLL_SCOPE_CHANGED, () => {
    syncLiveControlInboxPolling();
  });

  window.addEventListener(RESOLVER_HEALTH_CHANGED, () => {
    syncLiveControlInboxPolling();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearPollTimer();
      return;
    }
    syncLiveControlInboxPolling();
  });
}

/**
 * Enable live-control polling for this tab (landing / wallet). Does not start until scope is active.
 */
export function enableLiveControlInboxPolling() {
  pollFeatureEnabled = true;
  bindLiveControlPollScopeListeners();
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
export function openLiveControlProof(item) {
  activateWalletEntry(item.entry);
  location.href = buildLiveControlProofHref(item, location.origin);
}
