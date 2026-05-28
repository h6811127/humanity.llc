/**
 * When shell inbox badge / unified custody panel are authoritative, hide legacy banners.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 7
 */

/**
 * @param {boolean} hasShellBadge
 * @param {boolean} hasUnifiedCustodyPanel
 */
export function shouldShowLegacyHubCrossTabChrome(hasShellBadge, hasUnifiedCustodyPanel) {
  if (hasShellBadge) return false;
  if (hasUnifiedCustodyPanel) return false;
  return true;
}

/**
 * @param {boolean} hasShellBadge
 * @param {boolean} hasUnifiedCustodyPanel
 */
export function shouldShowLegacyTabKeysHubNotice(hasShellBadge, hasUnifiedCustodyPanel) {
  if (hasShellBadge) return false;
  if (hasUnifiedCustodyPanel) return false;
  return true;
}
