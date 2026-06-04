/**
 * WS-NOTIF N2 — pure delivery plans from unified inbox items.
 * @see docs/NOTIFICATION_SYSTEM_V2.md
 */
import {
  inboxBadgeAriaLabel,
  inboxBadgeChromaClass,
  inboxBadgeChromaKind,
  inboxBadgeChromaClassNames,
  inboxBadgeCountText,
  inboxBadgeTitle,
  inboxCountFromItems,
  inboxItemsIncludeKind,
  inboxTier,
} from "./device-inbox-core.mjs?v=93";
import {
  inboxKindAllowsOsNotification,
  osNotificationContentForLiveProof,
} from "./device-browser-notifications-core.mjs?v=93";
import { buildLiveControlProofHref } from "./device-live-control-inbox-core.mjs";

export const OS_NOTIFICATION_TAG_LIVE_PROOF = "hc-live-proof";
export const OS_NOTIFICATION_TAG_RELAY_OFFER = "hc-relay-offer";

/**
 * @typedef {object} ShellBadgeDeliveryPlan
 * @property {number} count
 * @property {boolean} hidden
 * @property {string} ariaLabel
 * @property {string} title
 * @property {string} countText
 * @property {import("./device-inbox-core.mjs").InboxBadgeChroma} chromaKind
 * @property {string} chromaClass
 * @property {readonly string[]} chromaClassNames
 */

/**
 * @typedef {object} HubInboxGroupVisibility
 * @property {boolean} live_proof
 * @property {boolean} relay_offer
 * @property {boolean} tab_keys_unsaved
 * @property {boolean} card_disabled_since_visit
 */

/**
 * @typedef {object} OsNotificationPlan
 * @property {'live_proof' | 'relay_offer'} kind
 * @property {string} tag
 * @property {string} dedupeKey
 * @property {string} title
 * @property {string} body
 * @property {string} [href]
 * @property {boolean} openInboxOnClick
 * @property {boolean} requireInteraction
 */

/**
 * @typedef {object} ForegroundAttentionPlan
 * @property {boolean} show N3 renders strip when true
 * @property {import("./device-inbox-core.mjs").InboxKind | null} topU0Kind
 */

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem[]} [fallback]
 */
export function relayOfferPendingFromInbox(items, fallback = []) {
  const item = items.find((i) => i.kind === "relay_offer");
  const pending = item?.meta?.relayOfferPending;
  return Array.isArray(pending) && pending.length > 0 ? pending : fallback;
}

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {Array<{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }>} [fallback]
 */
export function liveProofPendingFromInbox(items, fallback = []) {
  const item = items.find((i) => i.kind === "live_proof");
  const pending = item?.meta?.liveProofPending;
  return Array.isArray(pending) && pending.length > 0 ? pending : fallback;
}

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {{
 *   crossTabEntries?: import("./device-inbox-core.mjs").InboxCrossTabEntry[],
 *   orphanRemovedEntries?: import("./device-inbox-core.mjs").InboxCrossTabEntry[],
 *   standalone?: boolean,
 * }} [ctx]
 * @returns {ShellBadgeDeliveryPlan}
 */
export function buildShellBadgeDeliveryPlan(items, ctx = {}) {
  const count = inboxCountFromItems(items);
  const chromaKind = inboxBadgeChromaKind(items);
  return {
    count,
    hidden: count === 0,
    ariaLabel: inboxBadgeAriaLabel(items, ctx),
    title: inboxBadgeTitle(items, ctx),
    countText: inboxBadgeCountText(count),
    chromaKind,
    chromaClass: inboxBadgeChromaClass(chromaKind),
    chromaClassNames: inboxBadgeChromaClassNames(),
  };
}

/**
 * Hub alert group visibility — inbox kinds only (no parallel poll stores).
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {{ showLiveControlInbox?: boolean }} [opts]
 * @returns {HubInboxGroupVisibility}
 */
