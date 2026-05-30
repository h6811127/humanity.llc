import { describe, expect, it } from "vitest";

import { walletOwnershipNotInTab } from "../../site/js/device-ownership-not-in-tab-core.mjs";

describe("walletOwnershipNotInTab (P1-2)", () => {
  it("is true when wallet has signing rows but tab does not", () => {
    expect(walletOwnershipNotInTab(1, false)).toBe(true);
  });

  it("is false when tab already has signing keys", () => {
    expect(walletOwnershipNotInTab(1, true)).toBe(false);
  });

  it("is false when wallet has no signing rows", () => {
    expect(walletOwnershipNotInTab(0, false)).toBe(false);
  });
});
