/**
 * Scan page dot glance — pure render + action mapping (Vitest).
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 8.2
 */

/**
 * @param {string} s
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {{ kind?: string, label?: string, href?: string } | null | undefined} descriptorAction
 * @param {import("./device-dot-state-core.mjs").DotInboxOverlay} overlay
 */
export function scanGlancePrimaryAction(descriptorAction, overlay) {
  if (overlay === "proof_waiting") {
    return { kind: "scan_scroll_live_proof", label: "Go to live proof" };
  }
  if (overlay === "cross_tab_keys") {
    return { kind: "scan_focus_other_tab", label: "Open that tab" };
  }
  if (overlay === "card_disabled_since_visit") {
    return { kind: "scan_scroll_notice", label: "Review notice" };
  }
  if (!descriptorAction) return null;
  if (
    descriptorAction.kind === "open_controls" ||
    descriptorAction.kind === "open_card_controls"
  ) {
    return { kind: "scan_go_vouch", label: "Go to vouch" };
  }
  if (descriptorAction.kind === "open_notifications") {
    return { kind: "scan_scroll_live_proof", label: "Go to live proof" };
  }
  if (descriptorAction.kind === "create_card") {
    return { kind: "scan_use_keys_here", label: "Take control here" };
  }
  if (descriptorAction.kind === "scan_use_keys_here") {
    return descriptorAction;
  }
  if (descriptorAction.kind === "import_backup") {
    return descriptorAction;
  }
  return descriptorAction;
}

/**
 * @param {{ now: string, why: string, next: string, id?: string }} descriptor
 * @param {{ kind?: string, label?: string, href?: string } | null} primaryAction
 */
export function renderScanDotExplainerHtml(descriptor, primaryAction) {
  const actionHtml = primaryAction
    ? primaryAction.href
      ? `<a class="scan-page-dot-glance-action" href="${escapeHtml(primaryAction.href)}">${escapeHtml(primaryAction.label || "")}</a>`
      : `<button type="button" class="scan-page-dot-glance-action" data-scan-dot-action="${escapeHtml(primaryAction.kind || "")}">${escapeHtml(primaryAction.label || "")}</button>`
    : "";
  const nextHtml =
    !primaryAction && descriptor.next
      ? `<p class="scan-page-dot-glance-next">${escapeHtml(descriptor.next)}</p>`
      : "";
  return `<div class="scan-page-dot-glance-body">
    <p class="scan-page-dot-glance-eyebrow">Your device</p>
    <p class="scan-page-dot-glance-now">${escapeHtml(descriptor.now)}</p>
    <p class="scan-page-dot-glance-why">${escapeHtml(descriptor.why)}</p>
    ${nextHtml}
    ${actionHtml}
  </div>`;
}

/**
 * @param {{
 *   networkResolved: boolean,
 *   online: boolean,
 *   network: "ok" | "degraded" | "offline",
 *   device: "none" | "keys" | "unsaved" | "steward",
 *   overlay: import("./device-dot-state-core.mjs").DotInboxOverlay,
 *   walletKeysNotInTab?: boolean,
 * }} input
 */
export function scanPageDotAriaLabel(input) {
  if (!input.networkResolved && input.online) {
    return "Your device: checking connection. Tap for details.";
  }
  return `Your device: ${scanDeviceAriaPhrase(
    input.network,
    input.device,
    input.overlay,
    input.walletKeysNotInTab
  )}. Tap for details.`;
}

/**
 * @param {"ok" | "degraded" | "offline"} network
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 * @param {import("./device-dot-state-core.mjs").DotInboxOverlay} overlay
 * @param {boolean} [walletKeysNotInTab]
 */
function scanDeviceAriaPhrase(network, device, overlay, walletKeysNotInTab = false) {
  if (network === "offline") return "offline";
  if (network === "degraded") return "resolver limited";
  if (overlay === "proof_waiting") return "live proof waiting";
  if (overlay === "cross_tab_keys") return "managing in another tab";
  if (device === "steward") return "steward control ready in this tab";
  if (device === "unsaved") return "ownership not saved on device";
  if (device === "keys") return "ownership saved in this tab";
  if (walletKeysNotInTab) {
    return "ownership saved on device, not in this tab";
  }
  return "ownership not loaded in this tab";
}
