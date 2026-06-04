import { describe, expect, it } from "vitest";

import {
  shouldActivateWalletForCreatedPage,
  shouldAttemptCreatedBootActivation,
} from "../../site/js/created-wallet-boot-activation-core.mjs";

describe("created-wallet-boot-activation-core", () => {
  it("attempts activation when wallet row has signing material", () => {
    expect(
      shouldAttemptCreatedBootActivation({
        profile_id: "p1",
        owner_private_key_b58: "k",
      })
    ).toEqual({ attempt: true });
  });

  it("attempts activation for device_unlock wrapped rows", () => {
    expect(
      shouldAttemptCreatedBootActivation({
        profile_id: "p1",
        custody_mode: "device_unlock",
        wrapped_owner_key: {
          version: 1,
          credential_id: "c",
          prf_salt: "s",
          iv: "i",
          ciphertext: "x",
        },
      })
    ).toEqual({ attempt: true });
  });

  it("skips label-only wallet rows (K1 view-only)", () => {
    expect(
      shouldAttemptCreatedBootActivation({ profile_id: "p1", label: "My card" })
    ).toEqual({ attempt: false, reason: "no_signing_material" });
  });

  it("activates when URL profile differs from tab session (redirect_live handoff)", () => {
    expect(
      shouldActivateWalletForCreatedPage("profile_url", {
        profile_id: "profile_tab",
        owner_private_key_b58: "k",
      })
    ).toBe(true);
  });

  it("skips activation when tab session already matches URL with keys", () => {
    expect(
      shouldActivateWalletForCreatedPage("profile_a", {
        profile_id: "profile_a",
        owner_private_key_b58: "k",
      })
    ).toBe(false);
  });

  it("activates when URL profile matches but tab has no signing keys", () => {
    expect(
      shouldActivateWalletForCreatedPage("profile_a", {
        profile_id: "profile_a",
      })
    ).toBe(true);
  });
});
