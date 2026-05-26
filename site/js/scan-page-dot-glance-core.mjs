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
    return { kind: "scan_use_keys_here", label: "Use keys here" };
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
      ? `<a class="device-dot-explainer-action scan-page-dot-explainer-action" href="${escapeHtml(primaryAction.href)}">${escapeHtml(primaryAction.label || "")}</a>`
      : `<button type="button" class="device-dot-explainer-action scan-page-dot-explainer-action" data-scan-dot-action="${escapeHtml(primaryAction.kind || "")}">${escapeHtml(primaryAction.label || "")}</button>`
    : "";
  return `
    <p class="device-dot-explainer-kicker">Your device on this scan</p>
    <p class="device-dot-explainer-line"><strong>Now:</strong> ${escapeHtml(descriptor.now)}</p>
    <p class="device-dot-explainer-line"><strong>Why:</strong> ${escapeHtml(descriptor.why)}</p>
    <p class="device-dot-explainer-line"><strong>Next:</strong> ${escapeHtml(descriptor.next)}</p>
    ${actionHtml}`;
}
