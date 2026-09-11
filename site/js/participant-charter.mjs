/**
 * Participant L3 — charter binder (slice #4): "what this device remembers".
 * Thin: renders the honest inventory of the device-local participant stores
 * (follows + pins counts) into the play-page shelf, and re-renders whenever
 * either store changes so the counts can never go stale.
 *
 * The charter is a trust disclosure — never "your progress", never "scanned you",
 * never implied tracking. No upload, no polling, no keys. Counts come straight
 * from loadFollows()/loadPins() (same stores the shelf mutates).
 *
 * @see docs/LAYER3_PERSONAL_AGENCY.md § Smallest safe product surfaces → Participant (minimal) → 4. Charter
 */
import { loadFollows } from "./participant-follow-core.mjs";
import { loadPins } from "./participant-pin-core.mjs";
import { buildParticipantCharterHtml } from "./participant-charter-core.mjs";

export const PARTICIPANT_CHARTER_MOUNT_CLASS = "participant-charter-mount";

/**
 * Storage cores dispatch these on every follow/unfollow + pin/unpin.
 * @see participant-follow-core.mjs saveFollows · participant-pin-core.mjs savePins
 */
const PARTICIPANT_CHARTER_CHANGE_EVENTS = [
  "hc-participant-follows-changed",
  "hc-participant-pins-changed",
];

/**
 * Re-render the charter inside the shelf (idempotent — clears the previous mount).
 * @param {HTMLElement} shelf
 */
export function renderParticipantCharter(shelf) {
  if (!(shelf instanceof HTMLElement)) return;
  const wrap = shelf.querySelector(".participant-follow-shelf-wrap") ?? shelf;
  const oldMounts = wrap.querySelectorAll(`.${PARTICIPANT_CHARTER_MOUNT_CLASS}`);
  for (const node of oldMounts) node.remove();
  const mount = document.createElement("div");
  mount.className = PARTICIPANT_CHARTER_MOUNT_CLASS;
  mount.innerHTML = buildParticipantCharterHtml({
    followsCount: loadFollows().length,
    pinsCount: loadPins().length,
  });
  wrap.appendChild(mount);
}

let watcherBound = false;

/**
 * Boot the charter: render now, then keep counts honest on every store change.
 * The watcher is bound at most once per page; the captured shelf is the sole
 * play-page mount (the same one the follow shelf renders into).
 * @param {HTMLElement} shelf
 */
export function bootParticipantCharter(shelf) {
  if (!(shelf instanceof HTMLElement)) return;
  renderParticipantCharter(shelf);
  if (watcherBound || typeof window === "undefined") return;
  watcherBound = true;
  for (const eventName of PARTICIPANT_CHARTER_CHANGE_EVENTS) {
    window.addEventListener(eventName, () => renderParticipantCharter(shelf));
  }
}