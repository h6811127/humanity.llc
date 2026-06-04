/**
 * Pure status-dot state helpers (testable).
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */

import {
  DEVICE_UNLOCK_REENROLL_ON_SCAN,
  DEVICE_UNLOCK_REENROLL_PROMPT,
  DEVICE_UNLOCK_REENROLL_SUBTITLE,
  DEVICE_UNLOCK_REENROLL_IN_THIS_TAB,
  OWNERSHIP_NOT_IN_TAB_PROMPT,
  OWNERSHIP_NOT_IN_TAB_SUBTITLE,
  OPEN_CONTROLS_ACTION,
  OPEN_CONTROLS_HERE,
  STEWARD_REVIEW_QUEUE_MANAGE_HINT,
  UNLOCK_NOT_IN_TAB_SUBTITLE,
  UNLOCK_TO_MANAGE_HERE,
  UNLOCK_TO_MANAGE_IN_THIS_TAB,
  UNLOCK_TO_MANAGE_PROMPT,
} from "./device-ownership-copy-core.mjs?v=91";
import { walletOwnershipNotInTab } from "./device-ownership-not-in-tab-core.mjs?v=91";
import { dotOverlayCrossTabPhrase } from "./device-shell-copy-core.mjs?v=91";

/** @typedef {import("./device-shell-copy-core.mjs").ShellSurface} ShellSurface */

/**
 * @param {{ verification?: { state?: string, label?: string } } | null | undefined} record
 */
export function hasStewardVerification(record) {
  const state = String(record?.verification?.state || "").toLowerCase();
  const label = String(record?.verification?.label || "").toLowerCase();
  return state === "steward" || label === "steward";
}

/**
 * @param {{ unsavedTabKeys: boolean, stewardReady: boolean, savedWalletCount: number }}
 */
export function deviceStateFromContext({ unsavedTabKeys, stewardReady, savedWalletCount }) {
  if (unsavedTabKeys) return "unsaved";
  if (stewardReady) return "steward";
  if (savedWalletCount > 0) return "keys";
  return "none";
}

/**
 * Scan page device axis: tab signing state only (not wallet row count).
 * Wallet-only keys map to `none` (hollow ring) — see docs/SAFARI_KEYS_CUSTODY.md P0-5.
 *
 * @param {{ unsavedTabKeys: boolean, stewardReady: boolean, hasTabSigningKeys: boolean }}
 */
export function scanDeviceStateFromContext({
  unsavedTabKeys,
  stewardReady,
  hasTabSigningKeys,
}) {
  if (unsavedTabKeys) return "unsaved";
  if (stewardReady && hasTabSigningKeys) return "steward";
  if (hasTabSigningKeys) return "keys";
  return "none";
}

/**
 * @param {number} walletSigningKeyCount
 * @param {boolean} hasTabSigningKeys
 */
export function scanWalletKeysNotInTab(walletSigningKeyCount, hasTabSigningKeys) {
  return walletOwnershipNotInTab(walletSigningKeyCount, hasTabSigningKeys);
}

/**
 * @param {{ liveProofPending: number, crossTabNotice: number, cardDisabledSinceVisit?: number }}
 */
export function dotOverlayFromCounts({
  liveProofPending,
  crossTabNotice,
  cardDisabledSinceVisit = 0,
}) {
  if (liveProofPending > 0) return "proof_waiting";
  if (crossTabNotice > 0) return "cross_tab_keys";
  if (cardDisabledSinceVisit > 0) return "card_disabled_since_visit";
  return "none";
}

/** @typedef {"none" | "proof_waiting" | "cross_tab_keys" | "card_disabled_since_visit"} DotInboxOverlay */

/**
 * @param {DotInboxOverlay} overlay
 * @param {ShellSurface} [surface]
 */
export function overlayAriaText(overlay, surface = "browser") {
  if (overlay === "proof_waiting") return "live proof waiting";
  if (overlay === "cross_tab_keys") return dotOverlayCrossTabPhrase(surface);
  if (overlay === "card_disabled_since_visit") return "card disabled since last visit";
  return "";
}

/** @param {DotInboxOverlay} overlay */
export function inboxOverlayQuickAction(overlay) {
  if (overlay === "proof_waiting") {
    return { kind: "open_notifications", label: "Open proof requests" };
  }
  if (overlay === "card_disabled_since_visit") {
    return { kind: "open_notifications", label: "Open device inbox" };
  }
  return null;
}

/** Scan page chrome: in-page actions instead of hub/inbox. @param {DotInboxOverlay} overlay */
export function scanOverlayQuickAction(overlay) {
  if (overlay === "proof_waiting") {
    return { kind: "scan_scroll_live_proof", label: "Go to live proof" };
  }
  if (overlay === "cross_tab_keys") {
    return { kind: "scan_focus_other_tab", label: "Open that tab" };
  }
  if (overlay === "card_disabled_since_visit") {
    return { kind: "scan_scroll_notice", label: "Review notice" };
  }
  return null;
}

