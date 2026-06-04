import { describe, expect, it } from "vitest";

import {
  buildSetupComprehensionCopyBundle,
  deviceUnlockActivationErrorCopy,
  setupUsesDeviceUnlockComprehension,
} from "../../site/js/device-custody-comprehension-core.mjs";
import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  WRAPPED_OWNER_KEY_VERSION,
} from "../../site/js/device-custody-mode-core.mjs";
import {
  CUSTODY_RECOVERY_DEVICE_UNLOCK_PLATFORM_SYNC,
  DEVICE_UNLOCK_WEBAUTHN_CANCELED_HINT,
  SETUP_SEATBELT_DEVICE_UNLOCK_LEAD,
} from "../../site/js/device-ownership-copy-core.mjs";

describe("device-custody-comprehension-core", () => {
  const wrap = {
    version: WRAPPED_OWNER_KEY_VERSION,
    credential_id: "c",
    prf_salt: "s",
    iv: "i",
    ciphertext: "x",
  };

  it("detects device_unlock setup context", () => {
    expect(
      setupUsesDeviceUnlockComprehension({
        walletEntry: { custody_mode: CUSTODY_MODE_DEVICE_UNLOCK, wrapped_owner_key: wrap },
      })
    ).toBe(true);
    expect(
      setupUsesDeviceUnlockComprehension({
        walletEntry: { owner_private_key_b58: "k" },
      })
    ).toBe(false);
  });

  it("builds device_unlock setup copy bundle (G-C1)", () => {
    const bundle = buildSetupComprehensionCopyBundle(true);
    expect(bundle.seatbeltLead).toBe(SETUP_SEATBELT_DEVICE_UNLOCK_LEAD);
    expect(bundle.platformSync).toBe(CUSTODY_RECOVERY_DEVICE_UNLOCK_PLATFORM_SYNC);
    expect(bundle.printHint.toLowerCase()).toContain("face id");
    expect(bundle.testLead.toLowerCase()).toContain("unlock");
  });

  it("maps WebAuthn cancel to comprehension copy", () => {
    expect(deviceUnlockActivationErrorCopy("The operation was cancelled.")).toBe(
      DEVICE_UNLOCK_WEBAUTHN_CANCELED_HINT
    );
    expect(deviceUnlockActivationErrorCopy("network error")).toBeNull();
  });
});
