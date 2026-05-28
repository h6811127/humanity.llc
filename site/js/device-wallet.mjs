import { markScanOperatorFamiliar } from "./scan-operator-familiar.mjs";

/**
 * Device-local saved cards with signing keys (`hc_wallet`).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
import { verificationRecordFromLabelState } from "./device-wallet-network-core.mjs";
import { reconcileRemovedProfilesAfterWalletSave } from "./device-wallet-removed-profiles.mjs";

export const WALLET_STORAGE_KEY = "hc_wallet";
export const WALLET_INDEX_STORAGE_KEY = "hc_wallet_index";
const WALLET_INDEX_VERSION = 1;

/** @type {string | null} */
let walletCacheRaw = null;
/** @type {Array<Record<string, unknown>> | null} */
let walletCache = null;
/** @type {string | null} */
let walletIndexCacheSignature = null;
/** @type {WalletIndex | null} */
let walletIndexCache = null;

/**
 * @typedef {{
 *   version: number,
 *   raw_signature: string,
 *   count: number,
 *   profile_ids: string[],
 *   pollable_count: number,
 *   signing_count: number,
 *   steward_signing_count: number,
 * }} WalletIndexRecord
 *
 * @typedef {{
 *   count: number,
 *   profileIds: Set<string>,
 *   pollableCount: number,
 *   signingCount: number,
 *   stewardSigningCount: number,
 * }} WalletIndex
 */

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
 * QR id for status fetch / live-control poll - stored field or `scan_url?q=`.
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
 * @param {string | null} raw
 */
function walletRawSignature(raw) {
  if (!raw) return "0:0";
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${raw.length}:${(hash >>> 0).toString(36)}`;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizedProfileId(value) {
  return typeof value === "string" && value ? value : null;
}

/**
 * @param {{ verification?: { state?: string, label?: string } } | null | undefined} entry
 */
function hasStewardVerification(entry) {
  const state = String(entry?.verification?.state || "").toLowerCase();
  const label = String(entry?.verification?.label || "").toLowerCase();
  return state === "steward" || label === "steward";
}

/**
 * @param {WalletIndexRecord} record
 * @returns {WalletIndex}
 */
function normalizeWalletIndexRecord(record) {
  return {
    count: Number.isFinite(record.count) ? record.count : 0,
    profileIds: new Set(Array.isArray(record.profile_ids) ? record.profile_ids : []),
    pollableCount: Number.isFinite(record.pollable_count) ? record.pollable_count : 0,
    signingCount: Number.isFinite(record.signing_count) ? record.signing_count : 0,
    stewardSigningCount: Number.isFinite(record.steward_signing_count)
      ? record.steward_signing_count
      : 0,
  };
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string | null} raw
 * @returns {WalletIndexRecord}
 */
function buildWalletIndexRecord(entries, raw) {
  const profileIds = [];
  let pollableCount = 0;
  let signingCount = 0;
  let stewardSigningCount = 0;
  for (const entry of entries) {
    const profileId = normalizedProfileId(entry?.profile_id);
    if (profileId) profileIds.push(profileId);
    if (profileId && walletEntryQrId(entry)) pollableCount += 1;
    if (profileId && entry?.owner_private_key_b58) {
      signingCount += 1;
      if (hasStewardVerification(entry)) stewardSigningCount += 1;
    }
  }
  return {
    version: WALLET_INDEX_VERSION,
    raw_signature: walletRawSignature(raw),
    count: entries.length,
    profile_ids: profileIds,
    pollable_count: pollableCount,
    signing_count: signingCount,
    steward_signing_count: stewardSigningCount,
  };
}

/** @param {WalletIndexRecord} record */
function cacheWalletIndex(record) {
  walletIndexCacheSignature = record.raw_signature;
  walletIndexCache = normalizeWalletIndexRecord(record);
  return walletIndexCache;
}

/** @param {WalletIndexRecord} record */
function persistWalletIndexRecord(record) {
  cacheWalletIndex(record);
  try {
    localStorage.setItem(WALLET_INDEX_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string | null} raw
 * @returns {WalletIndex | null}
 */
function readWalletIndex(raw) {
  const signature = walletRawSignature(raw);
  if (walletIndexCacheSignature === signature && walletIndexCache) {
    return walletIndexCache;
  }
  try {
    const indexRaw = localStorage.getItem(WALLET_INDEX_STORAGE_KEY);
    const parsed = indexRaw ? JSON.parse(indexRaw) : null;
    if (
      !parsed ||
      parsed.version !== WALLET_INDEX_VERSION ||
      parsed.raw_signature !== signature
    ) {
      return null;
    }
    return cacheWalletIndex(/** @type {WalletIndexRecord} */ (parsed));
  } catch {
    return null;
  }
}

/**
 * @returns {{ entries: Array<Record<string, unknown>>, index: WalletIndex }}
 */
function readWalletView() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw === walletCacheRaw && walletCache) {
      let index = readWalletIndex(raw);
      if (!index) {
        const record = buildWalletIndexRecord(walletCache, raw);
        persistWalletIndexRecord(record);
        index = normalizeWalletIndexRecord(record);
      }
      return { entries: walletCache, index };
    }
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed) ? parsed : [];
    walletCacheRaw = raw;
    walletCache = entries;
    const record = buildWalletIndexRecord(entries, raw);
    persistWalletIndexRecord(record);
    return { entries, index: normalizeWalletIndexRecord(record) };
  } catch {
    walletCacheRaw = null;
    walletCache = [];
    const record = buildWalletIndexRecord([], null);
    cacheWalletIndex(record);
    return { entries: [], index: normalizeWalletIndexRecord(record) };
  }
}

/**
 * Compact wallet metadata for hot shell paths. Uses `hc_wallet_index` when present,
 * falling back to full wallet hydration once for old browsers / stale indexes.
 */
function walletIndex() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    return readWalletIndex(raw) ?? readWalletView().index;
  } catch {
    return readWalletView().index;
  }
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
  return readWalletView().entries.slice();
}

export function saveWallet(entries) {
  const serialized = JSON.stringify(entries);
  walletCacheRaw = serialized;
  walletCache = entries;
  localStorage.setItem(WALLET_STORAGE_KEY, serialized);
  persistWalletIndexRecord(buildWalletIndexRecord(entries, serialized));
  if (entries.length > 0) markScanOperatorFamiliar();
  reconcileRemovedProfilesAfterWalletSave(entries);
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
  const pid = normalizedProfileId(profileId);
  return Boolean(pid && walletIndex().profileIds.has(pid));
}

export function walletSavedCount() {
  return walletIndex().count;
}

export function walletPollableCount() {
  return walletIndex().pollableCount;
}

export function walletSigningCount() {
  return walletIndex().signingCount;
}

export function walletHasStewardSigningKey() {
  return walletIndex().stewardSigningCount > 0;
}

export function findWalletEntryByProfileId(profileId) {
  const pid = normalizedProfileId(profileId);
  if (!pid || !isWalletSaved(pid)) return null;
  return readWalletView().entries.find((e) => e.profile_id === pid) ?? null;
}

export function findWalletEntryById(id) {
  if (typeof id !== "string" || !id) return null;
  return readWalletView().entries.find((e) => e.id === id) ?? null;
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
    notifyWalletProfileSaved(session.profile_id);
    return { ok: true, updated: true };
  }
  entries.unshift(walletEntryFromSession(session, label));
  saveWallet(entries);
  notifyWalletProfileSaved(session.profile_id);
  return { ok: true };
}

function notifyWalletProfileSaved(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("hc-profile-saved-on-device", { detail: { profile_id: pid } })
  );
}
