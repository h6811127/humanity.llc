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

/** @typedef {'live_proof' | 'cross_tab_keys' | 'default'} InboxBadgeChroma */

const BADGE_CHROMA_CLASSES = {
  live_proof: "shell-notif-badge--live-proof",
  cross_tab_keys: "shell-notif-badge--cross-tab",
  default: "shell-notif-badge--default",
};

/**
 * Badge ring/count color aligned with dot overlay priority (phase 5).
 * @param {InboxItem[]} items
 * @returns {InboxBadgeChroma}
 */
export function inboxBadgeChromaKind(items) {
  const top = topInboxKind(items);
  if (top === "live_proof") return "live_proof";
  if (top === "cross_tab_keys") return "cross_tab_keys";
  return "default";
}

/** @param {InboxBadgeChroma} kind */
export function inboxBadgeChromaClass(kind) {
  return BADGE_CHROMA_CLASSES[kind] ?? BADGE_CHROMA_CLASSES.default;
}

/** @returns {string[]} */
export function inboxBadgeChromaClassNames() {
  return Object.values(BADGE_CHROMA_CLASSES);
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

/**
 * @typedef {'gold' | 'blue' | 'notice'} InboxSheetTone
 */

/**
 * @typedef {object} InboxSheetRow
 * @property {InboxKind} kind
 * @property {string} title
 * @property {string} subtitle
 * @property {InboxSheetTone} tone
 * @property {{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }} [proofItem]
 * @property {InboxCrossTabEntry} [crossTabEntry]
 */

/**
 * @param {Record<string, unknown>} entry
 */
export function inboxWalletEntryLabel(entry) {
  if (typeof entry?.label === "string" && entry.label) return entry.label;
  if (typeof entry?.handle === "string" && entry.handle) return `@${entry.handle}`;
  const id = typeof entry?.profile_id === "string" ? entry.profile_id : "";
  return id ? `${id.slice(0, 12)}…` : "Saved card";
}

/**
 * @param {InboxCrossTabEntry} entry
 */
export function inboxCrossTabLabel(entry) {
  if (entry.label) return entry.label;
  if (entry.handle) return `@${entry.handle}`;
  return `${entry.profile_id.slice(0, 12)}…`;
}

/**
 * Expand aggregate inbox items into one sheet row per actionable target.
 * @param {InboxItem[]} items
 * @param {{
 *   liveProofPending?: Array<{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }>,
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   formatProofExpiry?: (iso: string) => string,
 * }} ctx
 * @returns {InboxSheetRow[]}
 */
export function buildInboxSheetRows(items, ctx = {}) {
  const {
    liveProofPending = [],
    crossTabEntries = [],
    formatProofExpiry = (iso) => iso,
  } = ctx;

  /** @type {InboxSheetRow[]} */
  const rows = [];

  for (const item of items) {
    if (item.kind === "live_proof") {
      for (const proof of liveProofPending) {
        const label = inboxWalletEntryLabel(proof.entry);
        const expiry =
          typeof proof.expires_at === "string" && proof.expires_at
            ? formatProofExpiry(proof.expires_at)
            : "";
        rows.push({
          kind: "live_proof",
          title: label,
          subtitle: expiry ? `Someone is waiting · ${expiry}` : "Someone is waiting",
          tone: "gold",
          proofItem: proof,
        });
      }
      continue;
    }

    if (item.kind === "cross_tab_keys") {
      for (const entry of crossTabEntries) {
        rows.push({
          kind: "cross_tab_keys",
          title: "Keys in another tab",
          subtitle: inboxCrossTabLabel(entry),
          tone: "blue",
          crossTabEntry: entry,
        });
      }
      continue;
    }

    if (item.kind === "tab_keys_unsaved") {
      rows.push({
        kind: "tab_keys_unsaved",
        title: item.title,
        subtitle: item.subtitle ?? "",
        tone: "notice",
      });
    }
  }

  return rows;
}
