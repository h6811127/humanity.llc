import { describe, expect, it } from "vitest";

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
} from "../../site/js/device-custody-mode-core.mjs";
import {
  createCustodyModeHintForKey,
  createCustodyModePanelState,
} from "../../site/js/device-custody-create-core.mjs";
import {
  CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT,
  CREATE_CUSTODY_ORGANIZER_FULL_KEYS_HINT,
  CREATE_CUSTODY_WEBAUTHN_UNAVAILABLE_HINT,
} from "../../site/js/device-ownership-copy-core.mjs";

describe("createCustodyModePanelState", () => {
  it("defaults to device_unlock when WebAuthn is available", () => {
    const state = createCustodyModePanelState({ webAuthnAvailable: true });
    expect(state.showFieldset).toBe(true);
    expect(state.deviceUnlockSelectable).toBe(true);
    expect(state.forceFullKeysRadio).toBe(false);
    expect(state.preferDeviceRadio).toBe(true);
    expect(state.effectiveMode).toBe(CUSTODY_MODE_DEVICE_UNLOCK);
    expect(state.recoveryMandatory).toBe(true);
    expect(state.hintKey).toBe("device_unlock_default");
  });

  it("forces full_keys when WebAuthn unavailable (K12 · G-C3)", () => {
    const state = createCustodyModePanelState({
      webAuthnAvailable: false,
      selectedCustodyMode: CUSTODY_MODE_DEVICE_UNLOCK,
    });
    expect(state.deviceUnlockSelectable).toBe(false);
    expect(state.forceFullKeysRadio).toBe(true);
    expect(state.effectiveMode).toBe(CUSTODY_MODE_FULL_KEYS);
    expect(state.recoveryMandatory).toBe(false);
    expect(state.hintKey).toBe("webauthn_unavailable");
  });

  it("requires full_keys when organizer revoke is enabled", () => {
    const state = createCustodyModePanelState({
      webAuthnAvailable: true,
      organizerEnabled: true,
    });
    expect(state.deviceUnlockSelectable).toBe(false);
    expect(state.forceFullKeysRadio).toBe(true);
    expect(state.effectiveMode).toBe(CUSTODY_MODE_FULL_KEYS);
    expect(state.hintKey).toBe("organizer_requires_full_keys");
    expect(state.showOrganizerBlocksFaceIdCallout).toBe(true);
  });

  it("hides organizer Face ID callout when WebAuthn unavailable", () => {
    const state = createCustodyModePanelState({
      webAuthnAvailable: false,
      organizerEnabled: true,
    });
    expect(state.showOrganizerBlocksFaceIdCallout).toBe(false);
  });

  it("hides fieldset in ephemeral browsing", () => {
    const state = createCustodyModePanelState({
      webAuthnAvailable: true,
      ephemeralBrowsing: true,
    });
    expect(state.showFieldset).toBe(false);
    expect(state.effectiveMode).toBe(CUSTODY_MODE_FULL_KEYS);
  });

  it("honors ?custody=full_keys when device unlock is allowed", () => {
    const state = createCustodyModePanelState({
      webAuthnAvailable: true,
      urlCustodyParam: CUSTODY_MODE_FULL_KEYS,
    });
    expect(state.effectiveMode).toBe(CUSTODY_MODE_FULL_KEYS);
    expect(state.preferDeviceRadio).toBe(false);
  });
});

describe("createCustodyModeHintForKey", () => {
  it("maps hint keys to Layer 2 strings", () => {
    expect(createCustodyModeHintForKey("webauthn_unavailable")).toBe(
      CREATE_CUSTODY_WEBAUTHN_UNAVAILABLE_HINT
    );
    expect(createCustodyModeHintForKey("organizer_requires_full_keys")).toBe(
      CREATE_CUSTODY_ORGANIZER_FULL_KEYS_HINT
    );
    expect(createCustodyModeHintForKey("device_unlock_default")).toBe(
      CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT
    );
  });
});
