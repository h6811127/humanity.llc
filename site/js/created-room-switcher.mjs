import { shouldHideRoomSwitcherForFirstSession } from "./created-first-session-containment-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import {
  STEWARD_ROOM_CHANGED_EVENT,
  STEWARD_ROOM_WEAR,
  bindStewardActiveRoomRuntime,
  getBoundStewardActiveRoom,
  isValidStewardActiveRoom,
  resolveInitialStewardActiveRoom,
  shouldShowStewardRoomSwitcher,
  stewardActiveRoomLabel,
  stewardRoomCrosshint,
  writePersistedStewardActiveRoom,
} from "./steward-active-room-core.mjs";

/**
 * @param {import("./steward-active-room-core.mjs").StewardActiveRoom} room
 */
function syncWearRoomPanels(room) {
  const printPanel = document.getElementById("created-deploy-print");
  if (!(printPanel instanceof HTMLDetailsElement)) return;
  if (room === STEWARD_ROOM_WEAR) {
    printPanel.hidden = false;
    printPanel.open = true;
  }
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown> | null | undefined} session
 * @param {import("./steward-active-room-core.mjs").StewardActiveRoom} room
 */
function syncRoomCrosshint(profileId, session, room) {
  const wrap = document.getElementById("steward-room-crosshint");
  const body = document.getElementById("steward-room-crosshint-body");
  const switchBtn = document.getElementById("steward-room-crosshint-switch");
  if (!wrap || !body || !switchBtn) return;

  const hint = stewardRoomCrosshint(room, session);
  if (!hint) {
    wrap.hidden = true;
    body.textContent = "";
    switchBtn.hidden = true;
    return;
  }

  wrap.hidden = false;
  body.textContent = hint.body;
  switchBtn.hidden = false;
  switchBtn.textContent = hint.switchLabel;
  switchBtn.dataset.switchRoom = hint.switchRoom;
}

/**
 * @param {HTMLElement} controlsRoot
 * @param {import("./steward-active-room-core.mjs").StewardActiveRoom} activeRoom
 */
function syncRoomSwitcherButtons(controlsRoot, activeRoom) {
  for (const btn of controlsRoot.querySelectorAll("[data-steward-room]")) {
    if (!(btn instanceof HTMLButtonElement)) continue;
    const room = btn.dataset.stewardRoom;
    const selected = room === activeRoom;
    btn.classList.toggle("is-active", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
  }
}

/**
 * @param {boolean} show
 * @param {string} handle
 */
function syncManagingContext(show, handle) {
  const context = document.getElementById("created-managing-context");
  const handleEl = document.getElementById("created-room-switcher-handle");
  if (context) context.hidden = !show;
  if (handleEl) {
    handleEl.textContent = handle ? `@${String(handle).replace(/^@/, "")}` : "this account";
  }
}

/**
 * Promote room switcher into Collection shell when collection flag is on.
 *
 * @param {{
 *   profileId: string;
 *   session: Record<string, unknown> | null | undefined;
 *   collectionFlagEnabled: boolean;
 * }} input
 */
export function syncCreatedCollectionRoomSwitcherPlacement(input) {
  const wrap = document.getElementById("created-room-switcher-wrap");
  const slot = document.getElementById("created-collection-room-slot");
  const addHubBody = document.querySelector("#child-object-add-hub .created-child-add-hub-body");
  if (!wrap || !slot || !addHubBody) return;

  const show = shouldShowStewardRoomSwitcher(input.session);
  const handle =
    typeof input.session?.handle === "string" && input.session.handle.trim()
      ? input.session.handle
      : "";

  if (input.collectionFlagEnabled && show) {
    if (wrap.parentElement !== slot) slot.appendChild(wrap);
    wrap.classList.add("created-room-switcher-promoted");
    wrap.hidden = false;
    syncManagingContext(true, handle);
    return;
  }

  wrap.classList.remove("created-room-switcher-promoted");
  if (wrap.parentElement !== addHubBody) {
    addHubBody.insertBefore(wrap, addHubBody.firstChild);
  }
  syncDemotedRoomSwitcherVisibility(input.profileId, show);
}

/**
 * @param {string | null | undefined} profileId
 * @param {boolean} showDemotedControls
 */
function syncDemotedRoomSwitcherVisibility(profileId, showDemotedControls) {
  const wrap = document.getElementById("created-room-switcher-wrap");
  if (!wrap) return;
  if (profileId && shouldHideRoomSwitcherForFirstSession(profileId, sessionStorage)) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = !showDemotedControls;
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   getHandle?: () => string | null;
 *   onRoomApplied?: (room: string) => void;
 * }} ctx
 */
