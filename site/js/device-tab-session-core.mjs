/**
 * Tab session (`hc_created`) signing-material guards (pure).
 * @see docs/SAFARI_KEYS_CUSTODY.md P0-6
 */

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function tabSessionHasSigningKeys(session) {
  if (!session || typeof session !== "object") return false;
  return Boolean(
    session.owner_private_key_b58 || session.recovery_private_key_b58
  );
}

/**
 * Wallet row or hub public view — owner key, recovery key, or summary flag.
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function walletEntryHasSigningMaterial(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.has_signing_key === true) return true;
  return tabSessionHasSigningKeys(entry);
}

/**
 * @param {string | null | undefined} raw
 * @returns {{ action: "absent" } | { action: "keep", session: Record<string, unknown> } | { action: "strip" }}
 */
export function tabSessionReadAction(raw) {
  if (!raw) return { action: "absent" };
  try {
    const session = JSON.parse(raw);
    if (tabSessionHasSigningKeys(session)) {
      return { action: "keep", session };
    }
    return { action: "strip" };
  } catch {
    return { action: "strip" };
  }
}

/**
 * @param {Record<string, unknown>} session
 * @returns {{ ok: true, serialized: string } | { ok: false }}
 */
export function tabSessionSerializeForStore(session) {
  if (!tabSessionHasSigningKeys(session)) {
    return { ok: false };
  }
  return { ok: true, serialized: JSON.stringify(session) };
}
