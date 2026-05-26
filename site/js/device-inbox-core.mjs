/**
 * Pure device inbox model — badge count, dot overlay inputs, glance copy.
 * @see docs/DEVICE_INBOX.md
 */
import { shouldShowCrossTabKeysNotice } from "./device-cross-tab-visibility.mjs";
import { dotOverlayFromCounts } from "./device-dot-state-core.mjs?v=27";

/** @typedef {'live_proof' | 'tab_keys_unsaved' | 'cross_tab_keys' | 'card_disabled_since_visit'} InboxKind */

/**
 * @param {InboxItem[]} items
 * @param {InboxKind} kind
 */
export function inboxItemsIncludeKind(items, kind) {
  return items.some((item) => item.kind === kind);
}
/** @typedef {'high' | 'medium' | 'low'} InboxUrgency */

/**
 * @typedef {object} InboxCrossTabEntry
 * @property {string} profile_id
 * @property {string} [label]
 * @property {string} [handle]
 * @property {string} tabId
 */

/**
 * @typedef {object} InboxCardDisabledEntry
 * @property {string} profile_id
 * @property {string} [label]
 * @property {string} [handle]
 *
 * @typedef {object} InboxItem
 * @property {InboxKind} kind
 * @property {InboxUrgency} urgency
 * @property {number} count Badge contribution (sum → inbox count)
 * @property {string} title Glance / inbox sheet headline
 * @property {string} [subtitle]
 * @property {string} [hubScrollTarget] Hub element id to scroll into view
 * @property {{ crossTabEntry?: InboxCrossTabEntry, crossTabExtra?: number, cardDisabledEntries?: InboxCardDisabledEntry[] }} [meta]
 */

/**
 * @param {{
 *   tabNoticeCount: number,
 *   liveProofCount: number,
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   tabSessionLabel?: string,
 *   cardDisabledSinceVisit?: InboxCardDisabledEntry[],
 * }} input
 * @returns {InboxItem[]}
 */
export function buildInboxItems(input) {
  const {
    tabNoticeCount = 0,
    liveProofCount = 0,
    crossTabEntries = [],
    tabSessionLabel = "This tab",
    cardDisabledSinceVisit = [],
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

  if (cardDisabledSinceVisit.length > 0) {
    const n = cardDisabledSinceVisit.length;
    items.push({
      kind: "card_disabled_since_visit",
      urgency: "medium",
      count: n,
      title:
        n === 1
          ? "Card disabled since your last visit"
          : `${n} cards disabled since your last visit`,
      hubScrollTarget: "device-hub-saved-group",
      meta: { cardDisabledEntries: cardDisabledSinceVisit },
    });
  }

  return items;
}

/**
 * Profile ids listed on card_disabled_since_visit inbox item(s).
 * @param {InboxItem[]} items
 * @returns {Set<string>}
 */
export function cardDisabledProfileIdsFromInbox(items) {
  const ids = new Set();
  for (const item of items) {
    if (item.kind !== "card_disabled_since_visit") continue;
    const entries = item.meta?.cardDisabledEntries;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry?.profile_id) ids.add(String(entry.profile_id));
    }
  }
  return ids;
}

/**
 * @typedef {object} GlanceWalletEntry
 * @property {string} profile_id
 * @property {string} [label]
 * @property {string} [handle]
 */

/**
 * @typedef {object} GlanceRowInbox
 * @property {'inbox'} type
 * @property {InboxItem} item
 */

/**
 * @typedef {object} GlanceRowWallet
 * @property {'wallet'} type
 * @property {GlanceWalletEntry} entry
 * @property {boolean} revokedHint Suffix on saved row (not when card_disabled inbox row exists)
 */

/**
 * @typedef {object} GlanceRowMore
 * @property {'more'} type
 * @property {number} remainingCount
 */

/** @typedef {GlanceRowInbox | GlanceRowWallet | GlanceRowMore} GlanceRowPlanEntry */

/**
 * Ordered glance popover rows: inbox actionable items, then saved-card peek, then “N more”.
 * @param {InboxItem[]} inboxItems
 * @param {GlanceWalletEntry[]} walletEntries
 * @param {{
 *   maxSavedCards?: number,
 *   cardDisabledProfileIds?: Set<string>,
 *   revokedHintProfileIds?: Set<string>,
 * }} [options]
 * @returns {GlanceRowPlanEntry[]}
 */
export function buildGlanceRowPlan(inboxItems, walletEntries, options = {}) {
  const maxSavedCards = options.maxSavedCards ?? 3;
  const cardDisabledPids =
    options.cardDisabledProfileIds ?? cardDisabledProfileIdsFromInbox(inboxItems);
  const revokedHintPids = options.revokedHintProfileIds ?? new Set();

  /** @type {GlanceRowPlanEntry[]} */
  const rows = [];

  for (const item of inboxItems) {
    rows.push({ type: "inbox", item });
  }

  const shown = walletEntries.slice(0, maxSavedCards);
  for (const entry of shown) {
    const pid = entry?.profile_id;
    const revokedHint =
      pid &&
      !cardDisabledPids.has(pid) &&
      revokedHintPids.has(pid);
    rows.push({
      type: "wallet",
      entry,
      revokedHint: !!revokedHint,
    });
  }

  const remaining = walletEntries.length - shown.length;
  if (remaining > 0) {
    rows.push({ type: "more", remainingCount: remaining });
  }

  return rows;
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
  if (items.some((i) => i.kind === "card_disabled_since_visit")) {
    return "card_disabled_since_visit";
  }
  return null;
}

/**
 * Dot overlay for inbox items (same priority as `dotOverlayFromCounts`).
 * @param {InboxItem[]} items
 */
export function inboxDotOverlayFromItems(items) {
  return dotOverlayFromCounts(inboxOverlayCountsFromItems(items));
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
  const cardDisabledSinceVisit = items
    .filter((i) => i.kind === "card_disabled_since_visit")
    .reduce((s, i) => s + i.count, 0);
  return { liveProofPending, crossTabNotice, cardDisabledSinceVisit };
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
  if (item.kind === "card_disabled_since_visit") {
    return item.count === 1
      ? "card disabled since last visit"
      : `${item.count} cards disabled since last visit`;
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
 * @property {InboxCardDisabledEntry} [cardDisabledEntry]
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
 *   cardDisabledSinceVisit?: InboxCardDisabledEntry[],
 *   formatProofExpiry?: (iso: string) => string,
 * }} ctx
 * @returns {InboxSheetRow[]}
 */
export function buildInboxSheetRows(items, ctx = {}) {
  const {
    liveProofPending = [],
    crossTabEntries = [],
    cardDisabledSinceVisit = [],
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
      continue;
    }

    if (item.kind === "card_disabled_since_visit") {
      const entries =
        item.meta?.cardDisabledEntries?.length > 0
          ? item.meta.cardDisabledEntries
          : cardDisabledSinceVisit;
      for (const card of entries) {
        rows.push({
          kind: "card_disabled_since_visit",
          title: inboxWalletEntryLabel(card),
          subtitle: "Disabled on the network since your last visit",
          tone: "notice",
          cardDisabledEntry: card,
        });
      }
    }
  }

  return rows;
}
