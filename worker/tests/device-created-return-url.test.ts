import { describe, expect, it } from "vitest";

import { sanitizeCreatedReturnUrl } from "../../site/js/device-created-return-url-core.mjs";

describe("sanitizeCreatedReturnUrl", () => {
  it("drops homepage return targets", () => {
    expect(sanitizeCreatedReturnUrl("https://humanity.llc/")).toBeNull();
    expect(sanitizeCreatedReturnUrl("https://humanity.llc/index.html")).toBeNull();
  });

  it("keeps scan and created return targets", () => {
    expect(sanitizeCreatedReturnUrl("https://humanity.llc/c/abc?q=1")).toBe(
      "https://humanity.llc/c/abc?q=1"
    );
    expect(sanitizeCreatedReturnUrl("https://humanity.llc/created/?profile_id=x")).toBe(
      "https://humanity.llc/created/?profile_id=x"
    );
  });
});
