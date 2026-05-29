/**
 * PWA install emphasis card markup.
 * @see docs/PWA_INSTALL.md
 */

import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaButton,
  emphasisCardCtaSecondary,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";

/**
 * @param {{ iosManual: boolean }} opts
 */
export function pwaInstallCardBodyHtml(opts) {
  const eyebrow = opts.iosManual ? "Add to Home Screen" : "Install on this device";
  const title = "Open your saved cards from the home screen";
  const detail = opts.iosManual
    ? "Same keys and inbox — no account. Tap Share → Add to Home Screen. After installing, pull down to refresh your cards."
    : "Same keys and inbox — no account. Pull down anytime to refresh your cards.";

  const actions = opts.iosManual
    ? [emphasisCardCtaSecondary("Not now", "data-pwa-install-dismiss")]
    : [
        emphasisCardCtaButton("Install", "data-pwa-install-confirm"),
        emphasisCardCtaSecondary("Not now", "data-pwa-install-dismiss"),
      ];

  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml(eyebrow),
    title: escapeEmphasisHtml(title),
    detail: escapeEmphasisHtml(detail),
    dot: "info",
    actionsHtml: emphasisCardActionsHtml(actions),
  });
}

/**
 * Shown instead of install card until first setup wizard completes (P4).
 */
export function pwaInstallDeferralCardBodyHtml() {
  return emphasisCardBodyHtml({
    eyebrow: escapeEmphasisHtml("Home screen app"),
    title: escapeEmphasisHtml("Finish your first object in Safari"),
    detail: escapeEmphasisHtml(
      "Complete setup on your new card, then add this site to your Home Screen for quick return."
    ),
    dot: "info",
    actionsHtml: emphasisCardActionsHtml([
      emphasisCardCtaSecondary("Not now", "data-pwa-install-dismiss"),
    ]),
  });
}
