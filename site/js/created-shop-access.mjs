/**
 * Sync room-aware shop links on /created/ control surfaces.
 */
import { createdShopAccessPresentation } from "./created-shop-access-core.mjs";
import {
  STEWARD_ROOM_CHANGED_EVENT,
  getBoundStewardActiveRoom,
} from "./steward-active-room-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getWorkspaceMode: () => string;
 * }} ctx
 */
export function initCreatedShopAccess(ctx) {
  const liveLink = document.getElementById("created-live-shop-link");
  const managePanel = document.getElementById("created-shop-order-panel");
  const manageTitle = document.getElementById("created-shop-order-summary-title");
  const manageSub = document.getElementById("created-shop-order-summary-sub");
  const manageHint = document.getElementById("created-shop-order-hint");
  const manageCustomizeLink = document.getElementById("created-shop-order-link");
  const manageBrowseLink = document.getElementById("created-shop-browse-link");

  if (
    !liveLink &&
    !managePanel &&
    !manageCustomizeLink &&
    !manageBrowseLink
  ) {
    return null;
  }

  function sync() {
    const presentation = createdShopAccessPresentation({
      activeRoom: getBoundStewardActiveRoom(ctx.profileId),
      workspaceMode: ctx.getWorkspaceMode(),
    });

    if (liveLink instanceof HTMLAnchorElement) {
      if (!presentation.live?.visible) {
        liveLink.hidden = true;
      } else {
        liveLink.hidden = false;
        liveLink.href = presentation.live.href;
        liveLink.textContent = presentation.live.label;
        liveLink.classList.toggle("btn-secondary", presentation.live.tone === "secondary");
        liveLink.classList.toggle("created-live-shop-link--subtle", presentation.live.tone === "link");
      }
    }

    if (managePanel instanceof HTMLDetailsElement) {
      managePanel.hidden = !presentation.manage?.visible;
    }
    if (presentation.manage?.visible) {
      if (manageTitle) manageTitle.textContent = presentation.manage.title;
      if (manageSub) manageSub.textContent = presentation.manage.sub;
      if (manageHint) manageHint.textContent = presentation.manage.hint;
      if (manageCustomizeLink instanceof HTMLAnchorElement) {
        manageCustomizeLink.href = presentation.manage.href;
      }
      if (manageBrowseLink instanceof HTMLAnchorElement) {
        manageBrowseLink.href = presentation.manage.browseHref;
      }
    }
  }

  document.addEventListener(STEWARD_ROOM_CHANGED_EVENT, sync);
  window.addEventListener("hc-created-live-cta-sync", sync);

  sync();
  return { sync };
}
