/**
 * Pure coachmark policy (no DOM / wallet graph).
 * @see docs/DEVICE_HUB_INTRO_COACHMARK.md
 */

export const HUB_INTRO_STORAGE_KEY = "hc_device_hub_intro_dismissed";
export const HUB_INTRO_SEEN_STORAGE_KEY = "hc_device_hub_intro_seen";

/**
 * @param {{
 *   hasHub?: boolean,
 *   isWalletPage?: boolean,
 *   statusLoadError?: boolean,
 *   hubSheetOpen?: boolean,
 *   inboxOpen?: boolean,
 *   dismissed?: boolean,
 *   seen?: boolean,
 * }} ctx
 */
export function shouldShowHubIntro(ctx) {
  if (!ctx.hasHub || ctx.isWalletPage || ctx.statusLoadError) return false;
  if (ctx.dismissed ?? false) return false;
  if (ctx.seen ?? false) return false;
  if (ctx.hubSheetOpen || ctx.inboxOpen) return false;
  return true;
}
