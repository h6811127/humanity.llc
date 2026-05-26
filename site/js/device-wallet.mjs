/**
 * Device-local saved cards with signing keys (`hc_wallet`).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
import { verificationRecordFromLabelState } from "./device-wallet-network-core.mjs";

export const WALLET_STORAGE_KEY = "hc_wallet";

/** Matches resolver / pin parsing (`device-pins.mjs`). */
const QR_ID_RE = /^qr_[1-9A-HJ-NP-Za-km-z_]{8,64}$/;

/**
 * @param {string | null | undefined} scanUrl
 * @returns {string | null}
 */
export function qrIdFromScanUrl(scanUrl) {
  if (!scanUrl || typeof scanUrl !== "string") return null;
  try {
    const q = new URL(scanUrl).searchParams.get("q");
    if (q && QR_ID_RE.test(q)) return q;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * QR id for status fetch / live-control poll — stored field or `scan_url?q=`.
 * @param {{ qr_id?: string | null, scan_url?: string | null } | null | undefined} entry
 * @returns {string | null}
 */
export function walletEntryQrId(entry) {
  if (!entry) return null;
  const direct = typeof entry.qr_id === "string" ? entry.qr_id.trim() : "";
  if (direct && QR_ID_RE.test(direct)) return direct;
  return qrIdFromScanUrl(entry.scan_url);
}

/**
 * Backfill `qr_id` from `scan_url` when missing (DH-10).
 * @param {Array<Record<string, unknown>>} entries
 * @returns {{ entries: Array<Record<string, unknown>>, changed: boolean }}
 */
export function normalizeWalletQrIds(entries) {
  let changed = false;
  const next = entries.map((e) => {
    const resolved = walletEntryQrId(e);
    if (resolved && e.qr_id !== resolved) {
      changed = true;
      return { ...e, qr_id: resolved };
    }
    return e;
  });
  return { entries: next, changed };
}

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
    pilot_template: session.pilot_template,
    scan_url: session.scan_url,
    owner_public_key_b58: session.owner_public_key_b58,
    owner_private_key_b58: session.owner_private_key_b58,
    recovery_public_key_b58: session.recovery_public_key_b58,
    recovery_private_key_b58: session.recovery_private_key_b58,
    qr_expires_at: session.qr_expires_at,
    status: session.status,
    verification:
      verificationRecordFromLabelState(
        session.verification?.label,
        session.verification?.state
      ) ?? session.verification,
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

/** @param {string} iso */
export function formatSavedAt(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d
      .toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      .replace(/\s+at\s+/i, ", ");
  } catch {
    return "";
  }
}

/** @param {{ owner_public_key_b58?: string, profile_id?: string }} entry */
export function walletEntryKeyPreview(entry) {
  const raw = entry.owner_public_key_b58 || entry.profile_id;
  if (!raw) return "";
  return raw.length > 9 ? `${raw.slice(0, 8)}…` : raw;
}

export function defaultWalletLabel(session) {
  return session?.handle ? `@${session.handle}` : session?.profile_id?.slice(0, 12) || "Saved card";
}

/**
 * @param {Record<string, unknown>} entry
 */
function walletEntrySyncSignature(entry) {
  return JSON.stringify({
    verification: entry.verification ?? null,
    owner_private_key_b58: entry.owner_private_key_b58 ?? null,
    owner_public_key_b58: entry.owner_public_key_b58 ?? null,
    status: entry.status ?? null,
    qr_id: walletEntryQrId(entry),
    scan_url: entry.scan_url ?? null,
    handle: entry.handle ?? null,
  });
}

/**
 * Refresh an existing wallet row from the active tab session (keys, verification, scan metadata).
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 */
export function mergeWalletEntryFromSession(existing, session, label = "") {
  const trimmed = label.trim();
  const qrId = session.qr_id ?? walletEntryQrId(session) ?? existing.qr_id;
  return {
    ...existing,
    label: trimmed || existing.label,
    handle: session.handle ?? existing.handle,
    manifesto_line: session.manifesto_line ?? existing.manifesto_line,
    pilot_template: session.pilot_template ?? existing.pilot_template,
    scan_url: session.scan_url ?? existing.scan_url,
    qr_id: qrId,
    owner_public_key_b58: session.owner_public_key_b58 ?? existing.owner_public_key_b58,
    owner_private_key_b58: session.owner_private_key_b58 ?? existing.owner_private_key_b58,
    recovery_public_key_b58:
      session.recovery_public_key_b58 ?? existing.recovery_public_key_b58,
    recovery_private_key_b58:
      session.recovery_private_key_b58 ?? existing.recovery_private_key_b58,
    qr_expires_at: session.qr_expires_at ?? existing.qr_expires_at,
    status: session.status ?? existing.status,
    verification:
      verificationRecordFromLabelState(
        session.verification?.label ?? existing.verification?.label,
        session.verification?.state ?? existing.verification?.state
      ) ??
      session.verification ??
      existing.verification,
    issued_vouches: session.issued_vouches ?? existing.issued_vouches,
    saved_at: new Date().toISOString(),
  };
}

/**
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 * @returns {{ ok: true, already?: boolean, updated?: boolean } | { error: string }}
 */
export function saveSessionToWallet(session, label = "") {
  if (!session?.profile_id || !session?.owner_private_key_b58) {
    return { error: "No signing keys in this tab." };
  }
  const entries = loadWallet();
  const idx = entries.findIndex((e) => e.profile_id === session.profile_id);
  if (idx >= 0) {
    const before = walletEntrySyncSignature(entries[idx]);
    const merged = mergeWalletEntryFromSession(entries[idx], session, label);
    if (walletEntrySyncSignature(merged) === before) {
      return { ok: true, already: true };
    }
    entries[idx] = merged;
    saveWallet(entries);
    return { ok: true, updated: true };
  }
  entries.unshift(walletEntryFromSession(session, label));
  saveWallet(entries);
  return { ok: true };
}
