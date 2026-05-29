/**
 * Optional unlock gate before loading saved ownership into a tab (D6).
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md · docs/VOUCH_READY_KEYS_DESIGN.md option E
 */

import { isSignLockEnabled, isSignUnlocked } from "./vouch-sign-lock.mjs";

/** @param {string | null | undefined} profileId */
export function controlActivationRequiresUnlock(profileId) {
  if (!profileId) return false;
  return isSignLockEnabled(profileId) && !isSignUnlocked(profileId);
}

/** @param {string | null | undefined} profileId */
export function controlActivationGateState(profileId) {
  const requiresUnlock = controlActivationRequiresUnlock(profileId);
  return { requiresUnlock, unlocked: !requiresUnlock };
}
