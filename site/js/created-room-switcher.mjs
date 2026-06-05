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
 * @param {HTMLElement} wrap
 * @param {import("./steward-active-room-core.mjs").StewardActiveRoom} activeRoom
 */
function syncRoomSwitcherButtons(wrap, activeRoom) {
  for (const btn of wrap.querySelectorAll("[data-steward-room]")) {
    if (!(btn instanceof HTMLButtonElement)) continue;
    const room = btn.dataset.stewardRoom;
    const selected = room === activeRoom;
    btn.classList.toggle("is-active", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
  }
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
  const wrap = document.getElementById("created-room-switcher-wrap");
  const handleEl = document.getElementById("created-room-switcher-handle");
  const crosshintSwitch = document.getElementById("steward-room-crosshint-switch");
  if (!wrap) return null;

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
    syncRoomSwitcherButtons(wrap, room);
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
  wrap.hidden = !show;

  const handle =
    typeof ctx.getHandle === "function"
      ? ctx.getHandle()
      : typeof session?.handle === "string"
        ? session.handle
        : "";
  if (handleEl) {
    handleEl.textContent = handle ? `@${String(handle).replace(/^@/, "")}` : "this account";
  }

  for (const btn of wrap.querySelectorAll("[data-steward-room]")) {
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
  const wrap = document.getElementById("created-room-switcher-wrap");
  if (!wrap) return;
  const show = shouldShowStewardRoomSwitcher(session);
  wrap.hidden = !show;
  if (!show) return;
  const room =
    getBoundStewardActiveRoom(profileId) ??
    resolveInitialStewardActiveRoom({
      profileId,
      session,
      walletEntry: findWalletEntryByProfileId(profileId),
    });
  bindStewardActiveRoomRuntime(profileId, room);
  syncRoomSwitcherButtons(wrap, room);
  syncRoomCrosshint(profileId, session, room);
}
