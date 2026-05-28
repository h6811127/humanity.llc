/**
 * Whether /wallet/ legacy tab-hint strip should show cross-tab/orphan copy.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 7
 */

/**
 * @param {boolean} hasShellBadge
 * @param {number} orphanCount
 * @param {number} crossTabCount
 */
export function shouldShowWalletTabHintCrossTabChrome(
  hasShellBadge,
  orphanCount,
  crossTabCount
) {
  if (orphanCount <= 0 && crossTabCount <= 0) return false;
  if (hasShellBadge) return false;
  return true;
}
