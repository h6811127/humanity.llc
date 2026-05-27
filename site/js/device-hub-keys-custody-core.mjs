/**
 * Pure hub Keys custody panel model.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 1
 */
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import {
  ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX,
  ORPHAN_KEYS_INBOX_TITLE,
} from "./device-orphan-keys-nav-core.mjs";

/** @typedef {'this_tab_active' | 'this_tab_unsaved' | 'cross_tab' | 'orphan' | 'education'} HubKeysCustodyRowKind */

/**
 * @typedef {object} HubKeysCustodyPresenceEntry
 * @property {string} profile_id
 * @property {string} tabId
 * @property {string} [label]
 * @property {string} [handle]
 */

/**
 * @typedef {object} HubKeysCustodyRow
 * @property {HubKeysCustodyRowKind} kind
 * @property {string} title
 * @property {string} subtitle
 * @property {HubKeysCustodyPresenceEntry} [entry]
 */

/**
 * @typedef {object} HubKeysCustodyPanelState
 * @property {HubKeysCustodyRow[]} rows
 * @property {boolean} showEducation
 * @property {boolean} visible
 */

/**
 * @param {HubKeysCustodyPresenceEntry} entry
 */
export function labelForHubKeysCustodyEntry(entry) {
  if (entry.label) return entry.label;
  if (entry.handle) return `@${entry.handle}`;
  return `${String(entry.profile_id).slice(0, 12)}…`;
}

/**
 * @param {{
 *   tabNoticeCount?: number,
 *   crossTabEntries?: HubKeysCustodyPresenceEntry[],
 *   orphanRemovedEntries?: HubKeysCustodyPresenceEntry[],
 *   tabSessionLabel?: string,
 *   hasActiveKeys?: boolean,
 *   educationDismissed?: boolean,
 * }} input
 * @returns {HubKeysCustodyPanelState}
 */
export function buildHubKeysCustodyPanel(input) {
  const {
    tabNoticeCount = 0,
    crossTabEntries = [],
    orphanRemovedEntries = [],
    tabSessionLabel = "This tab",
    hasActiveKeys = false,
    educationDismissed = true,
  } = input;

  /** @type {HubKeysCustodyRow[]} */
  const rows = [];

  if (tabNoticeCount > 0 && hasActiveKeys) {
    rows.push({
      kind: "this_tab_unsaved",
      title: "Keys in this tab · Save on this device",
      subtitle: `${tabSessionLabel} · tab only until you save`,
    });
  } else if (hasActiveKeys) {
    rows.push({
      kind: "this_tab_active",
      title: "Keys active in this tab",
      subtitle: tabSessionLabel,
    });
  }

  if (shouldShowOrphanRemovedKeysNotice(orphanRemovedEntries.length, tabNoticeCount)) {
    for (const entry of orphanRemovedEntries) {
      const label = labelForHubKeysCustodyEntry(entry);
      rows.push({
        kind: "orphan",
        title: ORPHAN_KEYS_INBOX_TITLE,
        subtitle: `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · ${label}`,
        entry,
      });
    }
  }

  if (shouldShowCrossTabKeysNotice(crossTabEntries.length, tabNoticeCount)) {
    for (const entry of crossTabEntries) {
      const label = labelForHubKeysCustodyEntry(entry);
      rows.push({
        kind: "cross_tab",
        title: "Keys in another tab",
        subtitle: label,
        entry,
      });
    }
  }

  const showEducation = !educationDismissed && rows.length === 0;

  return {
    rows,
    showEducation,
    visible: rows.length > 0 || showEducation,
  };
}

/** @returns {boolean} */
export function hubKeysCustodyPanelEnabledInDom() {
  return typeof document !== "undefined" && Boolean(document.getElementById("device-hub-keys-custody"));
}
