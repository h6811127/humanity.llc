import { describe, expect, it } from "vitest";

import { walletEntryHasSigningMaterial } from "../../site/js/device-tab-session-core.mjs";
import { walletEntryNeedsDeviceUnlock } from "../../site/js/device-custody-mode-core.mjs";

/** Mirrors skip rules in created-wallet-boot-activation.mjs (no DOM). */
function shouldAttemptCreatedBootActivation(entry: Record<string, unknown> | null) {
  if (!entry) return { attempt: false, reason: "no_wallet" };
  if (
    !walletEntryHasSigningMaterial(entry) &&
    !walletEntryNeedsDeviceUnlock(entry)
  ) {
    return { attempt: false, reason: "no_signing_material" };
  }
  return { attempt: true };
}

describe("created-wallet-boot-activation", () => {
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
});
