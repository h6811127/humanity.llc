import { describe, expect, it } from "vitest";

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  WRAPPED_OWNER_KEY_VERSION,
} from "../../site/js/device-custody-mode-core.mjs";
import {
  deviceUnlockReenrollPanelState,
  normalizeWalletEntryAfterBackupImport,
  stripStaleDeviceUnlockWrapForRecoveryImport,
  walletEntryNeedsDeviceUnlockReenroll,
} from "../../site/js/device-custody-reenroll-core.mjs";

const wrap = {
  version: WRAPPED_OWNER_KEY_VERSION,
  credential_id: "cred-old",
  prf_salt: "salt",
  iv: "iv",
  ciphertext: "cipher",
};

describe("stripStaleDeviceUnlockWrapForRecoveryImport", () => {
  it("removes stale wrap and marks re-enroll pending (K11)", () => {
    const entry = {
      profile_id: "p1",
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      wrapped_owner_key: wrap,
    };
    const next = stripStaleDeviceUnlockWrapForRecoveryImport(entry);
    expect(next.wrapped_owner_key).toBeUndefined();
    expect(next.device_unlock_reenroll_pending).toBe(true);
    expect(next.custody_mode).toBe(CUSTODY_MODE_DEVICE_UNLOCK);
  });

  it("preserves row when owner key already present", () => {
    const entry = {
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      owner_private_key_b58: "owner",
      wrapped_owner_key: wrap,
    };
    const next = stripStaleDeviceUnlockWrapForRecoveryImport(entry);
    expect(next.wrapped_owner_key).toEqual(wrap);
    expect(next.device_unlock_reenroll_pending).toBeUndefined();
  });
});

describe("normalizeWalletEntryAfterBackupImport", () => {
  it("drops stale wrap and switches to full_keys when backup restores owner key", () => {
    const entry = {
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      wrapped_owner_key: wrap,
      device_unlock_reenroll_pending: true,
    };
    const next = normalizeWalletEntryAfterBackupImport({
      ...entry,
      owner_private_key_b58: "owner-from-backup",
    });
    expect(next.wrapped_owner_key).toBeUndefined();
    expect(next.custody_mode).toBe(CUSTODY_MODE_FULL_KEYS);
    expect(next.device_unlock_reenroll_pending).toBeUndefined();
  });
});

describe("deviceUnlockReenrollPanelState", () => {
  const pendingEntry = {
    profile_id: "p1",
    custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
    recovery_private_key_b58: "rec",
    device_unlock_reenroll_pending: true,
  };

  it("offers re-enroll when owner key is in session", () => {
    const state = deviceUnlockReenrollPanelState({
      walletEntry: pendingEntry,
      session: { owner_private_key_b58: "owner" },
      webAuthnAvailable: true,
    });
    expect(state.showReenroll).toBe(true);
    expect(state.canReenroll).toBe(true);
  });

  it("blocks re-enroll until backup import (recovery only)", () => {
    const state = deviceUnlockReenrollPanelState({
      walletEntry: pendingEntry,
      session: { recovery_private_key_b58: "rec" },
      webAuthnAvailable: true,
    });
    expect(state.showReenroll).toBe(true);
    expect(state.canReenroll).toBe(false);
    expect(state.blockedReason).toBe("need_owner_backup");
  });
});

describe("walletEntryNeedsDeviceUnlockReenroll", () => {
  it("is false when valid wrap exists without pending flag", () => {
    expect(
      walletEntryNeedsDeviceUnlockReenroll({
        custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
        wrapped_owner_key: wrap,
      })
    ).toBe(false);
  });
});
