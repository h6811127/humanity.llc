import { markScanOperatorFamiliar } from "./scan-operator-familiar.mjs";

/**
 * Device-local saved cards with signing keys (`hc_wallet`).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
import { verificationRecordFromLabelState } from "./device-wallet-network-core.mjs";
import { reconcileRemovedProfilesAfterWalletSave } from "./device-wallet-removed-profiles.mjs";
import { setLastActiveProfileId } from "./device-quiet-tab-rehydrate-prefs.mjs";
import { scheduleStoragePersistRequest } from "./device-storage-persist.mjs";
import {
  verifyWalletStorageWrite,
  WALLET_SAVE_VERIFY_FAILED,
  walletSaveErrorMessage,
} from "./device-wallet-save-core.mjs";
import { mergeOwnershipSeatbeltFields } from "./created-first-session-gate-core.mjs";
import { classifyWalletStorageRaw } from "./device-wallet-parse-core.mjs";
import {
  WALLET_SUMMARY_VERSION,
  buildWalletSummary,
  serializeWalletSummaryForStorage,
} from "./device-wallet-summary-core.mjs";

export const WALLET_STORAGE_KEY = "hc_wallet";
export const WALLET_SUMMARY_STORAGE_KEY = "hc_wallet_summary";
export { WALLET_SUMMARY_VERSION };

/** @type {string | null} */
let walletCacheRaw = null;
/** @type {Array<Record<string, unknown>> | null} */
let walletCache = null;
/** @type {string | null} */
let walletSummaryCacheRaw = null;
/** @type {WalletSummary | null} */
let walletSummaryCache = null;

/** @type {"empty" | "ok" | "corrupt"} */
let walletLoadKind = "empty";

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

/**
 * @typedef {{
 *   version: number,
 *   walletFingerprint: string,
 *   count: number,
 *   profileIds: string[],
 *   signingKeyCount: number,
 *   pollableCount: number,
 *   stewardReady: boolean,
 *   rows: WalletSummaryRow[],
 * }} WalletSummary
 *
 * @typedef {{
 *   id?: string,
 *   profile_id: string,
 *   label?: string,
 *   handle?: string,
 *   qr_id?: string,
 *   scan_url?: string,
 *   qr_scope?: string,
 * }} WalletSummaryRow
 */

/**
 * Fast integrity check for the lightweight wallet summary. This scans the raw
 * string but avoids allocating/parsing key-bearing wallet rows on shell refresh.
 * @param {string | null} raw
 */
function walletRawFingerprint(raw) {
  if (!raw) return "0:0";
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619) >>> 0;
  }
  return `${raw.length}:${hash.toString(36)}`;
}

/**
 * @param {unknown} value
 * @returns {value is WalletSummary}
 */
function isWalletSummary(value) {
  return (
    value != null &&
    typeof value === "object" &&
    value.version === WALLET_SUMMARY_VERSION &&
    typeof value.walletFingerprint === "string" &&
    Number.isInteger(value.count) &&
    Array.isArray(value.profileIds) &&
    Number.isInteger(value.signingKeyCount) &&
    Number.isInteger(value.pollableCount) &&
    typeof value.stewardReady === "boolean" &&
    Array.isArray(value.rows)
  );
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string | null} raw
 */
function cacheWalletSummary(entries, raw) {
  walletSummaryCacheRaw = raw;
  walletSummaryCache = buildWalletSummary(entries, walletRawFingerprint(raw), walletEntryQrId);
  return walletSummaryCache;
}

/** @param {WalletSummary} summary */
function cloneWalletSummary(summary) {
  return {
    ...summary,
    profileIds: summary.profileIds.slice(),
    rows: summary.rows.map((row) => ({ ...row })),
  };
}

/** @returns {"empty" | "ok" | "corrupt"} */
export function getWalletLoadKind() {
  return walletLoadKind;
}

export function isWalletStorageCorrupt() {
  return walletLoadKind === "corrupt";
}

/**
 * @param {ReturnType<typeof classifyWalletStorageRaw>} classified
 * @param {string | null} raw
 */
function materializeWalletLoad(classified, raw) {
  walletLoadKind = classified.kind;
  if (classified.kind === "corrupt") {
    walletCacheRaw = raw;
    walletCache = [];
    walletSummaryCacheRaw = raw;
    walletSummaryCache = buildWalletSummary([], walletRawFingerprint(raw), walletEntryQrId);
    return [];
  }
  const entries = classified.kind === "empty" ? [] : classified.entries;
  walletCacheRaw = raw;
  walletCache = entries;
  cacheWalletSummary(entries, raw);
  return entries.slice();
}

