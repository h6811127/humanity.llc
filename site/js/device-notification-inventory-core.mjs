/**
 * WS-NOTIF N0 — canonical inventory of notification / attention surfaces.
 * Single source for Vitest guards; human table in docs/NOTIFICATION_SYSTEM_V2.md § N0.
 * @see docs/NOTIFICATION_SYSTEM_V2.md
 */

/** @typedef {'U0' | 'U1' | 'U2' | 'U3'} NotificationTier */

/**
 * @typedef {'fold' | 'keep' | 'delete' | 'not_notification' | 'shipped' | 'router'} NPhaseAction
 * fold — add inbox kind + gather; delete parallel path (N1–N2)
 * router — route OS/foreground through device-notification-delivery (N2)
 * keep — thin renderer stays; data from getInboxItems only
 * shipped — already unified inbox kind
 * not_notification — custody/settings/education; out of WS-NOTIF scope
 * delete — remove surface in later phase
 */

/**
 * @typedef {object} NotificationInventoryEntry
 * @property {string} id
 * @property {string} file
 * @property {string} trigger
 * @property {string} surface
 * @property {string} currentBehavior
 * @property {string | null} inboxKind
 * @property {NotificationTier | null} tier
 * @property {NPhaseAction} nPhase
 * @property {string} [gap]
 */

