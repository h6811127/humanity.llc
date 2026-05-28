/**
 * Copy and confirm text for orphan keys (removed from device, still in another tab).
 * @see docs/CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md path F
 */

/**
 * @param {string} label Card label for confirm dialog
 */
export function orphanKeysClearConfirmMessage(label) {
  const who = label?.trim() ? label.trim() : "this card";
  return (
    `Clear signing keys for ${who} in all open Humanity tabs on this browser? ` +
    "Other saved cards are unchanged."
  );
}

export const ORPHAN_KEYS_INBOX_TITLE = "Keys still open in another tab";
export const ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX =
  "For a card you removed from this device";
