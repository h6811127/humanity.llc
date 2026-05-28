import { markScanOperatorFamiliar } from "./scan-operator-familiar.mjs";

/**
 * Device-local saved cards with signing keys (`hc_wallet`).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
import { verificationRecordFromLabelState } from "./device-wallet-network-core.mjs";
import { reconcileRemovedProfilesAfterWalletSave } from "./device-wallet-removed-profiles.mjs";

export const WALLET_STORAGE_KEY = "hc_wallet";

/** @type {string | null} */
let walletCacheRaw = null;
/** @type {Array<Record<string, unknown>> | null} */
let walletCache = null;
/** @type {{ count: number, pollableCount: number, signingKeyCount: number, summaries: Array<Record<string, unknown>> } | null} */
let walletMetaCache = null;

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

/** @param {Array<Record<string, unknown>>} entries */
function buildWalletMeta(entries) {
  let pollableCount = 0;
  let signingKeyCount = 0;
  const summaries = [];
  for (const entry of entries) {
    if (typeof entry?.profile_id === "string" && walletEntryQrId(entry)) {
      pollableCount += 1;
    }
    if (entry?.owner_private_key_b58) {
      signingKeyCount += 1;
    }
    summaries.push({
      id: entry?.id,
      profile_id: entry?.profile_id,
      label: entry?.label,
      handle: entry?.handle,
    });
  }
  return {
    count: entries.length,
    pollableCount,
    signingKeyCount,
    summaries,
  };
}

function clearWalletCache() {
  walletCacheRaw = null;
  walletCache = [];
  walletMetaCache = buildWalletMeta([]);
}

/** @returns {Array<Record<string, unknown>>} */
function readWalletEntries() {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw === walletCacheRaw && walletCache) {
      return walletCache;
    }
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed) ? parsed : [];
    walletCacheRaw = raw;
    walletCache = entries;
    walletMetaCache = buildWalletMeta(entries);
    return entries;
  } catch {
    clearWalletCache();
    return [];
  }
}

function readWalletMeta() {
  readWalletEntries();
  return walletMetaCache ?? buildWalletMeta([]);
}

export function loadWallet() {
  return readWalletEntries().slice();
}

export function saveWallet(entries) {
  const serialized = JSON.stringify(entries);
  walletCacheRaw = serialized;
  walletCache = entries;
  walletMetaCache = buildWalletMeta(entries);
  localStorage.setItem(WALLET_STORAGE_KEY, serialized);
  if (entries.length > 0) markScanOperatorFamiliar();
  reconcileRemovedProfilesAfterWalletSave(entries);
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

export function getWalletCount() {
  return readWalletMeta().count;
}

export function getWalletPollableCount() {
  return readWalletMeta().pollableCount;
}

export function getWalletSigningKeyCount() {
  return readWalletMeta().signingKeyCount;
}

/**
 * Metadata-only view for chrome hot paths. Does not expose private keys.
 * @param {number} [limit]
 */
export function getWalletEntrySummaries(limit = Infinity) {
  const summaries = readWalletMeta().summaries;
  const capped =
    Number.isFinite(limit) && limit >= 0 ? summaries.slice(0, limit) : summaries.slice();
  return capped.map((entry) => ({ ...entry }));
}

/** @param {Iterable<string>} profileIds */
export function getWalletEntrySummariesByProfileIds(profileIds) {
  const wanted = new Set([...profileIds].filter(Boolean).map(String));
  if (wanted.size === 0) return [];
  return readWalletMeta()
    .summaries.filter((entry) => wanted.has(String(entry.profile_id || "")))
    .map((entry) => ({ ...entry }));
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
  return walletSome((e) => e.profile_id === profileId);
}

/** Drop memo when `hc_wallet` changes in another tab (tests may call directly). */
export function invalidateWalletCache() {
  clearWalletCache();
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (event) => {
    if (event.key === WALLET_STORAGE_KEY) invalidateWalletCache();
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
