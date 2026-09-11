/**
 * Participant L3 — pin binder (slice #3).
 * Thin: renders a "Pin this board" control on a single-season play page and the
 * device-local pinned boards list. Pins never upload, never hold keys, never poll.
 */
import { seasonBoardPath } from "./city-game-season-path-shared.mjs";
import {
  buildPinnedBoardsHtml,
  isPinned,
  loadPins,
  pinBoard,
  unpinBoard,
} from "./participant-pin-core.mjs";

export const PARTICIPANT_PINS_SHELF_ID = "participant-pins-shelf";

let currentSeason = null;

function clearPinMounts(shelf) {
  for (const cls of [".participant-pin-cta", ".participant-pins-mount"]) {
    const nodes = shelf.querySelectorAll(cls);
    for (const node of nodes) node.remove();
  }
}

function renderPinSection(shelf, season) {
  if (!(shelf instanceof HTMLElement) || !season) return;
  const boardPath = seasonBoardPath(season.rules_path);
  const title = String(season.title ?? season.season_id ?? "this board").trim();
  if (!boardPath || isPinned(boardPath)) return;
  const mount = document.createElement("section");
  mount.className = "participant-pin-cta idea-section";
  mount.setAttribute("aria-labelledby", "participant-pin-cta-heading");
  const id = `${PARTICIPANT_PINS_SHELF_ID}-cta`;
  mount.innerHTML = `<h2 class="group-label" id="${id}">Pin this board</h2>
  <button type="button" class="participant-pin-btn participant-pin-btn--primary" data-participant-pin="${boardPath}" aria-label="Pin ${title} on this device">${title}</button>
  <p class="form-hint participant-pins-empty">Pins are bookmarks stored only on this device — no account, no upload.</p>`;
  shelf.appendChild(mount);
}

function renderPinnedBoards(shelf) {
  if (!(shelf instanceof HTMLElement)) return;
  const mount = document.createElement("div");
  mount.className = "participant-pins-mount";
  mount.innerHTML = buildPinnedBoardsHtml(loadPins());
  shelf.appendChild(mount);
}

export function renderPins(shelf, season) {
  if (!(shelf instanceof HTMLElement)) return;
  clearPinMounts(shelf);
  if (season) currentSeason = season;
  renderPinSection(shelf, currentSeason);
  renderPinnedBoards(shelf);
}

/**
 * @param {HTMLElement} shelf
 */
export function bindPinButtons(shelf) {
  if (!(shelf instanceof HTMLElement)) return;
  shelf.addEventListener("click", (ev) => {
    const btn = ev.target instanceof HTMLElement
      ? ev.target.closest("[data-participant-pin], [data-participant-unpin]")
      : null;
    if (!btn) return;
    const boardUrl = btn.dataset.participantPin || btn.dataset.participantUnpin;
    if (!boardUrl) return;
    if (btn.dataset.participantPin && !isPinned(boardUrl)) {
      pinBoard({ board_url: boardUrl });
    } else if (btn.dataset.participantUnpin) {
      unpinBoard(boardUrl);
    }
    renderPins(shelf);
    ev.preventDefault();
  });
}

/**
 * Boot the pin section on a single-season play page shelf.
 * @param {HTMLElement} shelf
 * @param {{ season_id: string; title?: string; rules_path?: string | null } | null | undefined} season
 */
export function bootParticipantPins(shelf, season) {
  if (!(shelf instanceof HTMLElement) || !season) return;
  renderPins(shelf, season);
  bindPinButtons(shelf);
}