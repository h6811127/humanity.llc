/**
 * Setup Done → PWA install card handoff (RC-3 slice 2).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-3
 * @see docs/PWA_INSTALL.md
 */

import { shouldShowSetupIosSafariCustodyNotice } from "./created-setup-ios-custody-core.mjs";

/** Fired on same tab when `markSetupDone` persists hc_setup_done. */
export const HC_SETUP_DONE_MARKED_EVENT = "hc-setup-done-marked";

/** Shell emphasis card rendered by `pwa-install.mjs`. */
export const SETUP_PWA_INSTALL_CARD_ID = "device-pwa-install-card";

/**
 * iOS Safari browser only — same gate as setup Done Home Screen notice.
 * @param {{ isIosWebKit?: boolean; standalone?: boolean }} input
 */
export function shouldOfferSetupPwaInstallHandoff(input) {
  return shouldShowSetupIosSafariCustodyNotice(input);
}

/**
 * @param {{
 *   handoffEligible?: boolean;
 *   installCardPresent?: boolean;
 *   installCardHidden?: boolean;
 * }} input
 */
export function shouldScrollToSetupPwaInstallCard(input) {
  const {
    handoffEligible = false,
    installCardPresent = false,
    installCardHidden = true,
  } = input;
  return Boolean(handoffEligible && installCardPresent && !installCardHidden);
}
