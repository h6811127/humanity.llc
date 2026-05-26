/**
 * Pure browser-alert helpers (testable).
 * @see docs/DEVICE_INBOX.md — background alerts v2
 */
import { inboxWalletEntryLabel } from "./device-inbox-core.mjs";

export const STORAGE_BROWSER_NOTIF = "hc_browser_notif";
export const STORAGE_PROMPT_DISMISS = "hc_browser_notif_prompt_dismissed";

/**
 * @param {{
 *   supported?: boolean,
 *   enabled?: boolean,
 *   dismissed?: boolean,
 *   pendingCount?: number,
 *   tabVisible?: boolean,
 * }} ctx
 */
export function shouldShowBrowserNotifPrompt(ctx) {
  const {
    supported = true,
    enabled = false,
    dismissed = false,
    pendingCount = 0,
    tabVisible = true,
  } = ctx;
  if (!supported) return false;
  if (enabled) return false;
  if (dismissed) return false;
  if (pendingCount <= 0) return false;
  if (!tabVisible) return false;
  return true;
}

/**
 * @param {{ entry: Record<string, unknown> }} pending
 */
export function osNotificationContentForLiveProof(pending) {
  const title = inboxWalletEntryLabel(pending.entry);
  return {
    title,
    body: "Live proof waiting · tap to sign",
  };
}
