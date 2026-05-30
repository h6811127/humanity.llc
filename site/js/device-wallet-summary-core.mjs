/**
 * Denormalized `hc_wallet_summary` — display-safe rows only (Safari P3-3).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P3-3
 */

export const WALLET_SUMMARY_VERSION = 3;

/** Substrings that must never appear in persisted summary JSON. */
export const WALLET_SUMMARY_FORBIDDEN_JSON_SUBSTRINGS = [
  "owner_private_key_b58",
  "recovery_private_key_b58",
];

/** Keys allowed on each summary row object. */
export const WALLET_SUMMARY_ROW_ALLOWED_KEYS = new Set([
  "id",
  "profile_id",
  "label",
  "handle",
  "qr_id",
  "scan_url",
  "qr_scope",
]);

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
 * @param {unknown} value
 * @returns {string | undefined}
 */
function optionalString(value) {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 * @param {(entry: { qr_id?: string | null; scan_url?: string | null } | null | undefined) => string | null} resolveQrId
 * @returns {WalletSummaryRow | null}
 */
export function walletSummaryRowFromEntry(entry, resolveQrId) {
  if (!entry || typeof entry !== "object") return null;
  const profileId = typeof entry.profile_id === "string" ? entry.profile_id : "";
  if (!profileId) return null;
  const row = {
    id: optionalString(entry.id),
    profile_id: profileId,
    label: optionalString(entry.label),
    handle: optionalString(entry.handle),
    qr_id: optionalString(resolveQrId(entry)),
    scan_url: optionalString(entry.scan_url),
    qr_scope: optionalString(entry.qr_scope),
  };
  assertWalletSummaryRowKeys(row);
  return row;
}

/**
 * @param {WalletSummaryRow} row
 */
export function assertWalletSummaryRowKeys(row) {
  for (const key of Object.keys(row)) {
    if (!WALLET_SUMMARY_ROW_ALLOWED_KEYS.has(key)) {
      throw new Error(`wallet summary row forbidden key: ${key}`);
    }
    if (WALLET_SUMMARY_FORBIDDEN_JSON_SUBSTRINGS.some((sub) => key.includes(sub))) {
      throw new Error(`wallet summary row forbidden key: ${key}`);
    }
  }
}

/**
 * @param {WalletSummaryRow[]} rows
 */
export function assertWalletSummaryRowsSafe(rows) {
  for (const row of rows) {
    assertWalletSummaryRowKeys(row);
  }
}

/**
 * @param {WalletSummary} summary
 * @returns {string}
 */
export function serializeWalletSummaryForStorage(summary) {
  assertWalletSummaryRowsSafe(summary.rows);
  const json = JSON.stringify(summary);
  for (const forbidden of WALLET_SUMMARY_FORBIDDEN_JSON_SUBSTRINGS) {
    if (json.includes(forbidden)) {
      throw new Error(`wallet summary must not contain ${forbidden}`);
    }
  }
  return json;
}

/** @param {Record<string, unknown> | null | undefined} entry */
function entryHasStewardVerification(entry) {
  const state = String(entry?.verification?.state || "").toLowerCase();
  const label = String(entry?.verification?.label || "").toLowerCase();
  return state === "steward" || label === "steward";
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} walletFingerprint
 * @param {(entry: { qr_id?: string | null; scan_url?: string | null } | null | undefined) => string | null} resolveQrId
 * @returns {WalletSummary}
 */
export function buildWalletSummary(entries, walletFingerprint, resolveQrId) {
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
    const row = walletSummaryRowFromEntry(entry, resolveQrId);
    if (row) {
      profileIds.push(row.profile_id);
      rows.push(row);
    }
    if (entry.owner_private_key_b58) {
      signingKeyCount += 1;
      if (entryHasStewardVerification(entry)) stewardReady = true;
    }
    if (typeof entry.profile_id === "string" && entry.profile_id && resolveQrId(entry)) {
      pollableCount += 1;
    }
  }

  const summary = {
    version: WALLET_SUMMARY_VERSION,
    walletFingerprint,
    count,
    profileIds,
    signingKeyCount,
    pollableCount,
    stewardReady,
    rows,
  };
  serializeWalletSummaryForStorage(summary);
  return summary;
}
