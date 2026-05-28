import { markScanOperatorFamiliar } from "./scan-operator-familiar.mjs";

/**
 * Device-local saved cards with signing keys (`hc_wallet`).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
import { verificationRecordFromLabelState } from "./device-wallet-network-core.mjs";
import { reconcileRemovedProfilesAfterWalletSave } from "./device-wallet-removed-profiles.mjs";

export const WALLET_STORAGE_KEY = "hc_wallet";
export const WALLET_SUMMARY_STORAGE_KEY = "hc_wallet_summary";
const WALLET_SUMMARY_VERSION = 3;

/** @type {string | null} */
let walletCacheRaw = null;
/** @type {Array<Record<string, unknown>> | null} */
let walletCache = null;
/** @type {string | null} */
let walletSummaryCacheRaw = null;
/** @type {WalletSummary | null} */
let walletSummaryCache = null;

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
 *   hasSigningKeys?: boolean,
 *   manifesto_line?: string,
 *   pilot_template?: string,
 *   saved_at?: string,
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

/** @param {Record<string, unknown> | null | undefined} entry */
function entryHasStewardVerification(entry) {
  const state = String(entry?.verification?.state || "").toLowerCase();
  const label = String(entry?.verification?.label || "").toLowerCase();
  return state === "steward" || label === "steward";
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
 * @param {unknown} value
 * @returns {string | undefined}
 */
function optionalString(value) {
  return typeof value === "string" && value ? value : undefined;
}

/** @param {unknown} value @param {number} maxLen */
function optionalTruncatedString(value, maxLen = 120) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} walletFingerprint
 * @returns {WalletSummary}
 */
function buildWalletSummary(entries, walletFingerprint) {
  const profileIds = [];
  /** @type {WalletSummaryRow[]} */
  const rows = [];
  let count = 0;
  let signingKeyCount = 0;
  let pollableCount = 0;
  let stewardReady = false;

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    count += 1;
    if (typeof entry.profile_id === "string" && entry.profile_id) {
      profileIds.push(entry.profile_id);
      rows.push({
        id: optionalString(entry.id),
        profile_id: entry.profile_id,
        label: optionalString(entry.label),
        handle: optionalString(entry.handle),
        qr_id: optionalString(walletEntryQrId(entry)),
        scan_url: optionalString(entry.scan_url),
        hasSigningKeys: Boolean(entry.owner_private_key_b58),
        manifesto_line: optionalTruncatedString(entry.manifesto_line),
        pilot_template: optionalString(entry.pilot_template),
        saved_at: optionalString(entry.saved_at),
      });
    }
    if (entry.owner_private_key_b58) {
      signingKeyCount += 1;
      if (entryHasStewardVerification(entry)) stewardReady = true;
    }
    if (typeof entry.profile_id === "string" && entry.profile_id && walletEntryQrId(entry)) {
      pollableCount += 1;
    }
  }

  return {
    version: WALLET_SUMMARY_VERSION,
    walletFingerprint,
    count,
    profileIds,
    signingKeyCount,
    pollableCount,
    stewardReady,
    rows,
  };
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string | null} raw
 */
function cacheWalletSummary(entries, raw) {
  walletSummaryCacheRaw = raw;
  walletSummaryCache = buildWalletSummary(entries, walletRawFingerprint(raw));
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

export function loadWallet() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw === walletCacheRaw && walletCache) {
      return walletCache.slice();
    }
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed) ? parsed : [];
    walletCacheRaw = raw;
    walletCache = entries;
    cacheWalletSummary(entries, raw);
    return entries.slice();
  } catch {
    walletCacheRaw = null;
    walletCache = [];
    walletSummaryCacheRaw = null;
    walletSummaryCache = buildWalletSummary([], "0:0");
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
      localStorage.setItem(WALLET_SUMMARY_STORAGE_KEY, JSON.stringify(summary));
    } catch {
      /* private mode */
    }
    return cloneWalletSummary(summary);
  } catch {
    walletSummaryCacheRaw = null;
    walletSummaryCache = buildWalletSummary([], "0:0");
    return cloneWalletSummary(walletSummaryCache);
  }
}

export function saveWallet(entries) {
  const serialized = JSON.stringify(entries);
  walletCacheRaw = serialized;
  walletCache = entries;
  const summary = cacheWalletSummary(entries, serialized);
  localStorage.setItem(WALLET_STORAGE_KEY, serialized);
  try {
    localStorage.setItem(WALLET_SUMMARY_STORAGE_KEY, JSON.stringify(summary));
  } catch {
    /* private mode */
  }
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
  if (!profileId) return false;
  return loadWalletSummary().profileIds.includes(profileId);
}

/**
 * Hydrate a full wallet row by id (actions / signing only — not hub list render).
 * @param {string | null | undefined} id
 */
export function findWalletEntryById(id) {
  if (!id) return null;
  return loadWallet().find((entry) => entry.id === id) ?? null;
}

/**
 * @param {string | null | undefined} profileId
 */
export function findWalletEntryByProfileId(profileId) {
  if (!profileId) return null;
  return loadWallet().find((entry) => entry.profile_id === profileId) ?? null;
}

export function resetWalletCachesForTests() {
  walletCacheRaw = null;
  walletCache = null;
  walletSummaryCacheRaw = null;
  walletSummaryCache = null;
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