/**
 * @param {DotInboxOverlay} overlay
 * @param {string} pageKind
 */
function overlayQuickActionForPage(overlay, pageKind) {
  if (pageKind === "scan") return scanOverlayQuickAction(overlay);
  return inboxOverlayQuickAction(overlay);
}

/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 * @param {DotInboxOverlay} overlay
 * @param {{ pageKind?: string }} [opts]
 */
export function statusAriaLabel(network, device, overlay, opts = {}) {
  const pageKind = opts.pageKind || "landing";
  const surface = opts.surface ?? "browser";
  const walletKeysNotInTab = opts.walletKeysNotInTab === true;
  const networkText =
    network === "ok"
      ? "resolver online"
      : network === "degraded"
        ? "resolver limited"
        : "resolver offline";
  const deviceText =
    device === "unsaved"
      ? "ownership not saved on device"
      : device === "steward"
        ? "steward control ready"
        : device === "keys"
          ? "ownership saved on device"
          : "no ownership saved on device";
  const overlayText = overlayAriaText(overlay, surface);
  if (walletKeysNotInTab && device === "none") {
    const tabDeviceText = "ownership saved on device, not in this tab";
    const honestBase = overlayText
      ? `Status: ${networkText}, ${tabDeviceText}, ${overlayText}.`
      : `Status: ${networkText}, ${tabDeviceText}.`;
    if (pageKind === "wallet") {
      return `${honestBase} Tap to scroll to saved cards and restore control.`;
    }
    if (pageKind === "scan") {
      return overlayText
        ? `Your device: ${networkText}, ${tabDeviceText}, ${overlayText}.`
        : `Your device: ${networkText}, ${tabDeviceText}.`;
    }
    return honestBase;
  }
  const base = overlayText
    ? `Status: ${networkText}, ${deviceText}, ${overlayText}.`
    : `Status: ${networkText}, ${deviceText}.`;
  if (pageKind === "wallet") {
    return `${base} Tap to scroll to saved cards.`;
  }
  if (pageKind === "scan") {
    const scanDeviceText =
      device === "unsaved"
        ? "ownership in this tab is not saved on device"
        : device === "steward"
          ? "steward control ready in this tab"
          : device === "keys"
            ? "ownership saved on this device"
            : "ownership not loaded in this tab";
    const scanBase = overlayText
      ? `Your device: ${networkText}, ${scanDeviceText}, ${overlayText}.`
      : `Your device: ${networkText}, ${scanDeviceText}.`;
    return scanBase;
  }
  return base;
}

/**
 * @param {{ overlayText: string, queueUrl: string | null, pageKind: string }} ctx
 */
function stewardNextLine({ overlayText, queueUrl, pageKind }) {
  if (overlayText) return overlayText;
  if (pageKind === "wallet") {
    return "Steward control is ready on this device; open a saved card when you need to attest.";
  }
  if (pageKind === "scan") {
    return "Scroll to Issue vouch on this scan when attesting for someone else.";
  }
  const vouchLead =
    "Scan someone else's QR to vouch, or tap the scan icon when the hub is closed.";
  if (queueUrl) {
    return `${vouchLead} ${STEWARD_REVIEW_QUEUE_MANAGE_HINT}`;
  }
  return `${vouchLead} Open controls for QR tools and network status.`;
}

/**
 * Glance popover kicker copy (compact) vs hub status key (full legend).
 * @param {{ id?: string }} descriptor
 * @param {boolean} compact
 */
export function dotExplainerKicker(descriptor, compact) {
  if (compact && descriptor?.id === "steward") {
    return "Steward ready: you can review and sign steward actions now.";
  }
  return compact ? "Status now" : "Status explainer";
}

/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 * @param {DotInboxOverlay} overlay
 * @param {{
 *   stewardReady?: boolean,
 *   queueUrl?: string | null,
 *   pageKind?: string,
 *   singleSavedCardWithKeys?: boolean,
 *   walletKeysNotInTab?: boolean,
 *   walletNeedsDeviceUnlock?: boolean,
 *   walletNeedsDeviceUnlockReenroll?: boolean,
 * }} [opts]
 */
