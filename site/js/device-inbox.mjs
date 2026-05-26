/**
 * Device inbox — browser facade over device-inbox-core.
 * @see docs/DEVICE_INBOX.md
 */
import {
  buildGlanceRowPlan,
  buildInboxItems,
  cardDisabledProfileIdsFromInbox,
  inboxBadgeAriaLabel,
  inboxBadgeCountText,
  inboxCountFromItems,
  inboxDotOverlayFromItems,
  inboxOverlayCountsFromItems,
  topInboxKind,
  inboxBadgeChromaKind,
  inboxBadgeChromaClass,
  inboxBadgeChromaClassNames,
} from "./device-inbox-core.mjs?v=34";
import { tabNoticeCount } from "./device-counts.mjs";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { getTabSession } from "./device-keys.mjs";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { shouldShowCrossTabKeysNotice, shouldShowOrphanRemovedKeysNotice } from "./device-cross-tab-visibility.mjs";
import { gatherCardDisabledSinceVisitForInbox } from "./device-inbox-card-disabled.mjs?v=34";

export {
  buildGlanceRowPlan,
  buildInboxItems,
  cardDisabledProfileIdsFromInbox,
  inboxBadgeAriaLabel,
  inboxBadgeCountText,
  inboxCountFromItems,
  inboxDotOverlayFromItems,
  inboxOverlayCountsFromItems,
  topInboxKind,
  inboxBadgeChromaKind,
  inboxBadgeChromaClass,
  inboxBadgeChromaClassNames,
} from "./device-inbox-core.mjs?v=34";

function tabSessionLabel() {
  const session = getTabSession();
  if (session?.handle) return `@${session.handle}`;
  if (session?.profile_id) return session.profile_id.slice(0, 12);
  return "This tab";
}

/** @returns {Parameters<typeof buildInboxItems>[0]} */
export function gatherInboxInput() {
  const cardDisabled = gatherCardDisabledSinceVisitForInbox().map((entry) => ({
    profile_id: entry.profile_id,
    label: entry.label,
    handle: entry.handle,
  }));
  const notices = tabNoticeCount();
  const crossTabRaw = getOtherTabsWithKeys();
  const orphanRaw = getOrphanRemovedTabsWithKeys();
  return {
    tabNoticeCount: notices,
    liveProofCount: getLiveControlPendingCount(),
    crossTabEntries: shouldShowCrossTabKeysNotice(crossTabRaw.length, notices)
      ? crossTabRaw
      : [],
    orphanRemovedEntries: shouldShowOrphanRemovedKeysNotice(orphanRaw.length, notices)
      ? orphanRaw
      : [],
    tabSessionLabel: tabSessionLabel(),
    cardDisabledSinceVisit: cardDisabled,
  };
}

/**
 * @returns {import("./device-inbox-core.mjs").InboxItem[]}
 */
export function getInboxItems() {
  return buildInboxItems(gatherInboxInput());
}

/** Actionable inbox count for shell badge. */
export function notificationCount() {
  return inboxCountFromItems(getInboxItems());
}

/**
 * @returns {{ liveProofPending: number, crossTabNotice: number, cardDisabledSinceVisit: number }}
 */
export function getInboxOverlayCounts() {
  return inboxOverlayCountsFromItems(getInboxItems());
}

/** @returns {import("./device-dot-state-core.mjs").DotInboxOverlay} */
export function getInboxDotOverlay() {
  return inboxDotOverlayFromItems(getInboxItems());
}
