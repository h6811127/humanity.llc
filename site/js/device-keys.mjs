import { logDeviceActivity, walletEntryForActivity } from "./device-activity.mjs";
import { navigateTo } from "./device-shell-motion.mjs";
import { setLastActiveProfileId } from "./device-quiet-tab-rehydrate-prefs.mjs";
import { clearSignUnlock } from "./vouch-sign-lock.mjs";
import { loadWallet, walletEntryQrId } from "./device-wallet.mjs";

/**
 * Load saved-card keys into this tab (sessionStorage).
 */
export function getTabSession() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear signing keys from this tab only (saved wallet rows unchanged). */
export function clearTabSessionKeys() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    const session = raw ? JSON.parse(raw) : null;
    if (session?.profile_id) {
      clearSignUnlock(session.profile_id);
    }
    sessionStorage.removeItem("hc_created");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

/** @param {Record<string, unknown>} entry */
export function activateWalletEntry(entry) {
  const qrId = walletEntryQrId(entry);
  sessionStorage.setItem(
    "hc_created",
    JSON.stringify({
      profile_id: entry.profile_id,
      qr_id: qrId,
      handle: entry.handle,
      manifesto_line: entry.manifesto_line,
      scan_url: entry.scan_url,
      owner_public_key_b58: entry.owner_public_key_b58,
      owner_private_key_b58: entry.owner_private_key_b58,
      recovery_public_key_b58: entry.recovery_public_key_b58,
      recovery_private_key_b58: entry.recovery_private_key_b58,
      qr_expires_at: entry.qr_expires_at,
      status: entry.status || "active",
      verification: entry.verification,
      issued_vouches: entry.issued_vouches || [],
      wallet_label: entry.label,
    })
  );
  setLastActiveProfileId(String(entry.profile_id || ""));
  logDeviceActivity("use_keys", entry.label || entry.handle || String(entry.profile_id).slice(0, 12), {
    profile_id: entry.profile_id,
    qr_id: qrId,
  });
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

/** @param {Record<string, unknown>} entry */
export function createdUrlForEntry(entry) {
  const url = new URL("/created/", location.origin);
  url.searchParams.set("profile_id", String(entry.profile_id));
  const qrId = walletEntryQrId(entry);
  if (qrId) url.searchParams.set("qr_id", qrId);
  return url.href;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ returnUrl?: string | null }} [opts]
 */
export function buildCreatedPageUrl(entry, opts = {}) {
  if (!entry?.profile_id) return null;
  const url = new URL(createdUrlForEntry(entry));
  let returnUrl = opts.returnUrl ?? null;
  if (!returnUrl) {
    try {
      returnUrl = sessionStorage.getItem("hc_vouch_return_url");
    } catch {
      /* ignore */
    }
  }
  if (returnUrl) {
    url.searchParams.set("return_url", returnUrl);
    url.searchParams.set("intent", "vouch");
  }
  return url;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ returnUrl?: string | null, skipActivate?: boolean }} [opts]
 * @returns {URL | null}
 */
function createdPageUrlForEntry(entry, opts = {}) {
  if (!entry?.profile_id) return null;

  const saved =
    entry.owner_private_key_b58 != null
      ? entry
      : loadWallet().find((w) => w.profile_id === entry.profile_id) ?? null;

  const target = saved ?? entry;
  if (saved?.owner_private_key_b58 && !opts.skipActivate) {
    activateWalletEntry(saved);
  }
  return buildCreatedPageUrl(target, opts);
}

/**
 * Load saved keys when available and open /created/ (Now tab by default).
 * @param {Record<string, unknown>} entry
 * @param {{ returnUrl?: string | null }} [opts]
 */
export function openCardNowPage(entry, opts = {}) {
  void import("./device-control-activation.mjs").then(async ({ openCardNowPageGated }) => {
    let result = await openCardNowPageGated(entry, opts);
    if (!result.ok && result.needsPin) {
      const pin = window.prompt("Enter PIN to open controls in this tab:");
      if (pin != null && pin.trim()) {
        result = await openCardNowPageGated(entry, { ...opts, pin });
      }
    }
    if (!result.ok && result.error) {
      window.alert(result.error);
    }
  });
  return true;
}

/**
 * Open /created/ focused on a control panel (Advanced tab or live-proof strip).
 * @param {Record<string, unknown>} entry
 * @param {string} focus Panel hash without # (e.g. update-status, revoke, rotate-qr, live-proof)
 * @param {{ returnUrl?: string | null }} [opts]
 */
export function openCardControlPage(entry, focus, opts = {}) {
  const url = createdPageUrlForEntry(entry, opts);
  if (!url) return false;
  if (focus && focus !== "now") {
    url.hash = focus;
  }
  navigateTo(url.href);
  return true;
}

/**
 * @param {{ type: string, label: string, profile_id?: string | null, qr_id?: string | null }} activity
 */
export function openActivityNow(activity) {
  if (activity.type === "pin_added") {
    navigateTo("/wallet/");
    return true;
  }

  const wallet = walletEntryForActivity(activity);
  if (wallet) {
    openCardNowPage(wallet);
    return true;
  }

  if (activity.profile_id) {
    return openCardNowPage({
      profile_id: activity.profile_id,
      qr_id: activity.qr_id ?? null,
    });
  }

  return false;
}
