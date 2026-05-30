import { describe, expect, it } from "vitest";

import { soleSigningVouchActivateEntry } from "../../site/js/vouch-scan-sole-signing-activate-core.mjs";

describe("soleSigningVouchActivateEntry (P0b-3)", () => {
  const sole = {
    profile_id: "steward_profile",
    owner_private_key_b58: "priv",
    owner_public_key_b58: "pub",
  };

  it("returns the sole signing row when vouchee is a different profile", () => {
    expect(soleSigningVouchActivateEntry([sole], "stranger_profile")).toEqual(sole);
  });

  it("returns null when vouchee matches the sole row", () => {
    expect(soleSigningVouchActivateEntry([sole], "steward_profile")).toBeNull();
  });

  it("returns null when multiple signing rows exist", () => {
    expect(
      soleSigningVouchActivateEntry(
        [
          sole,
          {
            profile_id: "other",
            owner_private_key_b58: "priv2",
            owner_public_key_b58: "pub2",
          },
        ],
        "stranger_profile"
      )
    ).toBeNull();
  });

  it("returns null when the sole row lacks signing keys", () => {
    expect(
      soleSigningVouchActivateEntry(
        [{ profile_id: "steward_profile", scan_url: "https://example.test/c/x" }],
        "stranger_profile"
      )
    ).toBeNull();
  });
});