export function describeDotState(network, device, overlay, opts = {}) {
  const stewardReady = Boolean(opts.stewardReady);
  const queueUrl = opts.queueUrl || null;
  const pageKind = opts.pageKind || "landing";
  const singleSavedCardWithKeys = opts.singleSavedCardWithKeys === true;
  const walletKeysNotInTab = opts.walletKeysNotInTab === true;
  const walletNeedsDeviceUnlock = opts.walletNeedsDeviceUnlock === true;
  const walletNeedsDeviceUnlockReenroll = opts.walletNeedsDeviceUnlockReenroll === true;
  const openControlsAction =
    singleSavedCardWithKeys && pageKind !== "wallet"
      ? { kind: "open_card_controls", label: "Open controls" }
      : { kind: "open_controls", label: "Open controls" };
  const overlayText =
    overlay === "proof_waiting"
      ? "Live proof requests are waiting."
      : overlay === "cross_tab_keys"
        ? "Another tab is managing ownership."
        : overlay === "card_disabled_since_visit"
          ? "A saved card was disabled on the network since your last visit."
          : "";

  if (network === "offline") {
    return {
      id: "offline",
      now: "Resolver offline.",
      why: stewardReady
        ? "Steward control is ready locally, but network is unreachable."
        : "Health check failed and attestation needs a connection.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Reconnect to check live scan state."
          : "Retry resolver check."),
      action: overlayQuickActionForPage(overlay, pageKind) ?? {
        kind: "retry",
        label: "Retry status check",
      },
    };
  }
  if (network === "degraded") {
    return {
      id: "degraded",
      now: "Resolver limited.",
      why: stewardReady
        ? "Steward control is ready locally; network responses are currently limited."
        : "Resolver reported degraded health.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Wait for resolver recovery before attesting on this scan."
          : "Retry status check or wait for recovery."),
      action: overlayQuickActionForPage(overlay, pageKind) ?? {
        kind: "retry",
        label: "Retry status check",
      },
    };
  }
  if (device === "unsaved") {
    return {
      id: "unsaved",
      now: "Ownership not saved.",
      why: "This tab has control that is not yet saved to this device.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Save ownership on this device or scroll to attest on this scan."
          : "Open controls and save ownership."),
      action: overlayQuickActionForPage(overlay, pageKind) ?? {
        kind: "open_controls",
        label: "Open controls",
      },
    };
  }
  if (device === "steward") {
    return {
      id: "steward",
      now: "Steward ready, resolver online.",
      why: "Steward-capable control is available in this browser.",
      next:
        pageKind === "scan"
          ? overlayText || "Scroll to vouch on this scan."
          : stewardNextLine({ overlayText, queueUrl, pageKind }),
      action:
        overlayQuickActionForPage(overlay, pageKind) ??
        (pageKind === "scan"
          ? { kind: "scan_scroll_vouch", label: "Go to vouch" }
          : openControlsAction),
    };
  }
  if (device === "keys") {
    return {
      id: "keys",
      now: "Ownership saved.",
      why: "Ownership is saved on this device and resolver is online.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Open controls to attest on this scan."
          : singleSavedCardWithKeys && pageKind !== "wallet"
            ? "Open your saved card to update or revoke."
            : "Open controls to manage a saved card."),
      action: overlayQuickActionForPage(overlay, pageKind) ?? openControlsAction,
    };
  }
  if (device === "none" && walletKeysNotInTab) {
    const restoreLabel = walletNeedsDeviceUnlockReenroll
      ? pageKind === "scan"
        ? DEVICE_UNLOCK_REENROLL_ON_SCAN
        : DEVICE_UNLOCK_REENROLL_IN_THIS_TAB
      : walletNeedsDeviceUnlock
        ? pageKind === "scan"
          ? UNLOCK_TO_MANAGE_HERE
          : UNLOCK_TO_MANAGE_IN_THIS_TAB
        : pageKind === "scan"
          ? OPEN_CONTROLS_HERE
          : OPEN_CONTROLS_ACTION;
    const actionKind = walletNeedsDeviceUnlockReenroll
      ? "import_backup"
      : pageKind === "scan"
        ? "scan_use_keys_here"
        : "open_controls";
    return {
      id: "none",
      now:
        pageKind === "scan"
          ? walletNeedsDeviceUnlockReenroll
            ? `${DEVICE_UNLOCK_REENROLL_PROMPT} on this scan.`
            : walletNeedsDeviceUnlock
              ? "Unlock to manage on this scan."
              : `${OWNERSHIP_NOT_IN_TAB_PROMPT}.`
          : walletNeedsDeviceUnlockReenroll
            ? `${DEVICE_UNLOCK_REENROLL_PROMPT}.`
            : walletNeedsDeviceUnlock
              ? `${UNLOCK_TO_MANAGE_PROMPT}.`
              : `${OWNERSHIP_NOT_IN_TAB_PROMPT}.`,
      why: walletNeedsDeviceUnlockReenroll
        ? "Recovery is saved here, but Face ID is not set up on this device yet."
        : walletNeedsDeviceUnlock
          ? "Your object is saved on this device behind Face ID or Touch ID."
          : "Your ownership is saved on this device, but this tab cannot sign yet.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? walletNeedsDeviceUnlockReenroll
            ? `${DEVICE_UNLOCK_REENROLL_ON_SCAN}, then enroll in Manage.`
            : walletNeedsDeviceUnlock
              ? `${UNLOCK_TO_MANAGE_HERE} to attest on this scan.`
              : `${OPEN_CONTROLS_HERE} to attest on this scan.`
          : walletNeedsDeviceUnlockReenroll
            ? `${DEVICE_UNLOCK_REENROLL_SUBTITLE}.`
            : walletNeedsDeviceUnlock
              ? `${UNLOCK_NOT_IN_TAB_SUBTITLE}.`
              : `${OWNERSHIP_NOT_IN_TAB_SUBTITLE}.`),
      action: overlayQuickActionForPage(overlay, pageKind) ?? {
        kind: actionKind,
        label: restoreLabel,
      },
    };
  }
  return {
    id: "none",
    now: "No ownership saved on this device.",
    why: "Resolver is online, but this browser has no saved ownership.",
    next:
      overlayText ||
      (pageKind === "scan"
        ? "Take control here to attest, or create a card."
        : "Create a card or save ownership from this tab."),
    action: overlayQuickActionForPage(overlay, pageKind) ?? {
      kind: "create_card",
      label: "Create a card",
      href: "/create/",
    },
  };
}

