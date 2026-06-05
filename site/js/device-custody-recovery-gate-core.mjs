/**
 * Recovery mandatory for device_unlock create (WS-CUSTODY G-C2 · K13).
 * @see docs/CUSTODY_EASY_MODE.md § Recovery is the product
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  resolveEntryCustodyMode,
} from "./device-custody-mode-core.mjs";

/**
 * @param {string} custodyMode
 */
export function createRecoveryRequiredForCustody(custodyMode) {
  return resolveEntryCustodyMode({ custody_mode: custodyMode }) === CUSTODY_MODE_DEVICE_UNLOCK;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function sessionHasRecoveryMaterial(session) {
  if (!session || typeof session !== "object") return false;
  const priv = session.recovery_private_key_b58;
  const pub = session.recovery_public_key_b58;
  return (
    (typeof priv === "string" && !!priv.trim()) ||
    (typeof pub === "string" && !!pub.trim())
  );
}

/**
 * @param {{
 *   custodyMode: string,
 *   wantRecovery?: boolean,
 * }} input
 */
export function validateCreateRecoveryForCustody(input) {
  const { custodyMode, wantRecovery = false } = input;
  if (!createRecoveryRequiredForCustody(custodyMode)) {
    return { ok: true };
  }
  if (wantRecovery) {
    return { ok: true };
  }
  return {
    ok: false,
    error:
      "This device requires a backup. Turn on backup or choose show keys (advanced).",
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function validateDeviceUnlockSessionHasRecovery(session) {
  const mode = resolveEntryCustodyMode(session);
  if (mode !== CUSTODY_MODE_DEVICE_UNLOCK) {
    return { ok: true };
  }
  if (sessionHasRecoveryMaterial(session)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "Device unlock requires a recovery method on this card.",
  };
}
