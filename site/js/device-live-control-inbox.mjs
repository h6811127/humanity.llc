/**
 * Poll resolver for pending live-control challenges on saved wallet cards.
 * Signing stays on /created/  -  inbox only surfaces waiting requests.
 */
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import { activateWalletEntry, createdUrlForEntry } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";

const POLL_MS = 5000;

/** @type {Array<{
 *   entry: Record<string, unknown>,
 *   challenge_id: string,
 *   return_url: string | null,
 *   owner_url: string | null,
 *   expires_at: string,
 * }>} */
let pending = [];

let pollTimer = null;

export function getLiveControlPending() {
  return [...pending];
}

export function getLiveControlPendingCount() {
  return pending.length;
}

/**
 * @param {string} iso
 */
export function formatLiveControlExpiry(iso) {
  try {
    const exp = Date.parse(iso);
    if (Number.isNaN(exp)) return "";
    const mins = Math.max(0, Math.round((exp - Date.now()) / 60000));
    if (mins < 1) return "expires soon";
    if (mins === 1) return "expires in 1 min";
    return `expires in ${mins} min`;
  } catch {
    return "";
  }
}

/**
 * @param {Record<string, unknown>} entry
 */
async function fetchPendingForEntry(entry) {
  const profileId = entry.profile_id;
  const qrId = entry.qr_id;
  if (typeof profileId !== "string" || typeof qrId !== "string" || !qrId) {
    return null;
  }

  try {
    const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = await res.json();
    if (body.status !== "pending" || !body.challenge_id) return null;
    return {
      entry,
      challenge_id: String(body.challenge_id),
      return_url: typeof body.return_url === "string" ? body.return_url : null,
      owner_url: typeof body.owner_url === "string" ? body.owner_url : null,
      expires_at: typeof body.expires_at === "string" ? body.expires_at : "",
    };
  } catch {
    return null;
  }
}

function pendingSignature(items) {
  return items
    .map((p) => `${p.entry.profile_id}:${p.challenge_id}`)
    .sort()
    .join("|");
}

export async function refreshLiveControlInbox() {
  const entries = loadWallet().filter((e) => e.profile_id && e.qr_id);
  const results = await Promise.all(entries.map(fetchPendingForEntry));
  const next = results.filter(Boolean);
  const prevSig = pendingSignature(pending);
  const nextSig = pendingSignature(next);
  pending = next;
  if (prevSig !== nextSig) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  return pending;
}

export function startLiveControlInboxPolling() {
  if (pollTimer != null) return;
  void refreshLiveControlInbox();
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void refreshLiveControlInbox();
    }
  }, POLL_MS);
  document.addEventListener("visibilitychange", onVisibilityLiveControl);
}

function onVisibilityLiveControl() {
  if (document.visibilityState === "visible") {
    void refreshLiveControlInbox();
  }
}

export function stopLiveControlInboxPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  document.removeEventListener("visibilitychange", onVisibilityLiveControl);
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
  if (item.owner_url) {
    location.href = item.owner_url;
    return;
  }
  const url = new URL(createdUrlForEntry(item.entry), location.origin);
  url.searchParams.set("live_challenge", item.challenge_id);
  location.href = url.href;
}
