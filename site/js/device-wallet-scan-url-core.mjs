/**
 * Wallet scan URL repair — official /c/{profile}?q=qr_… links (recovery import bug class).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md S2
 */

import { buildOfficialScanUrl } from "./qr-scan-url-lock.mjs";

const QR_ID_RE = /^qr_[1-9A-HJ-NP-Za-km-z_]{8,64}$/;

/**
 * @param {string | null | undefined} scanUrl
 */
export function scanUrlHasOfficialQrParam(scanUrl) {
  if (!scanUrl || typeof scanUrl !== "string") return false;
  try {
    const q = new URL(scanUrl).searchParams.get("q")?.trim();
    return Boolean(q && QR_ID_RE.test(q));
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} scanUrl
 * @returns {string | null}
 */
export function parseQrIdFromScanUrl(scanUrl) {
  if (!scanUrl || typeof scanUrl !== "string") return null;
  try {
    const q = new URL(scanUrl).searchParams.get("q")?.trim();
    return q && QR_ID_RE.test(q) ? q : null;
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function parseQrIdFromCardRef(raw) {
  return parseQrIdFromScanUrl(String(raw ?? "").trim());
}

/**
 * Resolve a hub-safe scan URL; repairs stored scan_url missing ?q= when qr_id is known.
 *
 * @param {{
 *   profile_id: string,
 *   scan_url?: string | null,
 *   qr_id?: string | null,
 * }} entry
 * @param {string} origin
 * @param {string | null | undefined} resolvedQrId
 */
export function resolveWalletEntryScanUrl(entry, origin, resolvedQrId) {
  const profileId = entry?.profile_id;
  if (!profileId) return "";

  if (entry.scan_url && scanUrlHasOfficialQrParam(entry.scan_url)) {
    return entry.scan_url;
  }

  const qrId =
    resolvedQrId ??
    (typeof entry.qr_id === "string" ? entry.qr_id : null) ??
    parseQrIdFromScanUrl(entry.scan_url);

  if (qrId && QR_ID_RE.test(qrId)) {
    return buildOfficialScanUrl(profileId, qrId, origin);
  }

  if (entry.scan_url) return entry.scan_url;
  return `${String(origin).replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}`;
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} origin
 * @param {(entry: Record<string, unknown>) => string | null} resolveQrId
 */
export function normalizeWalletScanUrls(entries, origin, resolveQrId) {
  let changed = false;
  const next = entries.map((entry) => {
    const qrId = resolveQrId(entry);
    const scanUrl = resolveWalletEntryScanUrl(entry, origin, qrId);
    let patched = entry;
    if (qrId && entry.qr_id !== qrId) {
      patched = { ...patched, qr_id: qrId };
      changed = true;
    }
    if (scanUrl !== entry.scan_url) {
      patched = { ...patched, scan_url: scanUrl };
      changed = true;
    }
    return patched;
  });
  return { entries: next, changed };
}

/**
 * Replace recovery-import placeholder labels (profile id prefix) with handle/manifesto.
 *
 * @param {Record<string, unknown>} entry
 */
export function repairRecoveryImportLabel(entry) {
  const profileId = typeof entry.profile_id === "string" ? entry.profile_id : "";
  const label = String(entry.label ?? "").trim();
  const looksLikeProfileSlice =
    profileId &&
    (label === profileId.slice(0, 12) || label === profileId.slice(0, 8) || label === profileId);
  if (label && !looksLikeProfileSlice) return entry;

  const handle = entry.handle ? String(entry.handle).replace(/^@/, "").trim() : "";
  if (handle) return { ...entry, label: `@${handle}` };

  const manifesto = String(entry.manifesto_line ?? "").trim();
  if (manifesto) return { ...entry, label: manifesto.slice(0, 48) };

  if (label) return entry;
  return { ...entry, label: "Saved card" };
}

/**
 * @param {Array<Record<string, unknown>>} entries
 */
export function normalizeWalletRecoveryImportLabels(entries) {
  let changed = false;
  const next = entries.map((entry) => {
    const repaired = repairRecoveryImportLabel(entry);
    if (repaired !== entry) changed = true;
    return repaired;
  });
  return { entries: next, changed };
}
