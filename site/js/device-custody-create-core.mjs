/**
 * Create flow custody mode UI (WS-CUSTODY G-C3 · K12).
 * @see docs/CUSTODY_EASY_MODE.md · docs/KEY_LOSS_SAD_PATH_MATRIX.md K12
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  shouldDefaultDeviceUnlockAtCreate,
} from "./device-custody-mode-core.mjs";
import { createRecoveryRequiredForCustody } from "./device-custody-recovery-gate-core.mjs";
import {
  CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT,
  CREATE_CUSTODY_ORGANIZER_FULL_KEYS_HINT,
  CREATE_CUSTODY_WEBAUTHN_UNAVAILABLE_HINT,
} from "./device-ownership-copy-core.mjs";

/**
 * @param {{
 *   webAuthnAvailable?: boolean,
 *   organizerEnabled?: boolean,
 *   ephemeralBrowsing?: boolean,
 *   urlCustodyParam?: string | null,
 *   selectedCustodyMode?: string | null,
 * }} input
 */
export function createCustodyModePanelState(input) {
  const {
    webAuthnAvailable = false,
    organizerEnabled = false,
    ephemeralBrowsing = false,
    urlCustodyParam = null,
    selectedCustodyMode = null,
  } = input;

  const showFieldset = !ephemeralBrowsing;
  const deviceUnlockSelectable =
    webAuthnAvailable && !organizerEnabled && !ephemeralBrowsing;

  let effectiveMode = CUSTODY_MODE_FULL_KEYS;
  if (deviceUnlockSelectable) {
    if (urlCustodyParam === CUSTODY_MODE_FULL_KEYS) {
      effectiveMode = CUSTODY_MODE_FULL_KEYS;
    } else if (
      selectedCustodyMode === CUSTODY_MODE_FULL_KEYS ||
      selectedCustodyMode === CUSTODY_MODE_DEVICE_UNLOCK
    ) {
      effectiveMode = selectedCustodyMode;
    } else {
      effectiveMode = CUSTODY_MODE_DEVICE_UNLOCK;
    }
  }

  const preferDeviceRadio =
    deviceUnlockSelectable && urlCustodyParam !== CUSTODY_MODE_FULL_KEYS;

  const recoveryMandatory = createRecoveryRequiredForCustody(effectiveMode);

  return {
    showFieldset,
    deviceUnlockSelectable,
    forceFullKeysRadio: !deviceUnlockSelectable,
    preferDeviceRadio,
    effectiveMode,
    recoveryMandatory,
    showOrganizerBlocksFaceIdCallout:
      webAuthnAvailable && organizerEnabled && !ephemeralBrowsing,
    hintKey: !webAuthnAvailable
      ? "webauthn_unavailable"
      : organizerEnabled
        ? "organizer_requires_full_keys"
        : "device_unlock_default",
  };
}

/**
 * @param {"webauthn_unavailable" | "organizer_requires_full_keys" | "device_unlock_default"} hintKey
 */
export function createCustodyModeHintForKey(hintKey) {
  if (hintKey === "webauthn_unavailable") {
    return CREATE_CUSTODY_WEBAUTHN_UNAVAILABLE_HINT;
  }
  if (hintKey === "organizer_requires_full_keys") {
    return CREATE_CUSTODY_ORGANIZER_FULL_KEYS_HINT;
  }
  return CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT;
}

/**
 * Planned custody mode at submit from form + environment.
 * @param {{
 *   custodyModeFromForm: string,
 *   webAuthnAvailable?: boolean,
 *   organizerEnabled?: boolean,
 *   ephemeralBrowsing?: boolean,
 * }} input
 */
export function resolveCreateCustodyModeAtSubmit(input) {
  const useDeviceUnlock = shouldDefaultDeviceUnlockAtCreate({
    custodyMode: input.custodyModeFromForm,
    webAuthnAvailable: input.webAuthnAvailable === true,
    organizerEnabled: input.organizerEnabled === true,
    ephemeralBrowsing: input.ephemeralBrowsing === true,
  });
  return useDeviceUnlock ? CUSTODY_MODE_DEVICE_UNLOCK : CUSTODY_MODE_FULL_KEYS;
}
