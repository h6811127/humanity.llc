import { describe, expect, it } from "vitest";

import {
  HC_SETUP_DONE_MARKED_EVENT,
  SETUP_PWA_INSTALL_CARD_ID,
  shouldOfferSetupPwaInstallHandoff,
  shouldScrollToSetupPwaInstallCard,
} from "../../site/js/created-setup-pwa-handoff-core.mjs";

describe("shouldOfferSetupPwaInstallHandoff (RC-3 slice 2)", () => {
  it("matches iOS Safari browser custody gate", () => {
    expect(
      shouldOfferSetupPwaInstallHandoff({ isIosWebKit: true, standalone: false })
    ).toBe(true);
    expect(
      shouldOfferSetupPwaInstallHandoff({ isIosWebKit: true, standalone: true })
    ).toBe(false);
    expect(
      shouldOfferSetupPwaInstallHandoff({ isIosWebKit: false, standalone: false })
    ).toBe(false);
  });
});

describe("shouldScrollToSetupPwaInstallCard (RC-3 slice 2)", () => {
  it("scrolls only when handoff eligible and install card is visible", () => {
    expect(
      shouldScrollToSetupPwaInstallCard({
        handoffEligible: true,
        installCardPresent: true,
        installCardHidden: false,
      })
    ).toBe(true);
    expect(
      shouldScrollToSetupPwaInstallCard({
        handoffEligible: true,
        installCardPresent: true,
        installCardHidden: true,
      })
    ).toBe(false);
    expect(
      shouldScrollToSetupPwaInstallCard({
        handoffEligible: false,
        installCardPresent: true,
        installCardHidden: false,
      })
    ).toBe(false);
  });
});

describe("setup PWA handoff constants", () => {
  it("exports stable event and card ids", () => {
    expect(HC_SETUP_DONE_MARKED_EVENT).toBe("hc-setup-done-marked");
    expect(SETUP_PWA_INSTALL_CARD_ID).toBe("device-pwa-install-card");
  });
});
