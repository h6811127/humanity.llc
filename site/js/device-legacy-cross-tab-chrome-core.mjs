/**
 * When shell inbox badge / unified custody panel are authoritative, hide legacy banners.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 7
 */

/**
 * @param {boolean} hasShellBadge
 * @param {boolean} hasUnifiedCustodyPanel
 * @param {boolean} [standalone]
 */
export function shouldShowLegacyHubCrossTabChrome(
  hasShellBadge,
  hasUnifiedCustodyPanel,
  standalone = false
) {
  if (standalone) return false;
  if (hasShellBadge) return false;
  if (hasUnifiedCustodyPanel) return false;
  return true;
}

/**
 * @param {boolean} hasShellBadge
 * @param {boolean} hasUnifiedCustodyPanel
 * @param {boolean} [standalone]
 */
export function shouldShowLegacyTabKeysHubNotice(
  hasShellBadge,
  hasUnifiedCustodyPanel,
  standalone = false
) {
  if (standalone) return false;
  if (hasShellBadge) return false;
  if (hasUnifiedCustodyPanel) return false;
  return true;
}
