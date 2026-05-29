import { describe, expect, it } from "vitest";

import { ownerPubkeyPreviewState } from "../../site/js/created-developer-export-core.mjs";

describe("created-developer-export-core", () => {
  it("shows pubkey when owner_public_key_b58 is present", () => {
    const pub = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5eF7gH9jK1";
    expect(ownerPubkeyPreviewState({ owner_public_key_b58: pub })).toEqual({
      show: true,
      publicKeyBase58: pub,
    });
  });

  it("hides pubkey when session lacks owner public key", () => {
    expect(ownerPubkeyPreviewState({})).toEqual({
      show: false,
      publicKeyBase58: "",
    });
    expect(ownerPubkeyPreviewState(null)).toEqual({
      show: false,
      publicKeyBase58: "",
    });
  });
});
