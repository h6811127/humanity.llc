import { describe, expect, it } from "vitest";

import {
  buildFullKeysWalletEntryFromMigration,
  custodyMigrationPanelState,
  fullKeysMigrationAllowed,
  sessionHasOwnerSigningKey,
} from "../../site/js/device-custody-migrate-core.mjs";
import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  WRAPPED_OWNER_KEY_VERSION,
} from "../../site/js/device-custody-mode-core.mjs";

describe("device-custody-migrate-core", () => {
  const wrap = {
    version: WRAPPED_OWNER_KEY_VERSION,
    credential_id: "cred",
    prf_salt: "salt",
    iv: "iv",
    ciphertext: "cipher",
  };

  const deviceUnlockEntry = {
    profile_id: "p1",
    custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
    wrapped_owner_key: wrap,
    owner_public_key_b58: "pub",
  };

  it("detects session signing key", () => {
    expect(sessionHasOwnerSigningKey({ owner_private_key_b58: "k" })).toBe(true);
    expect(sessionHasOwnerSigningKey({})).toBe(false);
  });

  it("offers migration when unlocked session matches saved row", () => {
    const state = custodyMigrationPanelState({
      walletEntry: deviceUnlockEntry,
      session: { owner_private_key_b58: "secret" },
      webAuthnAvailable: true,
    });
    expect(state.showPanel).toBe(true);
    expect(state.canMigrateToFullKeys).toBe(true);
    expect(state.canMigrateToDeviceUnlock).toBe(false);
  });

  it("blocks full_keys migration without unlock", () => {
    const state = custodyMigrationPanelState({
      walletEntry: deviceUnlockEntry,
      session: {},
      webAuthnAvailable: true,
    });
    expect(state.canMigrateToFullKeys).toBe(false);
    expect(state.blockedReason).toBe("unlock_required");
  });

  it("builds full_keys wallet row without wrap", () => {
    const result = buildFullKeysWalletEntryFromMigration(deviceUnlockEntry, {
      owner_private_key_b58: "secret",
    });
    expect(result.ok).toBe(true);
    expect(result.entry.owner_private_key_b58).toBe("secret");
    expect(result.entry.wrapped_owner_key).toBeUndefined();
    expect(result.entry.custody_mode).toBe("full_keys");
  });

  it("requires recovery seatbelt before full_keys migration", () => {
    expect(
      fullKeysMigrationAllowed({
        session: {},
        walletEntry: deviceUnlockEntry,
        recoveryAcknowledged: false,
      }).ok
    ).toBe(false);
    expect(
      fullKeysMigrationAllowed({
        session: { recovery_key_acknowledged: true },
        walletEntry: deviceUnlockEntry,
      }).ok
    ).toBe(true);
    expect(
      fullKeysMigrationAllowed({
        session: {},
        walletEntry: deviceUnlockEntry,
        recoveryAcknowledged: true,
      }).ok
    ).toBe(true);
  });

  it("shows re-enroll panel when stale wrap stripped (C4)", () => {
    const pendingEntry = {
      profile_id: "p1",
      custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      recovery_private_key_b58: "rec",
      device_unlock_reenroll_pending: true,
    };
    const state = custodyMigrationPanelState({
      walletEntry: pendingEntry,
      session: { owner_private_key_b58: "secret" },
      webAuthnAvailable: true,
    });
    expect(state.showReenrollDeviceUnlock).toBe(true);
    expect(state.canReenrollDeviceUnlock).toBe(true);
    expect(state.canMigrateToFullKeys).toBe(false);
  });
});
