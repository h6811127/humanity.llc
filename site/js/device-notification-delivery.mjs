/**
 * WS-NOTIF N2 — browser delivery router (badge + OS from inbox).
 * @see docs/NOTIFICATION_SYSTEM_V2.md
 */
import { gatherInboxInput, getInboxItems } from "./device-inbox.mjs?v=94";
import {
  buildForegroundAttentionPlan,
  buildOsNotificationPlans,
  buildShellBadgeDeliveryPlan,
  filterOsPlansByDedupe,
  hubInboxGroupVisibilityFromItems,
} from "./device-notification-delivery-core.mjs?v=94";

export {
  buildForegroundAttentionPlan,
  buildOsNotificationPlans,
  buildShellBadgeDeliveryPlan,
  filterOsPlansByDedupe,
  hubInboxGroupVisibilityFromItems,
  liveProofPendingFromInbox,
  relayOfferPendingFromInbox,
} from "./device-notification-delivery-core.mjs?v=94";

/** @type {Record<string, string>} */
let lastOsDedupeByKind = {};

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} [items]
 * @param {ReturnType<typeof gatherInboxInput>} [gatherCtx]
 */
export function shellBadgePlanFromInbox(items = getInboxItems(), gatherCtx = gatherInboxInput()) {
  return buildShellBadgeDeliveryPlan(items, gatherCtx);
}

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} [items]
 * @param {{ showLiveControlInbox?: boolean }} [opts]
 */
export function hubGroupVisibilityFromInbox(items = getInboxItems(), opts = {}) {
  return hubInboxGroupVisibilityFromItems(items, opts);
}

/**
 * @param {{
 *   supported?: boolean,
 *   permissionGranted?: boolean,
 *   browserAlertsEnabled?: boolean,
 *   tabVisible?: boolean,
 *   interactShown?: boolean,
 *   pageOrigin?: string,
 * }} ctx
 * @returns {Promise<{ shown: number, plans: import("./device-notification-delivery-core.mjs").OsNotificationPlan[] }>}
 */
export async function applyOsNotificationsFromInbox(ctx) {
  const {
    supported = typeof Notification !== "undefined",
    permissionGranted = supported && Notification.permission === "granted",
    browserAlertsEnabled = false,
    tabVisible = typeof document !== "undefined" && document.visibilityState === "visible",
    interactShown = false,
    pageOrigin = typeof location !== "undefined" ? location.origin : "",
  } = ctx;

  if (!supported || !permissionGranted || !browserAlertsEnabled) {
    lastOsDedupeByKind = {};
    return { shown: 0, plans: [] };
  }

  const items = getInboxItems();
  const gatherCtx = gatherInboxInput();
  const allPlans = buildOsNotificationPlans(items, {
    liveProofPending: gatherCtx.liveProofPending,
    tabVisible,
    interactShown,
    pageOrigin,
  });
  const { plans, nextDedupe } = filterOsPlansByDedupe(allPlans, lastOsDedupeByKind);
  lastOsDedupeByKind = nextDedupe;

  if (tabVisible) {
    return { shown: 0, plans };
  }

  // Hidden tab: SW-only OS (PWA background). Page Notification API is unreliable here.
  return { shown: 0, plans };
}

/** Reset OS dedupe state (tests). */
export function resetOsNotificationDedupeState() {
  lastOsDedupeByKind = {};
}
