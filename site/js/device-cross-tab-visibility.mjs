/**
 * Cross-tab keys UI is hidden while this tab shows the unsaved-keys notice.
 * @param {number} otherTabCount
 * @param {number} tabNoticeCount
 */
export function shouldShowCrossTabKeysNotice(otherTabCount, tabNoticeCount) {
  return tabNoticeCount === 0 && otherTabCount > 0;
}

/**
 * Orphan keys (removed from device, still in another tab) use the same visibility gate as cross-tab.
 * @param {number} orphanTabCount
 * @param {number} tabNoticeCount
 */
export function shouldShowOrphanRemovedKeysNotice(orphanTabCount, tabNoticeCount) {
  return shouldShowCrossTabKeysNotice(orphanTabCount, tabNoticeCount);
}
