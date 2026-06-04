import { describe, expect, it } from "vitest";

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  entryHasDeviceUnlockWrap,
  resolveEntryCustodyMode,
  savedControlNeedsDeviceUnlockCopy,
  savedControlNeedsDeviceUnlockReenrollCopy,
  shouldDefaultDeviceUnlockAtCreate,
  soleSavedEntryNeedsDeviceUnlock,
  soleSavedEntryNeedsDeviceUnlockReenroll,
  stripPrivateKeysForDeviceUnlockWallet,
  walletEntryCountsAsSigning,
  walletEntryNeedsDeviceUnlock,
  walletEntryNeedsDeviceUnlockReenroll,
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

  it("detects sole device_unlock card for unlock copy", () => {
    const deviceEntry = {
      profile_id: "p1",
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      wrapped_owner_key: wrap,
    };
    expect(soleSavedEntryNeedsDeviceUnlock([deviceEntry])).toBe(true);
    expect(
      soleSavedEntryNeedsDeviceUnlock([
        deviceEntry,
        { profile_id: "p2", owner_private_key_b58: "k" },
      ])
    ).toBe(false);
    expect(soleSavedEntryNeedsDeviceUnlock([{ profile_id: "p2", owner_private_key_b58: "k" }])).toBe(
      false
    );
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

  it("resolves profile-scoped device unlock copy", () => {
    const wrap = {
      version: WRAPPED_OWNER_KEY_VERSION,
      credential_id: "cred",
      prf_salt: "salt",
      iv: "iv",
      ciphertext: "cipher",
    };
    const wallet = [
      { profile_id: "a", owner_private_key_b58: "k1" },
      {
        profile_id: "b",
        custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
        wrapped_owner_key: wrap,
      },
    ];
    expect(savedControlNeedsDeviceUnlockCopy(wallet, "b")).toBe(true);
    expect(savedControlNeedsDeviceUnlockCopy(wallet, "a")).toBe(false);
    expect(savedControlNeedsDeviceUnlockCopy(wallet, "missing")).toBe(false);
    expect(savedControlNeedsDeviceUnlockCopy([wallet[1]])).toBe(true);
  });

  it("detects re-enroll pending after cross-device recovery import (C4 · K11)", () => {
    const pending = {
      profile_id: "p1",
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      recovery_private_key_b58: "rec",
      device_unlock_reenroll_pending: true,
    };
    expect(walletEntryNeedsDeviceUnlockReenroll(pending)).toBe(true);
    expect(walletEntryNeedsDeviceUnlock(pending)).toBe(false);
    expect(soleSavedEntryNeedsDeviceUnlockReenroll([pending])).toBe(true);
    expect(savedControlNeedsDeviceUnlockReenrollCopy([pending], "p1")).toBe(true);
    expect(savedControlNeedsDeviceUnlockCopy([pending], "p1")).toBe(false);
  });
});
