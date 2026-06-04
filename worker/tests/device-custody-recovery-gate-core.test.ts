import { describe, expect, it } from "vitest";

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
} from "../../site/js/device-custody-mode-core.mjs";
import { resolveCreateCustodyModeAtSubmit } from "../../site/js/device-custody-create-core.mjs";
import {
  createRecoveryRequiredForCustody,
  sessionHasRecoveryMaterial,
  validateCreateRecoveryForCustody,
  validateDeviceUnlockSessionHasRecovery,
} from "../../site/js/device-custody-recovery-gate-core.mjs";

describe("device-custody-recovery-gate-core", () => {
  it("requires recovery only for device_unlock at create", () => {
    expect(createRecoveryRequiredForCustody(CUSTODY_MODE_DEVICE_UNLOCK)).toBe(true);
    expect(createRecoveryRequiredForCustody(CUSTODY_MODE_FULL_KEYS)).toBe(false);
  });

  it("rejects device_unlock create without wantRecovery (K13)", () => {
    expect(
      validateCreateRecoveryForCustody({
        custodyMode: CUSTODY_MODE_DEVICE_UNLOCK,
        wantRecovery: false,
      }).ok
    ).toBe(false);
    expect(
      validateCreateRecoveryForCustody({
        custodyMode: CUSTODY_MODE_DEVICE_UNLOCK,
        wantRecovery: true,
      }).ok
    ).toBe(true);
    expect(
      validateCreateRecoveryForCustody({
        custodyMode: CUSTODY_MODE_FULL_KEYS,
        wantRecovery: false,
      }).ok
    ).toBe(true);
  });

  it("validates device_unlock session carries recovery material", () => {
    expect(
      validateDeviceUnlockSessionHasRecovery({
        custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
        recovery_private_key_b58: "rec",
      }).ok
    ).toBe(true);
    expect(
      validateDeviceUnlockSessionHasRecovery({
        custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
      }).ok
    ).toBe(false);
    expect(
      validateDeviceUnlockSessionHasRecovery({
        custody_mode: CUSTODY_MODE_FULL_KEYS,
      }).ok
    ).toBe(true);
  });

  it("detects recovery material on session or wallet row", () => {
    expect(sessionHasRecoveryMaterial({ recovery_public_key_b58: "pub" })).toBe(true);
    expect(sessionHasRecoveryMaterial({})).toBe(false);
  });
});

describe("resolveCreateCustodyModeAtSubmit", () => {
  it("maps form + WebAuthn to planned custody mode", () => {
    expect(
      resolveCreateCustodyModeAtSubmit({
        custodyModeFromForm: CUSTODY_MODE_DEVICE_UNLOCK,
        webAuthnAvailable: true,
      })
    ).toBe(CUSTODY_MODE_DEVICE_UNLOCK);
    expect(
      resolveCreateCustodyModeAtSubmit({
        custodyModeFromForm: CUSTODY_MODE_DEVICE_UNLOCK,
        webAuthnAvailable: false,
      })
    ).toBe(CUSTODY_MODE_FULL_KEYS);
  });
});
