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
} from "./device-inbox-core.mjs?v=35";
import { tabNoticeCount } from "./device-counts.mjs";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { getTabSession } from "./device-keys.mjs";
import { stablePresenceInboxEntries } from "./device-presence-inbox-stability-core.mjs";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { shouldShowCrossTabKeysNotice, shouldShowOrphanRemovedKeysNotice } from "./device-cross-tab-visibility.mjs";
import { gatherCardDisabledSinceVisitForInbox } from "./device-inbox-card-disabled.mjs?v=35";

/** Coalesce multiple gather reads in one chrome refresh (Path G). */
const GATHER_COALESCE_MS = 50;
let lastGatherMs = 0;
/** @type {ReturnType<typeof gatherInboxInput> | null} */
let gatherCache = null;
let crossTabShowStreak = 0;
let orphanShowStreak = 0;

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
} from "./device-inbox-core.mjs?v=35";

function tabSessionLabel() {
  const session = getTabSession();
  if (session?.handle) return `@${session.handle}`;
  if (session?.profile_id) return session.profile_id.slice(0, 12);
  return "This tab";
}

/** Invalidate gather cache (tests). */
export function resetPresenceInboxGatherCache() {
  gatherCache = null;
  lastGatherMs = 0;
  crossTabShowStreak = 0;
  orphanShowStreak = 0;
}

/** @returns {Parameters<typeof buildInboxItems>[0]} */
export function gatherInboxInput() {
  const now = Date.now();
  if (gatherCache && now - lastGatherMs <= GATHER_COALESCE_MS) {
    return gatherCache;
  }

  const cardDisabled = gatherCardDisabledSinceVisitForInbox().map((entry) => ({
    profile_id: entry.profile_id,
    label: entry.label,
    handle: entry.handle,
  }));
  const notices = tabNoticeCount();
  const crossTabRaw = getOtherTabsWithKeys();
  const orphanRaw = getOrphanRemovedTabsWithKeys();

  const crossTabStable = stablePresenceInboxEntries(
    crossTabRaw,
    notices,
    shouldShowCrossTabKeysNotice,
    crossTabShowStreak
  );
  crossTabShowStreak = crossTabStable.streak;

  const orphanStable = stablePresenceInboxEntries(
    orphanRaw,
    notices,
    shouldShowOrphanRemovedKeysNotice,
    orphanShowStreak
  );
  orphanShowStreak = orphanStable.streak;

  gatherCache = {
    tabNoticeCount: notices,
    liveProofCount: getLiveControlPendingCount(),
    crossTabEntries: crossTabStable.entries,
    orphanRemovedEntries: orphanStable.entries,
    tabSessionLabel: tabSessionLabel(),
    cardDisabledSinceVisit: cardDisabled,
  };
  lastGatherMs = now;
  return gatherCache;
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
