/**
 * /created/ boot: load saved ownership into this tab before view-only UI.
 * @see docs/CORE_PRODUCT_LOOP.md § View-only deprecation (step 1)
 */
import { activateWalletEntryGatedWithPinPrompt } from "./device-control-activation.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { shouldAttemptCreatedBootActivation } from "./created-wallet-boot-activation-core.mjs";

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
  const boot = shouldAttemptCreatedBootActivation(entry);
  if (!boot.attempt) {
    return { skipped: true, reason: boot.reason ?? "no_wallet" };
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
