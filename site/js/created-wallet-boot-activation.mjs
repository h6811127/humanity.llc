/**
 * /created/ boot: load saved ownership into this tab before view-only UI.
 * @see docs/CORE_PRODUCT_LOOP.md § View-only deprecation (step 1)
 */
import { activateWalletEntryGatedWithPinPrompt } from "./device-control-activation.mjs";
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { walletEntryHasSigningMaterial } from "./device-tab-session-core.mjs";

/**
 * @param {string | null | undefined} profileId
 * @returns {Promise<
 *   | { ok: true }
 *   | { skipped: true, reason: string }
 *   | { ok: false, error?: string, needsPin?: boolean }
 * >}
 */
export async function tryActivateWalletForCreatedPage(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return { skipped: true, reason: "no_profile" };

  const entry = findWalletEntryByProfileId(pid);
  if (!entry) return { skipped: true, reason: "no_wallet" };

  if (
    !walletEntryHasSigningMaterial(entry) &&
    !walletEntryNeedsDeviceUnlock(entry)
  ) {
    return { skipped: true, reason: "no_signing_material" };
  }

  const result = await activateWalletEntryGatedWithPinPrompt(entry);
  if (result.ok) {
    window.dispatchEvent(new Event("hc-device-hub-changed"));
    return { ok: true };
  }

  return {
    ok: false,
    error: typeof result.error === "string" ? result.error : undefined,
    needsPin: Boolean(result.needsPin),
  };
}
