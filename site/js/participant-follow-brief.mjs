/**
 * Participant L3 — brief binder (slice #2).
 * Thin, device-initiated: fetch the public snapshot for each followed season and splice
 * up to 3 lines into the "My networks" shelf. No background polling, no upload, no
 * scan-analytics. The fetch happens only when the shelf renders, exactly like the map
 * board poll — WATCH-allowed per docs/LAYER3_PERSONAL_AGENCY.md § Watching without
 * scan analytics ("Poll season snapshot for followed networks").
 */
import { seasonSnapshotUrl } from "./city-game-map-snapshot-core.mjs";
import { buildFollowBriefsHtml } from "./participant-follow-brief-core.mjs";

/**
 * @param {string} seasonId
 * @param {string} origin
 */
async function fetchSeasonSnapshot(seasonId, origin) {
  const url = seasonSnapshotUrl(seasonId, origin);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch snapshots for followed networks (parallel, best-effort).
 * @param {Array<{ season_id: string; title?: string | null; rules_path?: string | null }>} follows
 * @param {string} [origin]
 * @returns {Promise<Array<{ row: { season_id: string; title?: string | null; rules_path?: string | null }; snapshot: Record<string, unknown> | null }>>}
 */
export async function fetchFollowBriefs(follows, origin = "") {
  if (!Array.isArray(follows) || !follows.length) return [];
  const base =
    origin.trim() ||
    (typeof globalThis !== "undefined" && globalThis.location?.origin
      ? globalThis.location.origin
      : "https://humanity.llc");
  const rows = follows.filter((row) => row && String(row.season_id ?? "").trim());
  const results = await Promise.all(
    rows.map(async (row) => ({
      row,
      snapshot: await fetchSeasonSnapshot(row.season_id, base),
    }))
  );
  return results;
}

/**
 * Render briefing tiles into the shelf (inside the existing "My networks" wrap).
 * Mutates the passed mount only; safe to call even when no follows (no-op).
 * @param {HTMLElement} shelf
 * @param {Array<{ row: { season_id: string; title?: string | null; rules_path?: string | null }; snapshot: Record<string, unknown> | null }>} checks
 */
export function renderParticipantBriefs(shelf, checks) {
  if (!(shelf instanceof HTMLElement)) return;
  const html = buildFollowBriefsHtml(checks);
  if (!html) return;
  const wrap = shelf.querySelector(".participant-follow-shelf-wrap") ?? shelf;
  const container = document.createElement("div");
  container.className = "participant-brief-mount";
  container.innerHTML = html;
  wrap.appendChild(container);
}

/**
 * Boot the brief on a shelf that already rendered "My networks".
 * @param {HTMLElement} shelf
 * @param {Array<{ season_id: string; title?: string | null; rules_path?: string | null }>} follows
 */
export async function bootParticipantBriefs(shelf, follows) {
  if (!(shelf instanceof HTMLElement) || !Array.isArray(follows) || !follows.length) return;
  const checks = await fetchFollowBriefs(follows);
  renderParticipantBriefs(shelf, checks);
}