import {
  shouldOfferAddGameNode,
  shouldShowGameNodeAddRow,
} from "./created-child-object-game-node-core.mjs";
import { isGeneralRootWalletEntry } from "./hub-child-object-row-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";

export const GAME_SEASON_SETUP_PANEL_ID = "game-season-setup";

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldShowGameSeasonSetupPanel(session, extras = {}) {
  const walletEntry = extras.walletEntry ?? null;
  const entry = walletEntry || session;
  if (!isGeneralRootWalletEntry(entry)) return false;
  return shouldOfferAddGameNode(session, extras) || shouldShowGameNodeAddRow(session);
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
  if (panel) {
    panel.hidden = !show;
    panel.setAttribute("aria-hidden", show ? "false" : "true");
  }
  if (manageLink) manageLink.hidden = !show;
}
