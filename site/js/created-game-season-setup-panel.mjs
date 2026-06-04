import { shouldOfferAddGameNode } from "./created-child-object-game-node-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";

export const GAME_SEASON_SETUP_PANEL_ID = "game-season-setup";

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldShowGameSeasonSetupPanel(session, extras = {}) {
  return shouldOfferAddGameNode(session, extras);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} [profileId]
 */
export function syncGameSeasonSetupPanel(session, profileId = "") {
  const panel = document.getElementById(GAME_SEASON_SETUP_PANEL_ID);
  const manageLink = document.getElementById("child-object-game-node-manage-link");
  const walletEntry = profileId ? findWalletEntryByProfileId(profileId) : null;
  const extras = walletEntry ? { walletEntry } : {};
  const show = shouldShowGameSeasonSetupPanel(session, extras);
  if (panel) panel.hidden = !show;
  if (manageLink) manageLink.hidden = !show;
}
