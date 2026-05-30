import { describe, expect, it } from "vitest";

import { shouldShowSetupIosSafariCustodyNotice } from "../../site/js/created-setup-ios-custody-core.mjs";
import {
  SETUP_DONE_IOS_HOME_SCREEN_DETAIL,
  SETUP_DONE_IOS_HOME_SCREEN_TITLE,
  SETUP_SEATBELT_IOS_SAFARI_HINT,
} from "../../site/js/device-ownership-copy-core.mjs";

describe("shouldShowSetupIosSafariCustodyNotice (RC-3)", () => {
  it("shows on iOS Safari browser, not standalone PWA", () => {
    expect(
      shouldShowSetupIosSafariCustodyNotice({ isIosWebKit: true, standalone: false })
    ).toBe(true);
    expect(
      shouldShowSetupIosSafariCustodyNotice({ isIosWebKit: true, standalone: true })
    ).toBe(false);
    expect(
      shouldShowSetupIosSafariCustodyNotice({ isIosWebKit: false, standalone: false })
    ).toBe(false);
  });
});

describe("RC-3 setup copy", () => {
  it("exports Layer 2 iOS custody strings without signing-key jargon", () => {
    for (const line of [
      SETUP_SEATBELT_IOS_SAFARI_HINT,
      SETUP_DONE_IOS_HOME_SCREEN_TITLE,
      SETUP_DONE_IOS_HOME_SCREEN_DETAIL,
    ]) {
      expect(line.length).toBeGreaterThan(20);
      expect(line.toLowerCase()).not.toMatch(/private key|ed25519|localstorage/);
    }
    expect(SETUP_SEATBELT_IOS_SAFARI_HINT).toMatch(/seven days|7 days/i);
    expect(SETUP_DONE_IOS_HOME_SCREEN_DETAIL).toMatch(/Home Screen/i);
    expect(SETUP_DONE_IOS_HOME_SCREEN_DETAIL).toMatch(/manage your cards only/i);
  });
});
