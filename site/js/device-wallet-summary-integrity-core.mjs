/**
 * Wallet summary vs hc_wallet integrity (RC-15).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-15
 */

import { WALLET_SUMMARY_VERSION } from "./device-wallet-summary-core.mjs";

/**
 * @param {string | null} raw
 */
export function walletStorageFingerprint(raw) {
  if (!raw) return "0:0";
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619) >>> 0;
  }
  return `${raw.length}:${hash.toString(36)}`;
}

/**
 * @param {string | null | undefined} walletRaw
 */
export function walletHasStoredEntries(walletRaw) {
  return typeof walletRaw === "string" && walletRaw.length > 2 && walletRaw !== "[]";
}

/**
 * @param {unknown} value
 */
function isWalletSummaryShape(value) {
  return (
    value != null &&
    typeof value === "object" &&
    value.version === WALLET_SUMMARY_VERSION &&
    typeof value.walletFingerprint === "string" &&
    Number.isInteger(value.count) &&
    Array.isArray(value.rows)
  );
}

/**
 * True when persisted summary must be rebuilt from hc_wallet.
 * @param {{
 *   walletRaw?: string | null,
 *   storedSummary?: unknown,
 * }} input
 */
export function walletSummaryIntegrityNeedsRepair(input) {
  const { walletRaw = null, storedSummary = null } = input;
  const fingerprint = walletStorageFingerprint(walletRaw);
  const walletHasEntries = walletHasStoredEntries(walletRaw);

  if (!storedSummary || !isWalletSummaryShape(storedSummary)) {
    return walletHasEntries;
  }
  if (storedSummary.walletFingerprint !== fingerprint) {
    return true;
  }
  if (walletHasEntries && storedSummary.count === 0) {
    return true;
  }
  if (!walletHasEntries && storedSummary.count > 0) {
    return true;
  }
  return false;
}
