import { describe, expect, it } from "vitest";

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  entryHasDeviceUnlockWrap,
  resolveEntryCustodyMode,
  shouldDefaultDeviceUnlockAtCreate,
  stripPrivateKeysForDeviceUnlockWallet,
  walletEntryCountsAsSigning,
  walletEntryNeedsDeviceUnlock,
  WRAPPED_OWNER_KEY_VERSION,
} from "../../site/js/device-custody-mode-core.mjs";

describe("device-custody-mode-core", () => {
  const wrap = {
    version: WRAPPED_OWNER_KEY_VERSION,
    credential_id: "cred",
    prf_salt: "salt",
    iv: "iv",
    ciphertext: "cipher",
  };

  it("resolves custody mode from row shape", () => {
    expect(resolveEntryCustodyMode({ custody_mode: CUSTODY_MODE_FULL_KEYS })).toBe(
      CUSTODY_MODE_FULL_KEYS
    );
    expect(resolveEntryCustodyMode({ wrapped_owner_key: wrap })).toBe(
      CUSTODY_MODE_DEVICE_UNLOCK
    );
    expect(resolveEntryCustodyMode({ owner_private_key_b58: "k" })).toBe(
      CUSTODY_MODE_FULL_KEYS
    );
  });

  it("counts device_unlock wrap as signing without plaintext", () => {
    const entry = {
      profile_id: "p1",
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      wrapped_owner_key: wrap,
      has_signing_key: true,
    };
    expect(walletEntryCountsAsSigning(entry)).toBe(true);
    expect(walletEntryNeedsDeviceUnlock(entry)).toBe(true);
    expect(entryHasDeviceUnlockWrap(entry)).toBe(true);
  });

  it("strips private keys for device_unlock wallet persistence", () => {
    const stripped = stripPrivateKeysForDeviceUnlockWallet({
      profile_id: "p1",
      owner_private_key_b58: "secret",
      recovery_private_key_b58: "recovery",
      wrapped_owner_key: wrap,
    });
    expect(stripped.owner_private_key_b58).toBeUndefined();
    expect(stripped.recovery_private_key_b58).toBeUndefined();
    expect(stripped.custody_mode).toBe(CUSTODY_MODE_DEVICE_UNLOCK);
    expect(stripped.has_signing_key).toBe(true);
  });

  it("defaults device unlock when WebAuthn available", () => {
    expect(
      shouldDefaultDeviceUnlockAtCreate({
        custodyMode: CUSTODY_MODE_DEVICE_UNLOCK,
        webAuthnAvailable: true,
      })
    ).toBe(true);
    expect(
      shouldDefaultDeviceUnlockAtCreate({
        custodyMode: CUSTODY_MODE_DEVICE_UNLOCK,
        webAuthnAvailable: false,
      })
    ).toBe(false);
    expect(
      shouldDefaultDeviceUnlockAtCreate({
        custodyMode: CUSTODY_MODE_FULL_KEYS,
        webAuthnAvailable: true,
      })
    ).toBe(false);
    expect(
      shouldDefaultDeviceUnlockAtCreate({
        webAuthnAvailable: true,
        organizerEnabled: true,
      })
    ).toBe(false);
  });
});
