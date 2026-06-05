/**
 * Honest beat banner on /created/ when deploy root gains season operator key.
 */

import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import {
  consumeSeasonKeyHonestBeatPending,
  readSeasonKeyHonestBeatDismissed,
  SEASON_KEY_HONEST_BEAT_DEFAULT_ROOM,
  seasonKeyHonestBeatBody,
  seasonKeyHonestBeatTitle,
  shouldShowSeasonKeyHonestBeat,
  writeSeasonKeyHonestBeatDismissed,
} from "./steward-season-key-honest-beat-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_CHANGED_EVENT,
  bindStewardActiveRoomRuntime,
  writePersistedStewardActiveRoom,
} from "./steward-active-room-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   applyRoom?: (room: string) => void;
 * }} ctx
 */
export function syncSeasonKeyHonestBeatUi(ctx) {
  const panel = document.getElementById("created-season-key-honest-beat");
  const titleEl = document.getElementById("created-season-key-honest-beat-title");
  const bodyEl = document.getElementById("created-season-key-honest-beat-body");
  const doorsBtn = document.getElementById("created-season-key-honest-beat-doors");
  const dismissBtn = document.getElementById("created-season-key-honest-beat-dismiss");
  if (!panel) return { show: false };

  const session = ctx.getSession();
  const walletEntry = findWalletEntryByProfileId(ctx.profileId);
  const dismissed = readSeasonKeyHonestBeatDismissed(ctx.profileId, sessionStorage);
  const show = shouldShowSeasonKeyHonestBeat(session, walletEntry, { dismissed });

  panel.hidden = !show;
  if (!show) return { show: false };

  if (titleEl) titleEl.textContent = seasonKeyHonestBeatTitle();
  if (bodyEl) bodyEl.textContent = seasonKeyHonestBeatBody();

  if (
    consumeSeasonKeyHonestBeatPending(ctx.profileId, sessionStorage) &&
    typeof ctx.applyRoom === "function"
  ) {
    ctx.applyRoom(SEASON_KEY_HONEST_BEAT_DEFAULT_ROOM);
  }

  const dismiss = () => {
    writeSeasonKeyHonestBeatDismissed(ctx.profileId, sessionStorage);
    panel.hidden = true;
  };

  if (dismissBtn instanceof HTMLButtonElement && !dismissBtn.dataset.bound) {
    dismissBtn.dataset.bound = "1";
    dismissBtn.addEventListener("click", dismiss);
  }

  if (doorsBtn instanceof HTMLButtonElement && !doorsBtn.dataset.bound) {
    doorsBtn.dataset.bound = "1";
    doorsBtn.addEventListener("click", () => {
      if (typeof ctx.applyRoom === "function") {
        ctx.applyRoom(STEWARD_ROOM_DOORS);
      } else {
        writePersistedStewardActiveRoom(ctx.profileId, STEWARD_ROOM_DOORS);
        bindStewardActiveRoomRuntime(ctx.profileId, STEWARD_ROOM_DOORS);
        document.dispatchEvent(
          new CustomEvent(STEWARD_ROOM_CHANGED_EVENT, {
            detail: { profileId: ctx.profileId, room: STEWARD_ROOM_DOORS },
          })
        );
      }
      dismiss();
    });
  }

  return { show: true };
}