/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 */
export function dotStateKey(network, device) {
  return `${network}:${device}`;
}

/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 * @param {DotInboxOverlay} overlay
 */
/** Calm shell dot when stranger has no keys and no urgent overlays (S4). */
export const SHELL_DOT_NEUTRAL_EMPTY_CLASS = "shell-status-dot--neutral-empty";

/**
 * @param {{
 *   network: "ok" | "degraded" | "offline",
 *   device: "none" | "keys" | "unsaved" | "steward",
 *   overlay: DotInboxOverlay,
 *   savedWalletCount: number,
 * }}
 */
export function shellDotUsesNeutralEmptyWallet({
  network,
  device,
  overlay,
  savedWalletCount,
}) {
  if (network !== "ok") return false;
  if (device !== "none") return false;
  if (overlay !== "none") return false;
  if (savedWalletCount > 0) return false;
  return true;
}

/**
 * @param {string} pathname
 * @param {{ isWalletPage?: boolean }} [opts]
 */
export function dotPageKindFromPathname(pathname, opts = {}) {
  if (opts.isWalletPage) return "wallet";
  const path = pathname || "/";
  if (path.startsWith("/created")) return "created";
  if (path.startsWith("/create")) return "create";
  return "landing";
}

/**
 * Hub header status uses one calm inline line. Network is the primary read,
 * counts are metadata, and actionable states keep alert weight.
 * @param {Array<{ id: string, label?: string, chipLabel?: string, detail?: string, zero?: boolean, highlight?: boolean, chipTone?: string }>} segments
 */
export function hubStatusLineItemsFromSegments(segments) {
  return segments.map((seg) => {
    const emphasis =
      seg.id === "network" ? "primary" : seg.highlight ? "alert" : "meta";
    return {
      id: seg.id,
      label: seg.chipLabel ?? seg.label ?? "",
      detail: seg.detail ?? "",
      zero: Boolean(seg.zero),
      highlight: Boolean(seg.highlight),
      tone: seg.chipTone ?? (seg.highlight ? "highlight" : "neutral"),
      emphasis,
    };
  });
}

export function dotClassList(network, device, overlay) {
  return [
    `pass-dot-status-network-${network}`,
    `pass-dot-status-device-${device}`,
    `pass-dot-overlay-${overlay}`,
  ];
}

/**
 * Visible dot color follows network first, then device (when network is ok).
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 */
/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 * @param {{ shellNeutralEmpty?: boolean }} [opts]
 */
export function primaryDotTone(network, device, opts = {}) {
  if (opts.shellNeutralEmpty) return "neutral";
  if (network === "offline") return "offline";
  if (network === "degraded") return "degraded";
  if (device === "steward") return "steward";
  if (device === "unsaved" || device === "none") return "unsaved";
  return "keys";
}

/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 * @param {DotInboxOverlay} overlay
 */
export function dotTransitionKey(network, device, overlay) {
  return `${network}:${device}:${overlay}`;
}

/**
 * One-time steward bloom when device becomes steward while network is healthy.
 * @param {{
 *   network: "ok" | "degraded" | "offline",
 *   previousDevice: "none" | "keys" | "unsaved" | "steward" | null,
 *   nextDevice: "none" | "keys" | "unsaved" | "steward",
 *   reducedMotion?: boolean,
 * }}
 */
export function shouldCelebrateStewardTransition({
  network,
  previousDevice,
  nextDevice,
  reducedMotion = false,
}) {
  if (reducedMotion) return false;
  if (network !== "ok") return false;
  if (nextDevice !== "steward") return false;
  if (previousDevice === "steward") return false;
  return true;
}
