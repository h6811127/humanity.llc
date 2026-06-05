/**
 * Unified QR status phrasing on /created/ (hero, live card, connection details).
 */

/**
 * @param {string | null | undefined} status
 * @returns {string | null}
 */
export function formatCreatedQrStatusPhrase(status) {
  const t = status?.trim().toLowerCase();
  if (!t || t === "-" || t === "—" || t === "checking…") return null;
  if (t === "active" || t === "reachable") return "QR active";
  if (t === "revoked") return "QR revoked";
  if (t === "expired") return "QR expired";
  if (t === "replaced") return "QR replaced";
  if (t === "suspended") return "QR suspended";
  return `QR ${t}`;
}

/**
 * Chip / compact list sub-label (title may already say QR).
 * @param {string | null | undefined} status
 * @returns {string | null}
 */
export function formatCreatedQrStatusCompact(status) {
  const phrase = formatCreatedQrStatusPhrase(status);
  if (!phrase) return null;
  return phrase.replace(/^QR /, "");
}
