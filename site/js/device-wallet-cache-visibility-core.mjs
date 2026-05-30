/**
 * Wallet in-memory memo vs disk reconciliation (RC-16).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-16
 */

/**
 * True when memoized hc_wallet bytes differ from localStorage (same-tab eviction / external edit).
 * @param {string | null | undefined} memoWalletRaw
 * @param {string | null | undefined} diskWalletRaw
 */
export function walletCacheMemoStaleOnDisk(memoWalletRaw, diskWalletRaw) {
  return (memoWalletRaw ?? null) !== (diskWalletRaw ?? null);
}

/**
 * @param {{
 *   memoWalletRaw?: string | null;
 *   memoSummaryRaw?: string | null;
 *   diskWalletRaw?: string | null;
 * }} input
 */
export function shouldInvalidateWalletCacheOnVisibility(input) {
  const { memoWalletRaw = null, memoSummaryRaw = null, diskWalletRaw = null } = input;
  return (
    walletCacheMemoStaleOnDisk(memoWalletRaw, diskWalletRaw) ||
    walletCacheMemoStaleOnDisk(memoSummaryRaw, diskWalletRaw)
  );
}
