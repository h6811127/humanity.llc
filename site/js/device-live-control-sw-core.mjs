/**
 * Pure live-proof polling for the background service worker (Phase D).
 * @see docs/DEVICE_INBOX.md — v2 Phase D
 */
import { osNotificationContentForLiveProof } from "./device-browser-notifications-core.mjs";
import {
  buildLiveControlProofHref,
  classifyChallengeHttpStatus,
  isPollableWalletEntry,
  liveControlPendingSignature,
  parsePendingChallengeBody,
} from "./device-live-control-inbox-core.mjs";
import { walletEntryQrId } from "./device-wallet.mjs";

export const SW_STATE_CACHE = "hc-live-proof-sw-v1";
export const SW_STATE_CACHE_KEY = "/__hc_sw_live_proof_state__";
export const SW_SYNC_TAG = "hc-live-proof-poll";
export const SW_PERIODIC_TAG = "hc-live-proof-poll";
export const SW_NOTIFICATION_TAG = "hc-live-proof";

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 * @param {string} qrId
 */
export function pendingLiveControlChallengeUrl(apiOrigin, profileId, qrId) {
  const url = new URL(
    `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/live-control/challenges`,
    apiOrigin
  );
  url.searchParams.set("qr_id", qrId);
  return url.href;
}

/**
 * Wallet rows the page should mirror into the service worker.
 * @param {Array<Record<string, unknown>>} wallet
 */
export function liveProofPollTargetsFromWallet(wallet) {
  return wallet
    .filter((entry) => isPollableWalletEntry(entry))
    .map((entry) => ({
      profile_id: entry.profile_id,
      qr_id: walletEntryQrId(entry),
      label: entry.label,
      handle: entry.handle,
      scan_url: entry.scan_url,
    }))
    .filter((row) => typeof row.profile_id === "string" && typeof row.qr_id === "string");
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} apiOrigin
 * @param {(url: string) => Promise<{ ok: boolean, status: number, body: unknown }>} [fetchFn]
 */
export async function pollWalletEntriesForLiveProof(entries, apiOrigin, fetchFn = defaultFetch) {
  const pollable = entries.filter((e) => isPollableWalletEntry(e));
  /** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[]} */
  const pending = [];

  for (const entry of pollable) {
    const profileId = String(entry.profile_id);
    const qrId = walletEntryQrId(entry);
    if (!qrId) continue;
    const url = pendingLiveControlChallengeUrl(apiOrigin, profileId, qrId);
    try {
      const { status, body } = await fetchFn(url);
      const httpKind = classifyChallengeHttpStatus(status);
      if (httpKind !== "ok") continue;
      const item = parsePendingChallengeBody(body, entry);
      if (item) pending.push(item);
    } catch {
      /* unreachable — skip row */
    }
  }

  return {
    pending,
    signature: liveControlPendingSignature(pending),
  };
}

/**
 * @param {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem} item
 * @param {string} pageOrigin
 */
export function buildLiveProofSwNotification(item, pageOrigin) {
  const { title, body } = osNotificationContentForLiveProof(item);
  return {
    title,
    body,
    tag: SW_NOTIFICATION_TAG,
    href: buildLiveControlProofHref(item, pageOrigin),
  };
}

/**
 * @param {Array<{ visibilityState?: string }>} clients
 */
export function anyClientVisible(clients) {
  return clients.some((c) => c.visibilityState === "visible");
}

/**
 * @param {string | null | undefined} prevSig
 * @param {string} nextSig
 * @param {number} pendingCount
 */
export function shouldShowSwLiveProofNotification(prevSig, nextSig, pendingCount) {
  if (pendingCount <= 0) return false;
  if (!nextSig) return false;
  return prevSig !== nextSig;
}

/** @param {string} url */
async function defaultFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}
