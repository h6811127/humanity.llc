/**
 * Create → /created/ handoff: activate saved keys in this tab before navigation.
 * Prevents "Wrong card in this tab" when URL profile differs from hc_created.
 */
import { activateWalletEntryGatedWithPinPrompt } from "./device-control-activation.mjs";

/**
 * @param {Record<string, unknown>} entry wallet row with signing material
 * @param {string} href absolute or site-relative /created/ URL
 */
export async function handoffToCreatedForWalletEntry(entry, href) {
  const result = await activateWalletEntryGatedWithPinPrompt(entry);
  if (!result.ok) {
    const msg =
      typeof result.error === "string" && result.error.trim()
        ? result.error
        : "Could not load keys for this card in this tab.";
    if (typeof window !== "undefined") window.alert(msg);
    throw new Error(msg);
  }
  window.dispatchEvent(new Event("hc-device-hub-changed"));
  location.href = href;
}
