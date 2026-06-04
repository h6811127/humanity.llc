/**
 * Pure device inbox model - badge count, dot overlay inputs, glance copy.
 * @see docs/DEVICE_INBOX.md
 */
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import {
  ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX,
  ORPHAN_KEYS_INBOX_TITLE,
} from "./device-orphan-keys-nav-core.mjs";
import {
  crossTabAggregateSubtitle,
  crossTabAggregateTitle,
  crossTabPresenceLabel,
} from "./device-cross-tab-copy-core.mjs";
import {
  inboxAriaManagingInOtherTab,
  inboxAriaOrphanManagingOtherTab,
  inboxAriaOwnershipNotSaved,
} from "./device-ownership-copy-core.mjs?v=94";
import { shellSurfaceFromStandalone } from "./device-shell-copy-core.mjs?v=94";
import { dotOverlayFromCounts } from "./device-dot-state-core.mjs?v=94";
import { liveProofInboxAggregateTitle, liveProofInboxRowSubtitle } from "./device-live-control-inbox-core.mjs";
import {
  relayOfferInboxAggregateTitle,
  relayOfferInboxRowSubtitle,
} from "./device-relay-offer-inbox-core.mjs";

/** @typedef {'live_proof' | 'relay_offer' | 'tab_keys_unsaved' | 'cross_tab_keys' | 'other_tabs_unsaved_keys' | 'orphan_keys_removed' | 'card_disabled_since_visit'} InboxKind */

/** @typedef {'U0' | 'U1' | 'U2' | 'U3'} InboxTier */

/** @type {Record<InboxKind, InboxTier>} */
export const INBOX_KIND_TIER = {
  live_proof: "U0",
  relay_offer: "U0",
  tab_keys_unsaved: "U1",
  cross_tab_keys: "U1",
  other_tabs_unsaved_keys: "U1",
  orphan_keys_removed: "U1",
  card_disabled_since_visit: "U1",
};

/**
 * WS-NOTIF urgency tier for an inbox kind (see docs/NOTIFICATION_SYSTEM_V2.md).
 * @param {InboxKind} kind
 * @returns {InboxTier}
 */
export function inboxTier(kind) {
  return INBOX_KIND_TIER[kind];
}

/**
 * Whether this kind contributes to shell badge / inbox count (U0 + U1 only).
 * @param {InboxKind} kind
 */
export function inboxKindCountsTowardBadge(kind) {
  const tier = inboxTier(kind);
  return tier === "U0" || tier === "U1";
}

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
 * @property {{ crossTabEntry?: InboxCrossTabEntry, crossTabExtra?: number, cardDisabledEntries?: InboxCardDisabledEntry[], relayOfferPending?: import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem[], liveProofPending?: Array<{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }> }} [meta]
 */

/**
 * @param {{
 *   tabNoticeCount: number,
 *   liveProofCount: number,
 *   liveProofPending?: Array<{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }>,
 *   relayOfferCount?: number,
 *   relayOfferPending?: import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem[],
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   orphanRemovedEntries?: InboxCrossTabEntry[],
 *   tabSessionLabel?: string,
 *   cardDisabledSinceVisit?: InboxCardDisabledEntry[],
 *   standalone?: boolean,
 *   companionBrowser?: string | null,
 * }} input
 * @returns {InboxItem[]}
 */
