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
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

/** @param {Record<string, unknown>} entry */
export function createdUrlForEntry(entry) {
  const url = new URL("/created/", location.origin);
  url.searchParams.set("profile_id", String(entry.profile_id));
  if (entry.qr_id) url.searchParams.set("qr_id", String(entry.qr_id));
  return url.href;
}
