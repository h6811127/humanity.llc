import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { isGeneralRootWalletEntry } from "./hub-child-object-row-core.mjs";
import { stewardPresentationExtras, STEWARD_ROOM_SEASON } from "./steward-active-room-core.mjs";
import {
  shouldOfferAddGameNodeInDefaultUi,
  shouldShowGameNodeSetupRowInDefaultUi,
} from "./steward-presentation-policy-core.mjs";

export const GAME_SEASON_SETUP_PANEL_ID = "game-season-setup";

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ walletEntry?: Record<string, unknown> | null; activeRoom?: string | null; profileId?: string }} [extras]
 */
export function shouldShowGameSeasonSetupPanel(session, extras = {}) {
  const walletEntry = extras.walletEntry ?? null;
  const entry = walletEntry || session;
  if (!isGeneralRootWalletEntry(entry)) return false;
  const presentation = stewardPresentationExtras(extras.profileId || "", {
    activeRoom: extras.activeRoom,
    walletEntry,
  });
  if (presentation.activeRoom !== STEWARD_ROOM_SEASON) return false;
  const view = walletEntry ? { ...(session || {}), ...walletEntry } : session;
  return (
    shouldOfferAddGameNodeInDefaultUi(view, presentation) ||
    shouldShowGameNodeSetupRowInDefaultUi(view, presentation)
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} [profileId]
 */
export function syncGameSeasonSetupPanel(session, profileId = "") {
  const panel = document.getElementById(GAME_SEASON_SETUP_PANEL_ID);
  const manageLink = document.getElementById("child-object-game-node-manage-link");
  const walletEntry = profileId ? findWalletEntryByProfileId(profileId) : null;
  const show = shouldShowGameSeasonSetupPanel(session, { walletEntry, profileId });
  if (panel) {
    panel.hidden = !show;
    panel.setAttribute("aria-hidden", show ? "false" : "true");
  }
  if (manageLink) manageLink.hidden = !show;
}