export function loadWallet() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw === walletCacheRaw && walletCache !== null) {
      return walletLoadKind === "corrupt" ? [] : walletCache.slice();
    }
    return materializeWalletLoad(classifyWalletStorageRaw(raw), raw);
  } catch {
    walletLoadKind = "corrupt";
    walletCacheRaw = null;
    walletCache = [];
    walletSummaryCacheRaw = null;
    walletSummaryCache = buildWalletSummary([], "0:0", walletEntryQrId);
    return [];
  }
}

export function loadWalletSummary() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw === walletSummaryCacheRaw && walletSummaryCache) {
      return cloneWalletSummary(walletSummaryCache);
    }

    const fingerprint = walletRawFingerprint(raw);
    const stored = localStorage.getItem(WALLET_SUMMARY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isWalletSummary(parsed) && parsed.walletFingerprint === fingerprint) {
          walletSummaryCacheRaw = raw;
          walletSummaryCache = parsed;
          return cloneWalletSummary(parsed);
        }
      } catch {
        /* stale/corrupt summary; rebuild from wallet below */
      }
    }

    const entries = loadWallet();
    const summary = cacheWalletSummary(entries, raw);
    try {
      localStorage.setItem(
        WALLET_SUMMARY_STORAGE_KEY,
        serializeWalletSummaryForStorage(summary)
      );
    } catch {
      /* private mode */
    }
    return cloneWalletSummary(summary);
  } catch {
    walletSummaryCacheRaw = null;
    walletSummaryCache = buildWalletSummary([], "0:0", walletEntryQrId);
    return cloneWalletSummary(walletSummaryCache);
  }
}

export function saveWallet(entries) {
  if (isWalletStorageCorrupt()) {
    return {
      error:
        "Saved ownership on this device could not be read. Import a backup before saving again.",
    };
  }
  const serialized = JSON.stringify(entries);
  const summary = buildWalletSummary(
    entries,
    walletRawFingerprint(serialized),
    walletEntryQrId
  );
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, serialized);
  } catch (err) {
    return { error: walletSaveErrorMessage(err) };
  }
  if (!verifyWalletStorageWrite(localStorage, WALLET_STORAGE_KEY, serialized)) {
    return { error: WALLET_SAVE_VERIFY_FAILED };
  }
  try {
    localStorage.setItem(WALLET_SUMMARY_STORAGE_KEY, serializeWalletSummaryForStorage(summary));
  } catch {
    /* private mode — wallet row still persisted */
  }
  walletLoadKind = entries.length > 0 ? "ok" : "empty";
  walletCacheRaw = serialized;
  walletCache = entries;
  walletSummaryCacheRaw = serialized;
  walletSummaryCache = summary;
  if (entries.length > 0) markScanOperatorFamiliar();
  reconcileRemovedProfilesAfterWalletSave(entries);
  window.dispatchEvent(new Event("hc-device-hub-changed"));
  return { ok: true };
}

/** @returns {Array<Record<string, unknown>>} */
function readWalletEntries() {
  if (walletCache) return walletCache;
  loadWallet();
  return walletCache ?? [];
}

export function getWalletCount() {
  return loadWalletSummary().count;
}

export function getWalletPollableCount() {
  return loadWalletSummary().pollableCount;
}

export function getWalletSigningKeyCount() {
  return loadWalletSummary().signingKeyCount;
}

/** @param {WalletSummaryRow} row */
function metadataSummaryRow(row) {
  return {
    id: row.id,
    profile_id: row.profile_id,
    label: row.label,
    handle: row.handle,
  };
}

/**
 * Metadata-only view for chrome hot paths. Does not expose private keys.
 * @param {number} [limit]
 */
export function getWalletEntrySummaries(limit = Infinity) {
  const rows = loadWalletSummary().rows;
  const capped = Number.isFinite(limit) && limit >= 0 ? rows.slice(0, limit) : rows.slice();
  return capped.map((entry) => metadataSummaryRow(entry));
}

/** @param {Iterable<string>} profileIds */
export function getWalletEntrySummariesByProfileIds(profileIds) {
  const wanted = new Set([...profileIds].filter(Boolean).map(String));
  if (wanted.size === 0) return [];
  return loadWalletSummary()
    .rows.filter((entry) => wanted.has(String(entry.profile_id || "")))
    .map((entry) => metadataSummaryRow(entry));
}

/** @param {string | null | undefined} id */
export function findWalletEntryById(id) {
  if (!id) return null;
  return readWalletEntries().find((entry) => entry.id === id) ?? null;
}

/** @param {string | null | undefined} profileId */
export function findWalletEntryByProfileId(profileId) {
  if (!profileId) return null;
  return readWalletEntries().find((entry) => entry.profile_id === profileId) ?? null;
}

