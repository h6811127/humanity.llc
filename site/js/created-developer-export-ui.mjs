/**
 * Developer export panel on /created/ Manage: owner pubkey preview (D8).
 */
import { ownerPubkeyPreviewState } from "./created-developer-export-core.mjs";

/**
 * @param {{
 *   getSession: () => Record<string, unknown> | null,
 * }} opts
 */
export function initCreatedDeveloperExportUi(opts) {
  const block = document.getElementById("owner-pubkey-preview-block");
  const display = document.getElementById("owner-pubkey-display");
  const copyBtn = document.getElementById("copy-owner-pubkey");

  function refreshPubkeyPreview() {
    const { show, publicKeyBase58 } = ownerPubkeyPreviewState(opts.getSession());
    if (block) block.hidden = !show;
    if (display) display.textContent = publicKeyBase58;
  }

  copyBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = display?.textContent?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy public key";
      }, 2000);
    } catch {
      copyBtn.textContent = "Select and copy manually";
    }
  });

  refreshPubkeyPreview();
  return { refreshPubkeyPreview };
}