export function initCreatedRoomSwitcher(ctx) {
  const controlsRoot = document.getElementById("created-room-switcher-wrap");
  const crosshintSwitch = document.getElementById("steward-room-crosshint-switch");
  if (!controlsRoot) return null;

  const walletEntry = ctx.profileId ? findWalletEntryByProfileId(ctx.profileId) : null;
  const session = ctx.getSession();
  const initialRoom = resolveInitialStewardActiveRoom({
    profileId: ctx.profileId,
    searchParams: new URLSearchParams(location.search),
    hash: location.hash,
    session,
    walletEntry,
  });

  /**
   * @param {import("./steward-active-room-core.mjs").StewardActiveRoom} room
   * @param {{ persist?: boolean; announce?: boolean }} [opts]
   */
  function applyRoom(room, opts = {}) {
    if (!isValidStewardActiveRoom(room)) return;
    bindStewardActiveRoomRuntime(ctx.profileId, room);
    if (opts.persist !== false) {
      writePersistedStewardActiveRoom(ctx.profileId, room);
    }
    syncRoomSwitcherButtons(controlsRoot, room);
    syncWearRoomPanels(room);
    syncRoomCrosshint(ctx.profileId, ctx.getSession(), room);
    if (opts.announce !== false) {
      document.dispatchEvent(
        new CustomEvent(STEWARD_ROOM_CHANGED_EVENT, {
          detail: { profileId: ctx.profileId, room },
        })
      );
    }
    ctx.onRoomApplied?.(room);
  }

  const show = shouldShowStewardRoomSwitcher(session);
  const handle =
    typeof ctx.getHandle === "function"
      ? ctx.getHandle()
      : typeof session?.handle === "string"
        ? session.handle
        : "";

  syncManagingContext(show, handle);
  syncDemotedRoomSwitcherVisibility(ctx.profileId, show);

  for (const btn of controlsRoot.querySelectorAll("[data-steward-room]")) {
    if (!(btn instanceof HTMLButtonElement)) continue;
    const room = btn.dataset.stewardRoom;
    if (!isValidStewardActiveRoom(room)) continue;
    btn.textContent = stewardActiveRoomLabel(room);
    btn.addEventListener("click", () => applyRoom(room));
  }

  crosshintSwitch?.addEventListener("click", () => {
    const target = crosshintSwitch.dataset.switchRoom;
    if (isValidStewardActiveRoom(target)) applyRoom(target);
  });

  bindStewardActiveRoomRuntime(ctx.profileId, initialRoom);
  if (show) {
    applyRoom(initialRoom, { persist: true, announce: false });
  }

  return {
    applyRoom,
    getActiveRoom: () => getBoundStewardActiveRoom(ctx.profileId) ?? initialRoom,
  };
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown> | null | undefined} session
 */
export function syncCreatedRoomSwitcher(profileId, session) {
  const controlsRoot = document.getElementById("created-room-switcher-wrap");
  if (!controlsRoot) return;

  const show = shouldShowStewardRoomSwitcher(session);
  const handle =
    typeof session?.handle === "string" && session.handle.trim()
      ? session.handle
      : "";

  syncManagingContext(show, handle);
  syncDemotedRoomSwitcherVisibility(profileId, show);
  if (!show) return;

  const room =
    getBoundStewardActiveRoom(profileId) ??
    resolveInitialStewardActiveRoom({
      profileId,
      session,
      walletEntry: findWalletEntryByProfileId(profileId),
    });
  bindStewardActiveRoomRuntime(profileId, room);
  syncRoomSwitcherButtons(controlsRoot, room);
  syncWearRoomPanels(room);
  syncRoomCrosshint(profileId, session, room);
}