export function getPollableWalletEntries() {
  return readWalletEntries().filter(
    (entry) => typeof entry?.profile_id === "string" && !!walletEntryQrId(entry)
  );
}

/** Iterate cached wallet rows without copying the array. */
export function forEachWalletEntry(fn) {
  for (const entry of readWalletEntries()) {
    fn(entry);
  }
}

/**
 * Public wallet row for poll/network paths — no private key material.
 * @param {Record<string, unknown>} entry
 */
export function walletEntryPublicView(entry) {
  return {
    id: entry.id,
    profile_id: entry.profile_id,
    label: entry.label,
    handle: entry.handle,
    manifesto_line: entry.manifesto_line,
    pilot_template: entry.pilot_template,
    scan_url: entry.scan_url ?? null,
    qr_id: walletEntryQrId(entry),
    qr_scope: entry.qr_scope ?? null,
    status: entry.status ?? null,
    scan_kind: entry.scan_kind ?? null,
    saved_at: entry.saved_at,
    has_signing_key: !!entry.owner_private_key_b58,
  };
}

/** Pollable rows without copying private keys. */
export function listPollableWalletEntries() {
  /** @type {ReturnType<typeof walletEntryPublicView>[]} */
  const out = [];
  forEachWalletEntry((entry) => {
    if (typeof entry.profile_id === "string" && walletEntryQrId(entry)) {
      out.push(walletEntryPublicView(entry));
    }
  });
  return out;
}

/**
 * Display rows for hub glance — no private key material.
 * @param {number} [limit]
 */
export function listWalletDisplayEntries(limit = Infinity) {
  /** @type {ReturnType<typeof walletEntryPublicView>[]} */
  const out = [];
  forEachWalletEntry((entry) => {
    out.push(walletEntryPublicView(entry));
  });
  return Number.isFinite(limit) && limit >= 0 ? out.slice(0, limit) : out;
}

/** @param {(entry: Record<string, unknown>) => boolean} predicate */
export function walletSomeSigningKey(predicate) {
  for (const entry of readWalletEntries()) {
    if (entry.owner_private_key_b58 && predicate(entry)) return true;
  }
  return false;
}

/** @param {(entry: Record<string, unknown>) => boolean} predicate */
export function walletSome(predicate) {
  return readWalletEntries().some(predicate);
}

export function walletEntryFromSession(session, label) {
  const entry = {
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
  return mergeOwnershipSeatbeltFields(entry, session);
}

export function isWalletSaved(profileId) {
  if (!profileId) return false;
  return loadWalletSummary().profileIds.includes(profileId);
}

/** Drop memo when `hc_wallet` changes in another tab (tests may call directly). */
export function invalidateWalletCache() {
  resetWalletCachesForTests();
}

export function resetWalletCachesForTests() {
  walletCacheRaw = null;
  walletCache = null;
  walletSummaryCacheRaw = null;
  walletSummaryCache = null;
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (event) => {
    if (event.key === WALLET_STORAGE_KEY || event.key === WALLET_SUMMARY_STORAGE_KEY) {
      invalidateWalletCache();
    }
  });
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
  const merged = {
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
  return mergeOwnershipSeatbeltFields(merged, session);
}

/**
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 * @returns {{ ok: true, already?: boolean, updated?: boolean } | { error: string }}
 */
export function saveSessionToWallet(session, label = "") {
  if (!session?.profile_id || !session?.owner_private_key_b58) {
    return { error: "Ownership not loaded in this tab." };
  }
  const entries = loadWallet();
  const idx = entries.findIndex((e) => e.profile_id === session.profile_id);
  if (idx >= 0) {
    const before = walletEntrySyncSignature(entries[idx]);
    const merged = mergeWalletEntryFromSession(entries[idx], session, label);
    if (walletEntrySyncSignature(merged) === before) {
      scheduleStoragePersistRequest({ reason: "ownership_save" });
      return { ok: true, already: true };
    }
    entries[idx] = merged;
    const saved = saveWallet(entries);
    if ("error" in saved) return saved;
    setLastActiveProfileId(session.profile_id);
    notifyWalletProfileSaved(session.profile_id);
    scheduleStoragePersistRequest({ reason: "ownership_save" });
    return { ok: true, updated: true };
  }
  entries.unshift(walletEntryFromSession(session, label));
  const saved = saveWallet(entries);
  if ("error" in saved) return saved;
  setLastActiveProfileId(session.profile_id);
  notifyWalletProfileSaved(session.profile_id);
  scheduleStoragePersistRequest({ reason: "ownership_save" });
  return { ok: true };
}

function notifyWalletProfileSaved(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("hc-profile-saved-on-device", { detail: { profile_id: pid } })
  );
}
