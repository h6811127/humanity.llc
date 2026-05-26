/**
 * Poll resolver for pending live-control challenges on saved wallet cards.
 * Signing stays on /created/  -  inbox only surfaces waiting requests.
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md (Phase 1 — scoped polling + idle interval)
 */
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
  summarizeLiveControlPoll,
} from "./device-live-control-inbox-core.mjs";
import {
  liveControlPollIntervalMs,
  liveControlPollTickShouldFetch,
  resolveLiveControlPollScope,
} from "./device-live-control-poll-scheduler.mjs";
import { loadWallet, walletEntryQrId } from "./device-wallet.mjs";

export { getLiveControlPollHealth } from "./device-live-control-inbox-core.mjs";
export {
  LIVE_CONTROL_POLL_MS_ACTIVE,
  LIVE_CONTROL_POLL_MS_IDLE,
  liveControlPollIntervalMs,
  liveControlPollingShouldRun,
  resolveLiveControlPollScope,
} from "./device-live-control-poll-scheduler.mjs";

/** Back off live-control polls after Worker/edge 429 (see investigation doc). */
const RATE_LIMIT_BACKOFF_MS = 60_000;

export const LIVE_CONTROL_POLL_SCOPE_CHANGED = "hc-live-control-poll-scope-changed";

let pollBackoffUntil = 0;

/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[]} */
let pending = [];

/** @type {ReturnType<typeof setTimeout> | null} */
let pollTimer = null;
let pollFeatureEnabled = false;
let scopeListenersBound = false;
let scheduledIntervalMs = 0;

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

function clearPollTimer() {
  if (pollTimer != null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
  scheduledIntervalMs = 0;
}

function armPollTimer() {
  clearPollTimer();
  if (!pollFeatureEnabled || !readPollScope()) return;
  const ms = liveControlPollIntervalMs(pending.length);
  scheduledIntervalMs = ms;
  pollTimer = window.setTimeout(() => {
    pollTimer = null;
    void runPollTick();
  }, ms);
}

async function runPollTick() {
  if (!pollFeatureEnabled || !readPollScope()) {
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
  if (!pollFeatureEnabled || !readPollScope()) {
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
  if (Date.now() < pollBackoffUntil) return pending;
  const entries = loadWallet().filter((e) => isPollableWalletEntry(e));
  const results = await Promise.all(entries.map(fetchPendingForEntry));
  if (results.some((r) => r.kind === "rate_limited")) {
    pollBackoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
  }
  const summary = summarizeLiveControlPoll(results, entries.length);
  const next = summary.pending;
  const prevHealth = getLiveControlPollHealth();
  setLiveControlPollHealth(summary.health);
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

  if (pollTimer == null) {
    void refreshLiveControlInbox().finally(() => {
      if (pollFeatureEnabled && readPollScope()) armPollTimer();
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
