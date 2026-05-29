/**
 * Stale shell update banner for standalone PWA (Phase 8).
 * @see docs/PWA_INSTALL.md § Standalone refresh & resume
 */

import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaButton,
  emphasisCardCtaSecondary,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";

export function pwaStaleShellBannerHtml() {
  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml("Update available"),
    title: escapeEmphasisHtml("A newer version is ready"),
    detail: escapeEmphasisHtml(
      "Tap refresh to load the latest device shell on this device."
    ),
    dot: "info",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaButton("Refresh", "data-pwa-stale-shell-refresh"),
      emphasisCardCtaSecondary("Not now", "data-pwa-stale-shell-dismiss"),
    ]),
  });
}