export function buildInboxItems(input) {
  const {
    tabNoticeCount = 0,
    liveProofCount = 0,
    liveProofPending = [],
    relayOfferCount = 0,
    relayOfferPending = [],
    crossTabEntries = [],
    orphanRemovedEntries = [],
    tabSessionLabel = "This tab",
    cardDisabledSinceVisit = [],
    standalone = false,
    companionBrowser = null,
  } = input;
  const surface = shellSurfaceFromStandalone(standalone);
  const crossTabCopyOpts = { companionBrowser: companionBrowser ?? "Safari" };

  /** @type {InboxItem[]} */
  const items = [];

  if (liveProofCount > 0) {
    const n = liveProofCount;
    items.push({
      kind: "live_proof",
      urgency: "high",
      count: n,
      title: liveProofInboxAggregateTitle(n),
      hubScrollTarget: "device-hub-live-control-group",
      meta: { liveProofPending: [...liveProofPending] },
    });
  }

  if (relayOfferCount > 0) {
    const n = relayOfferCount;
    items.push({
      kind: "relay_offer",
      urgency: "high",
      count: n,
      title: relayOfferInboxAggregateTitle(n),
      hubScrollTarget: "device-hub-relay-offer-group",
      meta: { relayOfferPending: [...relayOfferPending] },
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

    if (crossTabCount >= 2) {
      items.push({
        kind: "other_tabs_unsaved_keys",
        urgency: "medium",
        count: crossTabCount,
        title: crossTabAggregateTitle(crossTabCount, surface, crossTabCopyOpts),
        subtitle: crossTabAggregateSubtitle(crossTabEntries, { surface }),
        hubScrollTarget: "device-hub-keys-custody",
        meta: { crossTabEntry: entry, crossTabExtra: crossTabCount - 1 },
      });
    } else {
      items.push({
        kind: "cross_tab_keys",
        urgency: "medium",
        count: crossTabCount,
        title: crossTabAggregateTitle(1, surface, crossTabCopyOpts),
        subtitle: crossTabPresenceLabel(entry, surface),
        hubScrollTarget: "device-hub-keys-custody",
        meta: { crossTabEntry: entry, crossTabExtra: 0 },
      });
    }
  }

  const orphanCount = shouldShowOrphanRemovedKeysNotice(
    orphanRemovedEntries.length,
    tabNoticeCount
  )
    ? orphanRemovedEntries.length
    : 0;

  if (orphanCount > 0) {
    const entry = orphanRemovedEntries[0];
    const label =
      entry?.label ||
      (entry?.handle ? `@${entry.handle}` : `${entry?.profile_id?.slice(0, 12) ?? ""}…`);
    const extra = orphanCount > 1 ? orphanCount - 1 : 0;
    items.push({
      kind: "orphan_keys_removed",
      urgency: "medium",
      count: orphanCount,
      title: ORPHAN_KEYS_INBOX_TITLE,
      subtitle:
        extra > 0
          ? `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · ${label} (+${extra} more)`
          : `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · ${label}`,
      hubScrollTarget: "device-hub-keys-custody",
      meta: { crossTabEntry: entry, crossTabExtra: extra },
    });
  }

  if (tabNoticeCount > 0) {
    items.push({
      kind: "tab_keys_unsaved",
      urgency: "medium",
      count: tabNoticeCount,
      title: "Control active · save ownership",
      subtitle: tabSessionLabel,
      hubScrollTarget: "device-hub-keys-custody",
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
 * Expand aggregate inbox items into one row per cross-tab / orphan target (Phase 2).
 * Badge count stays on aggregate `buildInboxItems()`; chrome copy uses stable per-tab labels.
 * @param {InboxItem[]} items
 * @param {{
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   orphanRemovedEntries?: InboxCrossTabEntry[],
 *   standalone?: boolean,
 *   companionBrowser?: string | null,
 * }} [ctx]
 * @returns {InboxItem[]}
 */
export function expandInboxItemsForChrome(items, ctx = {}) {
  const {
    crossTabEntries = [],
    orphanRemovedEntries = [],
    standalone = false,
    companionBrowser = null,
  } = ctx;
  const surface = shellSurfaceFromStandalone(standalone);
  const crossTabCopyOpts = { companionBrowser: companionBrowser ?? "Safari" };

  /** @type {InboxItem[]} */
  const expanded = [];

  for (const item of items) {
    if (item.kind === "cross_tab_keys" && crossTabEntries.length > 0) {
      for (const entry of crossTabEntries) {
        expanded.push({
          ...item,
          count: 1,
          subtitle: inboxCrossTabLabel(entry),
          meta: { crossTabEntry: entry },
        });
      }
      continue;
    }

    if (item.kind === "other_tabs_unsaved_keys" && crossTabEntries.length > 0) {
      for (const entry of crossTabEntries) {
        expanded.push({
          kind: "cross_tab_keys",
          count: 1,
          urgency: item.urgency,
          title: crossTabAggregateTitle(1, surface, crossTabCopyOpts),
          subtitle: inboxCrossTabLabel(entry),
          hubScrollTarget: item.hubScrollTarget,
          meta: { crossTabEntry: entry },
        });
      }
      continue;
    }

    if (item.kind === "orphan_keys_removed" && orphanRemovedEntries.length > 0) {
      for (const entry of orphanRemovedEntries) {
        expanded.push({
          ...item,
          count: 1,
          subtitle: `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · ${inboxCrossTabLabel(entry)}`,
          meta: { crossTabEntry: entry },
        });
      }
      continue;
    }

    expanded.push(item);
  }

  return expanded;
}

/**
 * Ordered glance popover rows: inbox actionable items, then saved-card peek, then “N more”.
 * @param {InboxItem[]} inboxItems
 * @param {GlanceWalletEntry[]} walletEntries
 * @param {{
 *   maxSavedCards?: number,
 *   cardDisabledProfileIds?: Set<string>,
 *   revokedHintProfileIds?: Set<string>,
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   orphanRemovedEntries?: InboxCrossTabEntry[],
 *   standalone?: boolean,
 *   companionBrowser?: string | null,
 * }} [options]
 * @returns {GlanceRowPlanEntry[]}
 */
export function buildGlanceRowPlan(inboxItems, walletEntries, options = {}) {
  const maxSavedCards = options.maxSavedCards ?? 3;
  const cardDisabledPids =
    options.cardDisabledProfileIds ?? cardDisabledProfileIdsFromInbox(inboxItems);
  const revokedHintPids = options.revokedHintProfileIds ?? new Set();

  const displayItems = expandInboxItemsForChrome(inboxItems, {
    crossTabEntries: options.crossTabEntries,
    orphanRemovedEntries: options.orphanRemovedEntries,
    standalone: options.standalone,
    companionBrowser: options.companionBrowser,
  });

  /** @type {GlanceRowPlanEntry[]} */
  const rows = [];

  for (const item of displayItems) {
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
  if (items.some((i) => i.kind === "relay_offer")) return "relay_offer";
  if (items.some((i) => i.kind === "cross_tab_keys" || i.kind === "other_tabs_unsaved_keys")) {
    return "cross_tab_keys";
  }
  if (items.some((i) => i.kind === "orphan_keys_removed")) return "orphan_keys_removed";
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

/** @typedef {'live_proof' | 'cross_tab_keys' | 'orphan_keys_removed' | 'default'} InboxBadgeChroma */

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
  if (top === "live_proof" || top === "relay_offer") return "live_proof";
  if (top === "cross_tab_keys" || top === "orphan_keys_removed") return "cross_tab_keys";
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
    .filter(
      (i) =>
        i.kind === "cross_tab_keys" ||
        i.kind === "other_tabs_unsaved_keys" ||
        i.kind === "orphan_keys_removed"
    )
    .reduce((s, i) => s + i.count, 0);
  const cardDisabledSinceVisit = items
    .filter((i) => i.kind === "card_disabled_since_visit")
    .reduce((s, i) => s + i.count, 0);
  return { liveProofPending, crossTabNotice, cardDisabledSinceVisit };
}

/**
 * @param {InboxItem} item
 * @param {import("./device-shell-copy-core.mjs").ShellSurface} [surface]
 */
function describeItemForAria(item, surface = "browser") {
  if (item.kind === "live_proof") {
    return `${item.count} live proof${item.count === 1 ? "" : "s"}`;
  }
  if (item.kind === "relay_offer") {
    return `${item.count} finder message${item.count === 1 ? "" : "s"} waiting`;
  }
  if (item.kind === "tab_keys_unsaved") {
    return inboxAriaOwnershipNotSaved(item.subtitle ?? "");
  }
  if (item.kind === "cross_tab_keys") {
    return inboxAriaManagingInOtherTab(1, item.subtitle ?? "", surface);
  }
  if (item.kind === "other_tabs_unsaved_keys") {
    return inboxAriaManagingInOtherTab(item.count, item.subtitle ?? "", surface);
  }
  if (item.kind === "orphan_keys_removed") {
    const who = item.subtitle
      ? item.subtitle.replace(`${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · `, "")
      : "";
    return inboxAriaOrphanManagingOtherTab(who, surface);
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
 * @param {{
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   orphanRemovedEntries?: InboxCrossTabEntry[],
 *   standalone?: boolean,
 * }} [ctx]
 */
export function inboxBadgeAriaLabel(items, ctx) {
  const n = inboxCountFromItems(items);
  if (n === 0) return "Inbox";

  const surface = shellSurfaceFromStandalone(ctx?.standalone === true);
  const displayItems = ctx
    ? expandInboxItemsForChrome(items, ctx)
    : items;

  const parts = displayItems.map((item) => describeItemForAria(item, surface)).filter(Boolean);
  if (parts.length === 0) {
    return n === 1 ? "1 item needs attention" : `${n} items need attention`;
  }
  const total =
    n === 1 ? "1 item" : `${n} items`;
  return `Needs attention (${total}): ${parts.join(", ")}`;
}

/**
 * Longer breakdown for badge `title` tooltip (Phase 2).
 * @param {InboxItem[]} items
 * @param {{
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   orphanRemovedEntries?: InboxCrossTabEntry[],
 *   standalone?: boolean,
 * }} [ctx]
 */
export function inboxBadgeTitle(items, ctx) {
  const n = inboxCountFromItems(items);
  if (n === 0) return "";

  const displayItems = ctx
    ? expandInboxItemsForChrome(items, {
        crossTabEntries: ctx.crossTabEntries,
        orphanRemovedEntries: ctx.orphanRemovedEntries,
        standalone: ctx.standalone,
        companionBrowser: ctx.companionBrowser,
      })
    : items;

  const parts = displayItems.map((item) => {
    if (item.kind === "live_proof" || item.kind === "relay_offer") return item.title;
    if (item.kind === "cross_tab_keys" || item.kind === "orphan_keys_removed") {
      return item.subtitle
        ? `${item.title} · ${item.subtitle}`
        : item.title;
    }
    if (item.kind === "tab_keys_unsaved") {
      return item.subtitle ? `${item.title} · ${item.subtitle}` : item.title;
    }
    return item.title;
  });

  const headline = n === 1 ? "1 item needs attention" : `${n} items need attention`;
  return `${headline} — ${parts.join(" · ")}`;
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
 * @property {import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem} [relayOfferItem]
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
  return crossTabPresenceLabel(entry);
}

/**
 * Expand aggregate inbox items into one sheet row per actionable target.
 * @param {InboxItem[]} items
 * @param {{
 *   liveProofPending?: Array<{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }>,
 *   crossTabEntries?: InboxCrossTabEntry[],
 *   orphanRemovedEntries?: InboxCrossTabEntry[],
 *   cardDisabledSinceVisit?: InboxCardDisabledEntry[],
 *   relayOfferPending?: import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem[],
 *   formatProofExpiry?: (iso: string) => string,
 *   standalone?: boolean,
 *   companionBrowser?: string | null,
 * }} ctx
 * @returns {InboxSheetRow[]}
 */
export function buildInboxSheetRows(items, ctx = {}) {
  const {
    liveProofPending = [],
    crossTabEntries = [],
    orphanRemovedEntries = [],
    cardDisabledSinceVisit = [],
    relayOfferPending = [],
    formatProofExpiry = (iso) => iso,
    standalone = false,
    companionBrowser = null,
  } = ctx;
  const surface = shellSurfaceFromStandalone(standalone);
  const crossTabCopyOpts = { companionBrowser: companionBrowser ?? "Safari" };

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
          subtitle: liveProofInboxRowSubtitle(expiry),
          tone: "gold",
          proofItem: proof,
        });
      }
      continue;
    }

    if (item.kind === "relay_offer") {
      const offers =
        item.meta?.relayOfferPending?.length > 0
          ? item.meta.relayOfferPending
          : relayOfferPending;
      for (const offer of offers) {
        const label = offer.publicLabel || "Return relay";
        rows.push({
          kind: "relay_offer",
          title: label,
          subtitle: relayOfferInboxRowSubtitle(label, offer.pendingCount),
          tone: "gold",
          relayOfferItem: offer,
        });
      }
      continue;
    }

    if (item.kind === "cross_tab_keys" || item.kind === "other_tabs_unsaved_keys") {
      for (const entry of crossTabEntries) {
        rows.push({
          kind: item.kind === "other_tabs_unsaved_keys" ? "other_tabs_unsaved_keys" : "cross_tab_keys",
          title: crossTabAggregateTitle(1, surface, crossTabCopyOpts),
          subtitle: inboxCrossTabLabel(entry),
          tone: "blue",
          crossTabEntry: entry,
        });
      }
      continue;
    }

    if (item.kind === "orphan_keys_removed") {
      for (const entry of orphanRemovedEntries) {
        rows.push({
          kind: "orphan_keys_removed",
          title: ORPHAN_KEYS_INBOX_TITLE,
          subtitle: `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · ${inboxCrossTabLabel(entry)}`,
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
