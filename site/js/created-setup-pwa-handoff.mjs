/**
 * After setup finish, reveal and scroll to the PWA install card (RC-3 slice 2).
 */

import { isIosWebKitUserAgent } from "./safari-itp-storage-notice-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  SETUP_PWA_INSTALL_CARD_ID,
  shouldOfferSetupPwaInstallHandoff,
  shouldScrollToSetupPwaInstallCard,
} from "./created-setup-pwa-handoff-core.mjs";

/**
 * @returns {{ offered: boolean; scrolled: boolean }}
 */
export function runCreatedSetupPwaInstallHandoff() {
  const handoffEligible = shouldOfferSetupPwaInstallHandoff({
    isIosWebKit: isIosWebKitUserAgent(navigator.userAgent, navigator),
    standalone: readStandaloneModeFromWindow(window),
  });
  if (!handoffEligible) {
    return { offered: false, scrolled: false };
  }

  void import("./pwa-install.mjs").then((mod) => {
    mod.renderPwaInstallCardForTests();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const card = document.getElementById(SETUP_PWA_INSTALL_CARD_ID);
        if (
          !shouldScrollToSetupPwaInstallCard({
            handoffEligible: true,
            installCardPresent: Boolean(card),
            installCardHidden: card?.hidden ?? true,
          })
        ) {
          return;
        }
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  });

  return { offered: true, scrolled: false };
}
