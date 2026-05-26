import { logDeviceActivity, walletEntryForActivity } from "./device-activity.mjs";
import { navigateTo } from "./device-shell-motion.mjs";
import { loadWallet } from "./device-wallet.mjs";

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

/** @param {Record<string, unknown>} entry */
export function activateWalletEntry(entry) {
  sessionStorage.setItem(
    "hc_created",
    JSON.stringify({
      profile_id: entry.profile_id,
      qr_id: entry.qr_id ?? null,
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
  logDeviceActivity("use_keys", entry.label || entry.handle || String(entry.profile_id).slice(0, 12), {
    profile_id: entry.profile_id,
    qr_id: entry.qr_id ?? null,
  });
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

/** @param {Record<string, unknown>} entry */
export function createdUrlForEntry(entry) {
  const url = new URL("/created/", location.origin);
  url.searchParams.set("profile_id", String(entry.profile_id));
  if (entry.qr_id) url.searchParams.set("qr_id", String(entry.qr_id));
  return url.href;
}

/**
 * Load saved keys when available and open /created/ (Now tab by default).
 * @param {Record<string, unknown>} entry
 * @param {{ returnUrl?: string | null }} [opts]
 */
export function openCardNowPage(entry, opts = {}) {
  if (!entry?.profile_id) return false;

  const saved =
    entry.owner_private_key_b58 != null
      ? entry
      : loadWallet().find((w) => w.profile_id === entry.profile_id) ?? null;

  const target = saved ?? entry;
  if (saved?.owner_private_key_b58) {
    activateWalletEntry(saved);
  }
  const url = new URL(createdUrlForEntry(target));
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
