/**
 * Cross-tab keys UI is hidden while this tab shows the unsaved-keys notice.
 * @param {number} otherTabCount
 * @param {number} tabNoticeCount
 */
export function shouldShowCrossTabKeysNotice(otherTabCount, tabNoticeCount) {
  return tabNoticeCount === 0 && otherTabCount > 0;
}
