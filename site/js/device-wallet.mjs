/**
 * Device-local saved cards with signing keys (`hc_wallet`).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
export const WALLET_STORAGE_KEY = "hc_wallet";

export function loadWallet() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWallet(entries) {
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

export function walletEntryFromSession(session, label) {
  return {
    id: `${session.profile_id}_${Date.now()}`,
    label: label.trim() || `@${session.handle || session.profile_id.slice(0, 8)}`,
    saved_at: new Date().toISOString(),
    profile_id: session.profile_id,
    qr_id: session.qr_id,
    handle: session.handle,
    manifesto_line: session.manifesto_line,
    scan_url: session.scan_url,
    owner_public_key_b58: session.owner_public_key_b58,
    owner_private_key_b58: session.owner_private_key_b58,
    recovery_public_key_b58: session.recovery_public_key_b58,
    recovery_private_key_b58: session.recovery_private_key_b58,
    qr_expires_at: session.qr_expires_at,
    status: session.status,
    verification: session.verification,
    issued_vouches: session.issued_vouches,
  };
}

export function isWalletSaved(profileId) {
  return loadWallet().some((e) => e.profile_id === profileId);
}

/** Row subtitle  -  always show network handle + id so labels cannot lie. */
export function walletEntrySubtitle(entry) {
  const parts = [];
  if (entry.handle) parts.push(`@${entry.handle}`);
  else if (entry.profile_id) parts.push(entry.profile_id.slice(0, 14) + "…");
  if (entry.profile_id && entry.handle) {
    parts.push(entry.profile_id.slice(0, 10) + "…");
  }
  return parts.join(" · ") || "Saved card";
}

export function defaultWalletLabel(session) {
  return session?.handle ? `@${session.handle}` : session?.profile_id?.slice(0, 12) || "Saved card";
}

/**
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 * @returns {{ ok: true } | { error: string }}
 */
export function saveSessionToWallet(session, label = "") {
  if (!session?.profile_id || !session?.owner_private_key_b58) {
    return { error: "No signing keys in this tab." };
  }
  const entries = loadWallet();
  const idx = entries.findIndex((e) => e.profile_id === session.profile_id);
  if (idx >= 0) {
    const trimmed = label.trim();
    if (trimmed && trimmed !== entries[idx].label) {
      entries[idx] = {
        ...entries[idx],
        label: trimmed,
        handle: session.handle ?? entries[idx].handle,
        manifesto_line: session.manifesto_line ?? entries[idx].manifesto_line,
        saved_at: new Date().toISOString(),
      };
      saveWallet(entries);
      return { ok: true, updated: true };
    }
    return { ok: true, already: true };
  }
  entries.unshift(walletEntryFromSession(session, label));
  saveWallet(entries);
  return { ok: true };
}
