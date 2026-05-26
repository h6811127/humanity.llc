import { describe, expect, it } from "vitest";

import { resolveCreatedMode } from "../../site/js/created-mode.mjs";

describe("resolveCreatedMode", () => {
  it("returns view without profile or keys", () => {
    expect(
      resolveCreatedMode({
        profileId: null,
        hasSigningKeys: false,
      })
    ).toBe("view");
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: false,
      })
    ).toBe("view");
  });

  it("returns setup for fresh create or incomplete setup", () => {
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        freshParam: true,
        setupDone: true,
        walletSaved: true,
      })
    ).toBe("setup");
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        setupDone: false,
        walletSaved: true,
      })
    ).toBe("setup");
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        setupDone: true,
        walletSaved: false,
      })
    ).toBe("setup");
  });

  it("returns control when keys saved and setup complete", () => {
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        freshParam: false,
        setupDone: true,
        walletSaved: true,
      })
    ).toBe("control");
  });
});
