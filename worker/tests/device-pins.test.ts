import { describe, expect, it } from "vitest";

import { createPinEntry, parseScanInput } from "../../site/js/device-pins.mjs";

describe("device pins (sad-path S5)", () => {
  it("rejects invalid pin URL input", () => {
    const parsed = parseScanInput("not-a-valid-url");
    expect(parsed).toEqual({
      error: "Use a humanity.llc scan link (/c/…?q=…) or a profile ID (20–32 characters).",
    });
    const created = createPinEntry("Test pin", "not-a-valid-url");
    expect(created).toEqual({
      error: "Use a humanity.llc scan link (/c/…?q=…) or a profile ID (20–32 characters).",
    });
  });

  it("accepts profile id pins", () => {
    const parsed = parseScanInput("7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
    expect(parsed).toMatchObject({
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      qr_id: null,
    });
  });
});
