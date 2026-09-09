/**
 * Participant L3 — local season follow binding (thin shelf on network/play surfaces).
 * @see docs/LAYER3_PERSONAL_AGENCY.md § Smallest safe product surfaces → Participant (minimal)
 * Placement: network/play surfaces only — not full steward hub chrome.
 */
import {
  CITY_GAME_SEASONS_INDEX_URL,
  resolvePlayPageSeason,
} from "./city-game-season-resolve.mjs";
import {
  buildFollowShelfHtml,
  followableSeasonsFromIndex,
  followSeason,
  isFollowed,
  loadFollows,
  unfollowSeason,
} from "./participant-follow-core.mjs";

/**
 * Mount id used by both /play/season/ and /play/cedar-rapids/.
 */
export const PARTICIPANT_FOLLOW_SHELF_MOUNT_ID = "participant-follow-shelf";

/**
 * @param {HTMLElement} shelf
 * @param {Array<{ season_id: string; title: string|null; rules_path: string|null; json_url: string|null }>} rows
 * @param {Array<{ season_id: string; title: string; rules_path: string|null }>} follows
 * @param {boolean} [onSeasonPage]
 */
export function renderFollowShelf(shelf, rows, follows, onSeasonPage = false) {
  if (!(shelf instanceof HTMLElement)) return;

  // Step 1: a Follow button next to every followable network.
  const followButtons = rows
    .filter((row) => !isFollowed(row.season_id, follows))
    .map(
      (row) =>
        `<li class="participant-follow-row participant-follow-row--cta">
  <span class="participant-follow-title">${row.title || row.season_id}</span>
  <button type="button" class="participant-follow-btn" data-participant-follow="${row.season_id}" aria-label="Follow ${row.title || row.season_id} on this device">Follow</button>
</li>`
    )
    .join("");

  // Step 2: the "My networks" shelf — followed networks, disclosed as device-local.
  const shelfHtml = buildFollowShelfHtml(follows);
  shelf.innerHTML = `<div class="participant-follow-shelf-wrap">
  ${followButtons ? `<section class="participant-follow-cta idea-section" aria-labelledby="participant-follow-cta-heading">
    <h2 class="group-label" id="participant-follow-cta-heading">Follow networks on this device</h2>
    <p class="form-hint participant-follow-cta-intro">Following stores the network here on your device. No account, no upload, no scan tracking. You can open the board any time; "Following" means you'll see it under My networks.</p>
    <ul class="participant-follow-cta-list">${followButtons}</ul>
  </section>` : ""}
  ${shelfHtml}
</div>`;
}

/**
 * @param {HTMLElement} shelf
 * @param {HTMLElement} root
 * @param {Array<{ season_id: string; title: string|null; rules_path: string|null; json_url: string|null }>} rows
 */
export function bindFollowButtons(shelf, root, rows) {
  if (!(shelf instanceof HTMLElement)) return;
  const onSeasonPage = root === document ? location.pathname.startsWith("/play/") : false;

  const onToggle = () => {
    const follows = loadFollows();
    const currentPageSeasonId =
      rows.length === 1 && rows[0].season_id ? rows[0].season_id : null;
    renderFollowShelf(shelf, rows, follows, onSeasonPage);
    // Keep the current page's season discoverable even after re-render.
    if (currentPageSeasonId) {
      const row = rows.find((r) => r.season_id === currentPageSeasonId);
      if (row && !isFollowed(currentPageSeasonId, loadFollows())) {
        shelf.querySelectorAll("[data-participant-follow]").forEach((btn) => {
          if (btn.dataset.participantFollow === currentPageSeasonId) {
            btn.setAttribute("aria-label", `Follow ${row.title || currentPageSeasonId} on this device`);
          }
        });
      }
    }
  };

  shelf.addEventListener("click", (ev) => {
    const btn = ev.target instanceof HTMLElement ? ev.target.closest("[data-participant-follow], [data-participant-unfollow]") : null;
    if (!btn) return;
    const seasonId = btn.dataset.participantFollow || btn.dataset.participantUnfollow;
    if (!seasonId) return;
    const row = rows.find((r) => r.season_id === seasonId);
    if (btn.dataset.participantFollow && !isFollowed(seasonId)) {
      if (row) followSeason(row);
    } else if (btn.dataset.participantUnfollow) {
      unfollowSeason(seasonId);
    }
    onToggle();
    ev.preventDefault();
  });
}

/**
 * Boot the participant follow shelf on a play/network page.
 * @param {HTMLElement} shelf
 * @param {{ resolveSeason?: boolean }} [opts]
 */
export async function bootParticipantFollowShelf(shelf, opts = {}) {
  if (!(shelf instanceof HTMLElement)) return;

  const follows = loadFollows();

  // Fetch the seasons index once (device reads; not an operator round-trip for the follow itself).
  let rows = [];
  try {
    const res = await fetch(CITY_GAME_SEASONS_INDEX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`season index fetch ${res.status}`);
    const index = await res.json();
    rows = followableSeasonsFromIndex(index);
  } catch (err) {
    console.warn("[participant-follow]", err);
  }

  // On a single network page (e.g. /play/cedar-rapids/), make sure the current season is
  // followable even if it isn't in the index (still follow by its resolved season_id).
  if (opts.resolveSeason) {
    try {
      const resolved = await resolvePlayPageSeason();
      if (resolved.seasonId && !rows.some((r) => r.season_id === resolved.seasonId)) {
        rows.push({
          season_id: resolved.seasonId,
          title: resolved.title,
          rules_path: resolved.rulesPath,
          json_url: resolved.jsonUrl,
        });
      }
    } catch {
      /* index already loaded what it could */
    }
  }

  renderFollowShelf(shelf, rows, follows, opts.resolveSeason === true);
  bindFollowButtons(shelf, document, rows);
}

// Auto-boot when the mount exists (leaf module — safe to run on pages that have it).
const mount = document.getElementById(PARTICIPANT_FOLLOW_SHELF_MOUNT_ID);
if (mount instanceof HTMLElement) {
  const onSeasonPage = location.pathname !== "/play/season/";
  bootParticipantFollowShelf(mount, { resolveSeason: onSeasonPage });
}