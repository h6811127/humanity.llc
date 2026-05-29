/**
 * Standalone refresh affordance markup (Phase 9).
 * @see docs/PWA_INSTALL.md § Supplementary affordances
 */

import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaSecondary,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";

export function standalonePtrTipCardHtml() {
  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml("Home screen app"),
    title: escapeEmphasisHtml("Pull down to refresh"),
    detail: escapeEmphasisHtml("Tip: pull down to refresh card status."),
    dot: "info",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaSecondary("Got it", "data-pwa-ptr-tip-dismiss"),
    ]),
  });
}

/**
 * @param {{ walletPage?: boolean }} [opts]
 */
export function standaloneRefreshRowHtml(opts = {}) {
  const sub = opts.walletPage
    ? "Tap to check card status"
    : "Tap to refresh cards";
  return `
    <li class="device-hub-glance-row device-hub-glance-row--refresh device-pwa-refresh-row">
      <button type="button" class="device-hub-glance-btn" data-pwa-refresh-row>
        <span class="device-hub-glance-title">Refresh</span>
        <span class="device-hub-glance-sub">${escapeEmphasisHtml(sub)}</span>
      </button>
    </li>`;
}
