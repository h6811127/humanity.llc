import { describe, expect, it } from "vitest";

import { resolveCreatedMode } from "../../site/js/created-mode.mjs";
import { stewardFocusKeyFromHash } from "../../site/js/created-tabs.mjs";

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

  it("returns setup for fresh create or keys not saved on device", () => {
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
        walletSaved: false,
      })
    ).toBe("setup");
  });

  it("stewardFocusKeyFromHash recognizes hub deep-link hashes", () => {
    expect(stewardFocusKeyFromHash("#revoke")).toBe("revoke");
    expect(stewardFocusKeyFromHash("#setup-qr")).toBe(null);
  });

  it("returns control for returning steward (saved on device, not fresh)", () => {
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        freshParam: false,
        setupDone: false,
        walletSaved: true,
      })
    ).toBe("control");
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