export function hubInboxGroupVisibilityFromItems(items, opts = {}) {
  const showLive = opts.showLiveControlInbox !== false;
  return {
    live_proof: showLive && inboxItemsIncludeKind(items, "live_proof"),
    relay_offer: inboxItemsIncludeKind(items, "relay_offer"),
    tab_keys_unsaved: inboxItemsIncludeKind(items, "tab_keys_unsaved"),
    card_disabled_since_visit: inboxItemsIncludeKind(items, "card_disabled_since_visit"),
  };
}

/**
 * Foreground U0 strip candidate (N3 renders; N2 exposes plan only).
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {{ tabVisible?: boolean }} [ctx]
 * @returns {ForegroundAttentionPlan}
 */
export function buildForegroundAttentionPlan(items, ctx = {}) {
  const tabVisible = ctx.tabVisible !== false;
  const topU0 = items.find((i) => inboxTier(i.kind) === "U0")?.kind ?? null;
  return {
    show: tabVisible && topU0 != null,
    topU0Kind: tabVisible ? topU0 : null,
  };
}

/**
 * OS notification plans from inbox queue (dedupe keys stable per kind).
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {{
 *   liveProofPending?: Array<{ entry: Record<string, unknown>, challenge_id: string, expires_at?: string }>,
 *   tabVisible?: boolean,
 *   interactShown?: boolean,
 *   pageOrigin?: string,
 * }} [ctx]
 * @returns {OsNotificationPlan[]}
 */
export function buildOsNotificationPlans(items, ctx = {}) {
  /** @type {OsNotificationPlan[]} */
  const plans = [];

  const livePending = liveProofPendingFromInbox(items, ctx.liveProofPending ?? []);
  const liveItem = items.find((i) => i.kind === "live_proof");
  if (
    liveItem &&
    inboxKindAllowsOsNotification("live_proof") &&
    livePending.length > 0
  ) {
    const sig = livePending.map((p) => p.challenge_id).join("|");
    const first = livePending[0];
    const { title, body } = osNotificationContentForLiveProof(first);
    const tabVisible = ctx.tabVisible === true;
    const interactShown = ctx.interactShown === true;
    plans.push({
      kind: "live_proof",
      tag: OS_NOTIFICATION_TAG_LIVE_PROOF,
      dedupeKey: sig,
      title,
      body,
      href: buildLiveControlProofHref(first, ctx.pageOrigin ?? "https://humanity.llc"),
      openInboxOnClick: false,
      requireInteraction: tabVisible || !interactShown,
    });
  }

  const relayItem = items.find((i) => i.kind === "relay_offer");
  const relayCount = relayItem?.count ?? 0;
  if (relayItem && inboxKindAllowsOsNotification("relay_offer") && relayCount > 0) {
    plans.push({
      kind: "relay_offer",
      tag: OS_NOTIFICATION_TAG_RELAY_OFFER,
      dedupeKey: String(relayCount),
      title:
        relayCount === 1 ? "Finder message on your relay" : `${relayCount} finder messages`,
      body: "Someone replied on your lost-item relay. Open Humanity to read and respond.",
      openInboxOnClick: true,
      requireInteraction: true,
    });
  }

  return plans;
}

/**
 * @param {OsNotificationPlan[]} plans
 * @param {Record<string, string>} lastDedupeByKind
 * @returns {{ plans: OsNotificationPlan[], nextDedupe: Record<string, string> }}
 */
export function filterOsPlansByDedupe(plans, lastDedupeByKind) {
  const next = { ...lastDedupeByKind };
  /** @type {OsNotificationPlan[]} */
  const fresh = [];
  for (const plan of plans) {
    if (next[plan.kind] === plan.dedupeKey) continue;
    next[plan.kind] = plan.dedupeKey;
    fresh.push(plan);
  }
  for (const kind of Object.keys(next)) {
    if (!plans.some((p) => p.kind === kind)) {
      delete next[kind];
    }
  }
  return { plans: fresh, nextDedupe: next };
}
