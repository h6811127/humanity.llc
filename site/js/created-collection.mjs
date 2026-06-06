/**
 * /created/ Collection shelf (PR 1 commit 2).
 */

import { ownershipBackupSeatbeltSatisfied } from "./created-first-session-gate-core.mjs";
import { isCreatedCollectionFlagEnabled } from "./created-collection-flag-core.mjs";
import {
  accountStripSummary,
  collectionAddPassLabel,
  createdCollectionFocusedUrl,
  listActiveCollectionChildRows,
  listCollectionShelfRows,
} from "./created-collection-core.mjs";
import {
  CREATED_VIEW_COLLECTION,
  CREATED_VIEW_FOCUSED_OBJECT,
} from "./created-collection-route-core.mjs";
import { resolveCreatedPagePresentation } from "./created-collection-landing-core.mjs";
import { buildCreatedCollectionRowElement } from "./hub-child-object-row-render.mjs";
import { syncCreatedCollectionRoomSwitcherPlacement } from "./created-room-switcher.mjs";
import {
  STEWARD_ROOM_CHANGED_EVENT,
  getBoundStewardActiveRoom,
  stewardPresentationExtras,
} from "./steward-active-room-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { shouldShowChildObjectAddHubForRoot } from "./steward-child-object-list-policy-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   getReachabilityLine?: () => string | null;
 * }} ctx
 */
export function initCreatedCollection(ctx) {
  const root = document.getElementById("created-collection-root");
  const roomSlot = document.getElementById("created-collection-room-slot");
  const headingEl = document.getElementById("created-account-strip-heading");
  const metaEl = document.getElementById("created-account-strip-meta");
  const backupEl = document.getElementById("created-account-strip-backup");
  const listEl = document.getElementById("created-collection-list");
  const emptyEl = document.getElementById("created-collection-empty");
  const addBtn = document.getElementById("created-collection-add-btn");
  const staleBanner = document.getElementById("created-collection-stale-banner");
  const staleBackBtn = document.getElementById("created-collection-stale-back");
  const liveCockpit = document.querySelector(".created-live-cockpit");

  if (!root) return null;

  function flagEnabled() {
    return isCreatedCollectionFlagEnabled(
      new URLSearchParams(location.search),
      localStorage
    );
  }

  function resolveLanding() {
    return resolveCreatedPagePresentation({
      profileId: ctx.profileId,
      session: ctx.getSession(),
      searchParams: new URLSearchParams(location.search),
      hash: location.hash,
      storage: localStorage,
    }).landing;
  }

  function openAddHub() {
    const hub = document.getElementById("child-object-add-hub");
    if (hub instanceof HTMLDetailsElement) {
      hub.hidden = false;
      hub.open = true;
    } else if (hub instanceof HTMLElement) {
      hub.hidden = false;
    }
    hub?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearStaleObjectIdFromUrl() {
    const url = new URL(location.href);
    url.searchParams.delete("object_id");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function navigateToCollectionUrl() {
    clearStaleObjectIdFromUrl();
    sync();
  }

  function onRowActivate(objectId) {
    const url = createdCollectionFocusedUrl(
      ctx.profileId,
      objectId,
      new URLSearchParams(location.search)
    );
    location.assign(url);
  }

  function sync() {
    const enabled = flagEnabled();
    const landing = resolveLanding();
    const collectionView = landing.view === CREATED_VIEW_COLLECTION;
    const showCollection = enabled && collectionView;

    if (!enabled) {
      delete document.body.dataset.createdCollectionView;
      if (roomSlot) roomSlot.hidden = true;
      if (liveCockpit instanceof HTMLElement) liveCockpit.hidden = false;
      root.hidden = true;
      if (staleBanner) staleBanner.hidden = true;
      syncCreatedCollectionRoomSwitcherPlacement({
        profileId: ctx.profileId,
        session: ctx.getSession(),
        collectionFlagEnabled: false,
      });
      return;
    }

    document.body.dataset.createdCollectionView = landing.view;
    syncCreatedCollectionRoomSwitcherPlacement({
      profileId: ctx.profileId,
      session: ctx.getSession(),
      collectionFlagEnabled: enabled,
    });
    if (roomSlot) roomSlot.hidden = false;

    root.hidden = !showCollection;
    if (liveCockpit instanceof HTMLElement) {
      if (showCollection) {
        liveCockpit.hidden = true;
      } else if (landing.view !== CREATED_VIEW_FOCUSED_OBJECT) {
        liveCockpit.hidden = false;
      }
    }

    if (!showCollection) {
      if (staleBanner) staleBanner.hidden = true;
      return;
    }

    const activeRoom = getBoundStewardActiveRoom(ctx.profileId);
    const extras = stewardPresentationExtras(ctx.profileId, { activeRoom });
    const session = ctx.getSession();
    const walletEntry = findWalletEntryByProfileId(ctx.profileId);
    const activeRows = listActiveCollectionChildRows(localStorage, ctx.profileId);
    const shelfRows = listCollectionShelfRows(activeRows, activeRoom);
    const strip = accountStripSummary({
      handle:
        typeof session?.handle === "string"
          ? session.handle
          : typeof walletEntry?.handle === "string"
            ? walletEntry.handle
            : null,
      activeChildCount: activeRows.length,
      backupSatisfied: ownershipBackupSeatbeltSatisfied(session, walletEntry),
      reachabilityLine:
        typeof ctx.getReachabilityLine === "function"
          ? ctx.getReachabilityLine()
          : null,
    });

    if (headingEl) headingEl.textContent = strip.heading;
    if (metaEl) metaEl.textContent = strip.metaLine;
    if (backupEl) backupEl.textContent = strip.backupLine;

    if (staleBanner) {
      staleBanner.hidden = !landing.staleObjectId;
    }

    if (listEl) {
      listEl.replaceChildren(
        ...shelfRows.map((row) =>
          buildCreatedCollectionRowElement(row, { activeRoom })
        )
      );
      listEl.hidden = shelfRows.length === 0;
    }
    if (emptyEl) emptyEl.hidden = shelfRows.length > 0;

    const showAdd = shouldShowChildObjectAddHubForRoot(
      session,
      ctx.profileId,
      localStorage,
      extras
    );
    if (addBtn) {
      addBtn.hidden = !showAdd;
      addBtn.textContent = collectionAddPassLabel(activeRoom);
    }
  }

  addBtn?.addEventListener("click", openAddHub);
  staleBackBtn?.addEventListener("click", navigateToCollectionUrl);
  document.addEventListener(STEWARD_ROOM_CHANGED_EVENT, sync);
  listEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest(".created-collection-row");
    if (!(row instanceof HTMLElement)) return;
    const objectId = row.dataset.objectId?.trim();
    if (objectId) onRowActivate(objectId);
  });
  listEl?.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.classList.contains("created-collection-row")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const objectId = event.target.dataset.objectId?.trim();
    if (objectId) onRowActivate(objectId);
  });
  sync();

  return { sync, refresh: sync };
}
