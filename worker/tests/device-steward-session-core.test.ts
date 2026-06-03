import { describe, expect, it } from "vitest";

import {
  formatStewardLinkUserMessage,
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

describe("formatStewardLinkUserMessage", () => {
  it("explains card not found on production", () => {
    expect(formatStewardLinkUserMessage(404, "NOT_FOUND", "Card not found.")).toMatch(
      /production network/i
    );
  });

  it("explains profile already linked", () => {
    expect(
      formatStewardLinkUserMessage(
        409,
        "PROFILE_ALREADY_LINKED",
        "This card is already linked to a different steward account."
      )
    ).toContain("already linked");
  });
});
