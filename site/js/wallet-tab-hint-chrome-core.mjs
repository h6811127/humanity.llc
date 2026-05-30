/**
 * Whether /wallet/ legacy tab-hint strip should show cross-tab/orphan copy.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 7
 */

import { walletOwnershipNotInTab } from "./device-ownership-not-in-tab-core.mjs";

/**
 * Corrupt `hc_wallet` — show urgent tab hint before cross-tab / not-in-tab (P1-4 step 2).
 * @param {"empty" | "ok" | "corrupt"} walletLoadKind
 */
export function shouldShowWalletCorruptHint(walletLoadKind) {
  return walletLoadKind === "corrupt";
}

/**
 * @param {boolean} hasShellBadge
 * @param {number} orphanCount
 * @param {number} crossTabCount
 * @param {boolean} [standalone]
 */
export function shouldShowWalletTabHintCrossTabChrome(
  hasShellBadge,
  orphanCount,
  crossTabCount,
  standalone = false
) {
  if (standalone) return false;
  if (orphanCount <= 0 && crossTabCount <= 0) return false;
  if (hasShellBadge) return false;
  return true;
}

/**
 * Flow B — wallet has signing rows, this tab cannot sign (P1-2 step 2).
 * Shown even when shell badge is visible (unlike cross-tab hint).
 *
 * @param {number} walletSigningKeyCount
 * @param {boolean} hasTabSigningKeys
 * @param {number} orphanCount
 * @param {number} crossTabCount
 */
export function shouldShowWalletOwnershipNotInTabHint(
  walletSigningKeyCount,
  hasTabSigningKeys,
  orphanCount,
  crossTabCount
) {
  if (orphanCount > 0 || crossTabCount > 0) return false;
  return walletOwnershipNotInTab(walletSigningKeyCount, hasTabSigningKeys);
}
