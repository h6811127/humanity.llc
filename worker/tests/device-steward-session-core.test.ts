import { describe, expect, it } from "vitest";

import {
  generateStewardAccountId,
  isValidStewardAccountId,
  stewardAccountIdForLink,
} from "../../site/js/device-steward-session-core.mjs";

describe("steward account id for link", () => {
  it("generateStewardAccountId matches acc_ pattern", () => {
    expect(isValidStewardAccountId(generateStewardAccountId())).toBe(true);
  });

  it("stewardAccountIdForLink prefers checkout return id", () => {
    expect(
      stewardAccountIdForLink("acc_CheckoutReturn99", null)
    ).toBe("acc_CheckoutReturn99");
  });

  it("stewardAccountIdForLink mints when no pending id", () => {
    const id = stewardAccountIdForLink(null, null);
    expect(isValidStewardAccountId(id)).toBe(true);
  });
});
