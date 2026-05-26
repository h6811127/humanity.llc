/**
 * Pure device inbox model — badge count, dot overlay inputs, glance copy.
 * @see docs/DEVICE_INBOX.md
 */
import { shouldShowCrossTabKeysNotice } from "./device-cross-tab-visibility.mjs";

/** @typedef {'live_proof' | 'tab_keys_unsaved' | 'cross_tab_keys' | 'card_disabled_since_visit'} InboxKind */
/** @typedef {'high' | 'medium' | 'low'} InboxUrgency */

/**
 * @typedef {object} InboxCrossTabEntry
 * @property {string} profile_id
 * @property {string} [label]
 * @property {string} [handle]
 * @property {string} tabId
 */

/**
 * @typedef {object} InboxItem
 * @property {InboxKind} kind
 * @property {InboxUrgency} urgency
 * @property {number} count Badge contribution (sum → inbox count)
 * @property {string} title Glance / inbox sheet headline
 * @property {string} [subtitle]
 * @property {string} [hubScrollTarget] Hub element id to scroll into view
 * @property {{ crossTabEntry?: InboxCrossTabEntry, crossTabExtra?: number }} [meta]
 */

/**
 * @param {{
 *   tabNoticeCount: number,
 *   liveProofCount: number,
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   tabSessionLabel?: string,
 * }} input
 * @returns {InboxItem[]}
 */
export function buildInboxItems(input) {
  const {
    tabNoticeCount = 0,
    liveProofCount = 0,
    crossTabEntries = [],
    tabSessionLabel = "This tab",
  } = input;

  /** @type {InboxItem[]} */
  const items = [];

  if (liveProofCount > 0) {
    const n = liveProofCount;
    items.push({
      kind: "live_proof",
      urgency: "high",
      count: n,
      title: n === 1 ? "1 live proof waiting" : `${n} live proof waiting`,
      hubScrollTarget: "device-hub-live-control-group",
    });
  }

  const crossTabCount = shouldShowCrossTabKeysNotice(
    crossTabEntries.length,
    tabNoticeCount
  )
    ? crossTabEntries.length
    : 0;

  if (crossTabCount > 0) {
    const entry = crossTabEntries[0];
    const label =
      entry?.label ||
      (entry?.handle ? `@${entry.handle}` : `${entry?.profile_id?.slice(0, 12) ?? ""}…`);
    const extra = crossTabCount > 1 ? crossTabCount - 1 : 0;
    items.push({
      kind: "cross_tab_keys",
      urgency: "medium",
      count: crossTabCount,
      title: "Keys in another tab",
      subtitle: extra > 0 ? `${label} (+${extra} more)` : label,
      hubScrollTarget: "device-hub-crosstab-notice",
      meta: { crossTabEntry: entry, crossTabExtra: extra },
    });
  }

  if (tabNoticeCount > 0) {
    items.push({
      kind: "tab_keys_unsaved",
      urgency: "medium",
      count: tabNoticeCount,
      title: "Keys in this tab · save",
      subtitle: tabSessionLabel,
      hubScrollTarget: "device-hub-notice-group",
    });
  }

  return items;
}

/**
 * @param {InboxItem[]} items
 */
export function inboxCountFromItems(items) {
  return items.reduce((sum, item) => sum + item.count, 0);
}

/**
 * @param {InboxItem[]} items
 * @returns {InboxKind | null}
 */
export function topInboxKind(items) {
  if (items.some((i) => i.kind === "live_proof")) return "live_proof";
  if (items.some((i) => i.kind === "cross_tab_keys")) return "cross_tab_keys";
  return null;
}

/**
 * Dot overlay inputs derived from inbox items (must match dotOverlayFromCounts).
 * @param {InboxItem[]} items
 */
export function inboxOverlayCountsFromItems(items) {
  const liveProofPending = items
    .filter((i) => i.kind === "live_proof")
    .reduce((s, i) => s + i.count, 0);
  const crossTabNotice = items
    .filter((i) => i.kind === "cross_tab_keys")
    .reduce((s, i) => s + i.count, 0);
  return { liveProofPending, crossTabNotice };
}

/**
 * @param {InboxItem[]} items
 */
function describeItemForAria(item) {
  if (item.kind === "live_proof") {
    return `${item.count} live proof${item.count === 1 ? "" : "s"}`;
  }
  if (item.kind === "tab_keys_unsaved") {
    return "unsaved tab keys";
  }
  if (item.kind === "cross_tab_keys") {
    return item.count > 1 ? `keys in ${item.count} other tabs` : "keys in another tab";
  }
  return "";
}

/**
 * @param {InboxItem[]} items
 */
export function inboxBadgeAriaLabel(items) {
  const n = inboxCountFromItems(items);
  if (n === 0) return "Inbox";
  const parts = items.map(describeItemForAria).filter(Boolean);
  if (parts.length === 0) {
    return n === 1 ? "1 item needs attention" : `${n} items need attention`;
  }
  return `Needs attention: ${parts.join(", ")}`;
}

/**
 * @param {number} n
 */
export function inboxBadgeCountText(n) {
  if (n <= 0) return "0";
  return n > 9 ? "9+" : String(n);
}
