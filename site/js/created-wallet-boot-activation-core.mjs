/**
 * Pure rules for /created/ wallet boot activation (no DOM).
 * @see site/js/created-wallet-boot-activation.mjs
 */
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs";
import { tabSessionHasSigningKeys, walletEntryHasSigningMaterial } from "./device-tab-session-core.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function shouldAttemptCreatedBootActivation(entry) {
  if (!entry) return { attempt: false, reason: "no_wallet" };
  if (
    !walletEntryHasSigningMaterial(entry) &&
    !walletEntryNeedsDeviceUnlock(entry)
  ) {
    return { attempt: false, reason: "no_signing_material" };
  }
  return { attempt: true };
}

/**
 * Whether /created/ should load wallet keys for `profile_id` before route gate.
 * @param {string | null | undefined} profileIdParam
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldActivateWalletForCreatedPage(profileIdParam, session) {
  const pid = typeof profileIdParam === "string" ? profileIdParam.trim() : "";
  if (!pid) return false;
  const sessionPid = typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
  if (sessionPid === pid && tabSessionHasSigningKeys(session)) return false;
  return true;
}