/** @type {NotificationInventoryEntry[]} */
export const NOTIFICATION_INVENTORY = [
  {
    id: "inbox-build-items",
    file: "site/js/device-inbox-core.mjs",
    trigger: "gatherInboxInput → buildInboxItems",
    surface: "badge, dot overlay, sheet rows, glance",
    currentBehavior:
      "Kinds: live_proof, relay_offer, tab_keys_unsaved, cross_tab_keys, other_tabs_unsaved_keys, orphan_keys_removed, card_disabled_since_visit; inboxTier(kind)",
    inboxKind: null,
    tier: null,
    nPhase: "shipped",
  },
  {
    id: "inbox-gather",
    file: "site/js/device-inbox.mjs",
    trigger: "chrome refresh tick; custody invalidation events",
    surface: "feeds buildInboxItems",
    currentBehavior:
      "liveProofCount, relayOfferCount/Pending, cross-tab, card_disabled → buildInboxItems",
    inboxKind: null,
    tier: null,
    nPhase: "shipped",
  },
  {
    id: "live-control-poll",
    file: "site/js/device-live-control-inbox.mjs",
    trigger: "poll scheduler, hub open, manual check, steward push SSE",
    surface: "pending store → hc-live-control-inbox-changed",
    currentBehavior: "Resolver poll for live_proof challenges; drives inbox live_proof count",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "relay-offer-poll",
    file: "site/js/device-relay-offer-inbox.mjs",
    trigger: "hub open, manual check, dismiss; hc-relay-offer-inbox-changed",
    surface: "pending store → gather relayOfferCount",
    currentBehavior: "Intent-based refresh for lost-item relay owner summaries",
    inboxKind: "relay_offer",
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "hub-inbox-alerts",
    file: "site/js/device-hub-inbox-alerts.mjs",
    trigger: "syncHubInboxAlertGroups / refreshHubInboxAlertsFromChrome",
    surface: "hub alert groups (#device-hub-live-control, relay-offer, card-disabled, tab-keys notice)",
    currentBehavior: "Renders from getInboxItems kinds + getRelayOfferPending for relay rows",
    inboxKind: null,
    tier: null,
    nPhase: "shipped",
  },
  {
    id: "hub-ui-relay-visibility",
    file: "site/js/device-hub-ui.mjs",
    trigger: "hub search refresh when query empty",
    surface: "relayOfferGroup.hidden",
    currentBehavior: "hidden = !inboxItemsIncludeKind(items, relay_offer)",
    inboxKind: "relay_offer",
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "inbox-sheet",
    file: "site/js/device-inbox-sheet.mjs",
    trigger: "shell-notif-badge tap; open_notifications",
    surface: "bottom sheet Needs attention",
    currentBehavior: "buildInboxSheetRows from getInboxItems; browser-notif prompt in footer",
    inboxKind: null,
    tier: null,
    nPhase: "keep",
  },
  {
    id: "shell-badge",
    file: "site/js/device-status.mjs",
    trigger: "device chrome refresh",
    surface: "#shell-notif-badge count + chroma class",
    currentBehavior: "buildShellBadgeDeliveryPlan from getInboxItems()",
    inboxKind: null,
    tier: null,
    nPhase: "shipped",
  },
  {
    id: "status-dot-overlay",
    file: "site/js/device-dot-state-core.mjs",
    trigger: "getInboxDotOverlay / scan-page-dot",
    surface: "dot ring overlays proof_waiting, cross_tab_keys, card_disabled_since_visit",
    currentBehavior: "Derived from inbox overlay counts; scan omits since-visit per scan-page-dot-core",
    inboxKind: null,
    tier: null,
    nPhase: "keep",
  },
  {
    id: "hub-glance",
    file: "site/js/device-hub-glance.mjs",
    trigger: "dot long-press / glance popover",
    surface: "glance rows from buildGlanceRowPlan",
    currentBehavior: "Reads getInboxItems; since-visit suffix when resolver ok",
    inboxKind: null,
    tier: null,
    nPhase: "keep",
  },
  {
    id: "os-live-proof-page",
    file: "site/js/device-browser-notifications.mjs",
    trigger: "hc-live-control-inbox-changed; visibility hidden",
    surface: "Notification API tag hc-live-proof",
    currentBehavior: "maybeNotifyLiveProof; gated by inboxKindAllowsOsNotification(live_proof)",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "os-relay-offer-page",
    file: "site/js/device-browser-notifications.mjs",
    trigger: "hc-device-hub-changed / hc-live-control-inbox-changed",
    surface: "applyOsNotificationsFromInbox",
    currentBehavior: "OS plans from inbox via device-notification-delivery",
    inboxKind: "relay_offer",
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "browser-notif-prompt",
    file: "site/js/device-browser-notifications.mjs",
    trigger: "syncBrowserNotifPrompts on hub alerts top + inbox sheet",
    surface: "device-browser-notif-prompt in hub/inbox",
    currentBehavior: "Opt-in when live proof pending + tab visible; not a notify event",
    inboxKind: null,
    tier: null,
    nPhase: "keep",
  },
  {
    id: "sw-live-proof",
    file: "site/sw-live-proof.mjs",
    trigger: "periodic sync / push hint when no visible client",
    surface: "service worker showNotification",
    currentBehavior: "Poll wallet entries; same signature dedupe as page path",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "router",
    gap: "N2: align payload with router + inbox item identity",
  },
  {
    id: "sw-page-bridge",
    file: "site/js/device-browser-notifications-sw.mjs",
    trigger: "syncLiveProofServiceWorkerState from visible tab",
    surface: "SW state cache + register/teardown",
    currentBehavior: "Passes entries, resolver health, watch flag to SW",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "keep",
  },
  {
    id: "live-proof-page-banner",
    file: "site/js/device-live-proof-banner.mjs",
    trigger: "device-chrome-refresh renderLiveProofBanner",
    surface: "#device-live-proof-banner emphasis card",
    currentBehavior: "No-op when #device-foreground-attention exists; fallback without strip host",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "foreground-attention-strip",
    file: "site/js/device-foreground-attention.mjs",
    trigger: "chrome refresh; inbox/hub/relay/visibility events",
    surface: "#device-foreground-attention",
    currentBehavior: "Single U0 strip from buildForegroundAttentionStripModel; skipped on /created/",
    inboxKind: null,
    tier: "U0",
    nPhase: "shipped",
  },
  {
    id: "cross-tab-page-banner",
    file: "site/js/device-cross-tab-banner.mjs",
    trigger: "chrome refresh; legacy hub cross-tab chrome",
    surface: "#device-cross-tab-banner, hub slot, #scan-cross-tab-banner",
    currentBehavior: "Duplicate U1 copy when shell badge + unified custody; uses gatherInboxInput",
    inboxKind: "cross_tab_keys",
    tier: "U1",
    nPhase: "delete",
    gap: "N2+: demote to inbox-only when shell-notif-badge present",
  },
  {
    id: "wallet-tab-hint",
    file: "site/js/wallet-page-chrome.mjs",
    trigger: "wallet chrome refresh",
    surface: "#wallet-tab-hint",
    currentBehavior: "Cross-tab / orphan / corrupt wallet hint; CTA open controls (shipped)",
    inboxKind: "cross_tab_keys",
    tier: "U1",
    nPhase: "keep",
    gap: "Inbox-first CTA; hint may demote after N2",
  },
  {
    id: "scan-actor-band",
    file: "site/js/scan-actor-band.mjs",
    trigger: "scan page actor state",
    surface: "#scan-actor-band",
    currentBehavior: "Open controls CTA on scan context; not badge/OS",
    inboxKind: null,
    tier: null,
    nPhase: "not_notification",
  },
  {
    id: "scan-page-dot",
    file: "site/js/scan-page-dot.mjs",
    trigger: "hc-live-control-inbox-changed + network",
    surface: "scan status dot overlays",
    currentBehavior: "proof_waiting + cross_tab_keys only (scan-page-dot-core)",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "keep",
  },
  {
    id: "created-relay-offers-section",
    file: "site/js/created-child-object-lost-item-offers.mjs",
    trigger: "Now tab lost-item relay UI",
    surface: ".child-object-relay-offers on /created/",
    currentBehavior: "Per-object finder messages; not shell inbox",
    inboxKind: null,
    tier: null,
    nPhase: "not_notification",
    gap: "Deep-link target for relay_offer hub/sheet rows",
  },
  {
    id: "steward-push-sse",
    file: "site/js/device-steward-push.mjs",
    trigger: "hosted SSE live_proof.pending",
    surface: "hc-steward-push-live-proof → poll nudge",
    currentBehavior:
      "Transport only (N5): SSE → applyLiveProofPendingFromPush → hc-live-control-inbox-changed → delivery router",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "keep",
  },
  {
    id: "hub-keys-custody",
    file: "site/js/device-hub-keys-custody.mjs",
    trigger: "hub keys panel",
    surface: "custody rows + wallet scale hint",
    currentBehavior: "Ownership/education; inboxActionCount for stranger empty only",
    inboxKind: null,
    tier: null,
    nPhase: "not_notification",
  },
  {
    id: "resolver-system-banner",
    file: "site/js/device-status.mjs",
    trigger: "networkStatus degraded/offline",
    surface: "#device-system-banner",
    currentBehavior: "U2 awareness — no badge count",
    inboxKind: null,
    tier: "U2",
    nPhase: "not_notification",
  },
  {
    id: "hub-network-tools",
    file: "site/js/device-hub-network-tools.mjs",
    trigger: "hub monitoring segment",
    surface: "watch live proof toggle, manual checks",
    currentBehavior: "Controls poll scope; not an alert channel",
    inboxKind: null,
    tier: null,
    nPhase: "not_notification",
  },
  {
    id: "safari-itp-notice",
    file: "site/js/safari-itp-storage-notice.mjs",
    trigger: "storage / custody events",
    surface: "hub notice card",
    currentBehavior: "Safari persistence education",
    inboxKind: null,
    tier: null,
    nPhase: "not_notification",
  },
  {
    id: "pwa-install-card",
    file: "site/js/pwa-install.mjs",
    trigger: "beforeinstallprompt / custody",
    surface: "hub install card",
    currentBehavior: "Install guidance; not actionable inbox",
    inboxKind: null,
    tier: null,
    nPhase: "not_notification",
  },
  {
    id: "created-live-control-proof",
    file: "site/created/index.html",
    trigger: "live proof on Now tab",
    surface: "#live-control-proof",
    currentBehavior: "Signing surface; not a notify channel",
    inboxKind: "live_proof",
    tier: "U0",
    nPhase: "not_notification",
  },
];

/** @type {readonly string[]} */
export const NOTIFICATION_INVENTORY_IDS = Object.freeze(
  NOTIFICATION_INVENTORY.map((e) => e.id)
);

/**
 * Entries that must gain an inbox kind in N1 (fold targets).
 * @returns {NotificationInventoryEntry[]}
 */
export function notificationInventoryFoldTargets() {
  return NOTIFICATION_INVENTORY.filter((e) => e.nPhase === "fold");
}

/**
 * Entries that must not add new parallel OS notify paths (N2 guard).
 * @returns {string[]}
 */
export function notificationInventoryOsSourceFiles() {
  return [
    "site/js/device-browser-notifications.mjs",
    "site/sw-live-proof.mjs",
  ];
}
