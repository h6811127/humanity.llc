import { describe, expect, it } from "vitest";

import {
  shouldShowWalletOwnershipNotInTabHint,
  shouldShowWalletTabHintCrossTabChrome,
} from "../../site/js/wallet-tab-hint-chrome-core.mjs";

describe("shouldShowWalletTabHintCrossTabChrome", () => {
  it("hides wallet tab hint when shell inbox badge is present", () => {
    expect(shouldShowWalletTabHintCrossTabChrome(true, 0, 1)).toBe(false);
    expect(shouldShowWalletTabHintCrossTabChrome(true, 1, 0)).toBe(false);
  });

  it("shows wallet tab hint on legacy pages without shell badge", () => {
    expect(shouldShowWalletTabHintCrossTabChrome(false, 0, 1)).toBe(true);
    expect(shouldShowWalletTabHintCrossTabChrome(false, 1, 0)).toBe(true);
  });

  it("hides when there is no cross-tab or orphan signal", () => {
    expect(shouldShowWalletTabHintCrossTabChrome(false, 0, 0)).toBe(false);
    expect(shouldShowWalletTabHintCrossTabChrome(true, 0, 0)).toBe(false);
  });
});

describe("shouldShowWalletOwnershipNotInTabHint", () => {
  it("shows when wallet has signing rows but tab cannot sign", () => {
    expect(shouldShowWalletOwnershipNotInTabHint(2, false, 0, 0)).toBe(true);
  });

  it("hides when tab already has keys or cross-tab/orphan takes priority", () => {
    expect(shouldShowWalletOwnershipNotInTabHint(1, true, 0, 0)).toBe(false);
    expect(shouldShowWalletOwnershipNotInTabHint(1, false, 1, 0)).toBe(false);
    expect(shouldShowWalletOwnershipNotInTabHint(1, false, 0, 1)).toBe(false);
    expect(shouldShowWalletOwnershipNotInTabHint(0, false, 0, 0)).toBe(false);
  });
});
