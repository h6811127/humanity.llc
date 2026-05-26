/**
 * Pure status-dot state helpers (testable).
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */

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

/** @param {DotInboxOverlay} overlay */
export function overlayAriaText(overlay) {
  if (overlay === "proof_waiting") return "live proof waiting";
  if (overlay === "cross_tab_keys") return "keys active in another tab";
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
  const networkText =
    network === "ok"
      ? "resolver online"
      : network === "degraded"
        ? "resolver limited"
        : "resolver offline";
  const deviceText =
    device === "unsaved"
      ? "tab keys not saved"
      : device === "steward"
        ? "steward keys ready"
        : device === "keys"
          ? "saved keys on device"
          : "no saved keys on device";
  const overlayText = overlayAriaText(overlay);
  const base = overlayText
    ? `Status: ${networkText}, ${deviceText}, ${overlayText}.`
    : `Status: ${networkText}, ${deviceText}.`;
  if (pageKind === "wallet") {
    return `${base} Tap to scroll to saved cards.`;
  }
  if (pageKind === "scan") {
    const scanDeviceText =
      device === "unsaved"
        ? "signing keys in this tab are not saved"
        : device === "steward"
          ? "steward keys ready in this tab"
          : device === "keys"
            ? "signing keys saved on this device"
            : "no signing keys in this tab";
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
    return "Steward keys are ready on this device; open a saved card when you need to sign.";
  }
  if (queueUrl) return "Open steward review queue.";
  return "Open controls for steward actions.";
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
 * }} [opts]
 */
export function describeDotState(network, device, overlay, opts = {}) {
  const stewardReady = Boolean(opts.stewardReady);
  const queueUrl = opts.queueUrl || null;
  const pageKind = opts.pageKind || "landing";
  const singleSavedCardWithKeys = opts.singleSavedCardWithKeys === true;
  const openControlsAction =
    singleSavedCardWithKeys && pageKind !== "wallet"
      ? { kind: "open_card_controls", label: "Open controls" }
      : { kind: "open_controls", label: "Open controls" };
  const overlayText =
    overlay === "proof_waiting"
      ? "Live proof requests are waiting."
      : overlay === "cross_tab_keys"
        ? "Keys are active in another tab."
        : overlay === "card_disabled_since_visit"
          ? "A saved card was disabled on the network since your last visit."
          : "";

  if (network === "offline") {
    return {
      id: "offline",
      now: "Resolver offline.",
      why: stewardReady
        ? "Steward keys are ready locally, but network is unreachable."
        : "Health check failed and signing actions need a connection.",
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
        ? "Steward keys are ready locally; network responses are currently limited."
        : "Resolver reported degraded health.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Wait for resolver recovery before signing on this scan."
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
      now: "Tab keys not saved.",
      why: "This tab has signing keys that are not yet saved to this device.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Save keys on this device or scroll to vouch on this scan."
          : "Open controls and save keys."),
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
      why: "Steward-capable signing keys are available in this browser context.",
      next:
        pageKind === "scan"
          ? overlayText || "Scroll to vouch on this scan."
          : stewardNextLine({ overlayText, queueUrl, pageKind }),
      action:
        overlayQuickActionForPage(overlay, pageKind) ??
        (queueUrl
          ? { kind: "open_steward_queue", label: "Open steward queue", href: queueUrl }
          : { kind: "open_controls", label: "Open controls" }),
    };
  }
  if (device === "keys") {
    return {
      id: "keys",
      now: "Saved keys ready.",
      why: "Signing keys are saved on this device and resolver is online.",
      next:
        overlayText ||
        (pageKind === "scan"
          ? "Scroll to vouch or use keys here on this scan."
          : singleSavedCardWithKeys && pageKind !== "wallet"
            ? "Open your saved card to update or revoke."
            : "Open controls to manage a saved card."),
      action: overlayQuickActionForPage(overlay, pageKind) ?? openControlsAction,
    };
  }
  return {
    id: "none",
    now: "No saved keys on this device.",
    why: "Resolver is online, but this browser has no saved signing keys.",
    next:
      overlayText ||
      (pageKind === "scan"
        ? "Use keys here to vouch, or create a card."
        : "Create a card or save keys from this tab."),
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
export function primaryDotTone(network, device) {
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
