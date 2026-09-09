/**
 * Participant L3 — local season follow (smallest safe surface, slice #1).
 * @see docs/LAYER3_PERSONAL_AGENCY.md § Smallest safe product surfaces → Participant (minimal)
 *
 * Device-local only. This module does NOT talk to the resolver: a follow lives in
 * localStorage and never leaves this browser. No operator memory, no telemetry.
 *
 * Doc contract enforced here:
 * - RELATE — follow a season (season_id) with an explicit user action (Tier B confirm).
 * - WATCH  — followed seasons appear in "My networks" (this is your own watch set, not
 *            scan analytics; the copy says "check", never "scanned").
 * - Charter — the shelf discloses exactly what this device remembers and that it is
 *             cleared by clearing site data.
 * - Forbidden: streaks, "your progress", visit checklists, player profiles implied
 *   from follows, or any upload.
 */

/**
 * localStorage key for followed seasons (participant-only; no keys).
 * Mirrors the existing hc_* device-local convention (device-pins.mjs uses hc_device_pins).
 */
export const PARTICIPANT_FOLLOWS_STORAGE_KEY = "hc_participant_follows";

/** Max followed seasons (docs say "cap ~20" is for Pins; follows stay modest and bounded). */
export const PARTICIPANT_FOLLOW_MAX = 20;

/** @typedef {{ season_id: string; title?: string|null; json_url?: string|null; rules_path?: string|null; city?: string|null }} FollowSeasonRow */

/**
 * Parse the seasons index into followable rows.
 * Strict: only rows with a non-empty season_id may be followed. This keeps the store
 * honest — we never persist a malformed id.
 * @param {unknown} index
 * @returns {FollowSeasonRow[]}
 */
export function followableSeasonsFromIndex(index) {
  if (!index || typeof index !== "object") return [];
  const seasons = Array.isArray(index.seasons) ? index.seasons : [];
  const rows = [];
  for (const row of seasons) {
    if (!row || typeof row !== "object") continue;
    const seasonId = String(row.season_id ?? "").trim();
    if (!seasonId) continue;
    rows.push({
      season_id: seasonId,
      title: typeof row.title === "string" ? row.title : null,
      json_url: typeof row.json_url === "string" ? row.json_url : null,
      rules_path: typeof row.rules_path === "string" ? row.rules_path : null,
      city: typeof row.city === "string" ? row.city : null,
    });
  }
  return rows;
}

/**
 * @typedef {{ season_id: string; title: string; rules_path: string|null; followed_at: string }} FollowEntry
 */

function normalizeFollowEntry(seasonId, row) {
  if (!seasonId) return { error: "Season id is required." };
  return {
    season_id: seasonId,
    title:
      row?.title ||
      (row?.public_listing &&
      typeof row.public_listing === "object" &&
      "title" in row.public_listing
        ? String(row.public_listing.title ?? "")
        : "") ||
      seasonId,
    rules_path: row?.rules_path || null,
    followed_at: new Date().toISOString(),
  };
}

/**
 * Read followed seasons from device storage.
 * @param {Storage | null} [store]
 * @returns {FollowEntry[]}
 */
export function loadFollows(store = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    const raw = store?.getItem(PARTICIPANT_FOLLOWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.season_id === "string" &&
        entry.season_id
    );
  } catch {
    return [];
  }
}

/**
 * @param {FollowEntry[]} entries
 * @param {Storage | null} [store]
 */
export function saveFollows(entries, store = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    store?.setItem(PARTICIPANT_FOLLOWS_STORAGE_KEY, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("hc-participant-follows-changed"));
    }
  } catch {
    /* storage unavailable — fail closed but non-fatal */
  }
}

/**
 * Is this season already followed on this device?
 * @param {string} seasonId
 * @param {FollowEntry[]} [entries]
 * @returns {boolean}
 */
export function isFollowed(seasonId, entries = loadFollows()) {
  return entries.some((entry) => entry.season_id === seasonId);
}

/**
 * Follow a season (Tier B — the caller has already confirmed via an explicit click).
 * @param {FollowSeasonRow} row
 * @param {FollowEntry[]} [entries]
 * @param {Storage | null} [store]
 * @returns {{ ok: true; entries: FollowEntry[] } | { ok: false; error: string }}
 */
export function followSeason(row, entries = loadFollows(), store) {
  if (!row || typeof row !== "object") return { ok: false, error: "Season is required." };
  const seasonId = String(row.season_id ?? "").trim();
  if (!seasonId) return { ok: false, error: "Season id is required." };
  if (entries.some((entry) => entry.season_id === seasonId)) {
    return { ok: false, error: "This network is already followed on this device." };
  }
  if (entries.length >= PARTICIPANT_FOLLOW_MAX) {
    return { ok: false, error: `You can follow up to ${PARTICIPANT_FOLLOW_MAX} networks on this device.` };
  }
  const entry = normalizeFollowEntry(seasonId, row);
  if ("error" in entry) return { ok: false, error: entry.error };
  const next = [...entries, entry];
  saveFollows(next, store);
  return { ok: true, entries: next };
}

/**
 * Unfollow a season (Tier B confirm, no sign).
 * @param {string} seasonId
 * @param {FollowEntry[]} [entries]
 * @param {Storage | null} [store]
 * @returns {{ ok: true; entries: FollowEntry[] } | { ok: false; error: string }}
 */
export function unfollowSeason(seasonId, entries = loadFollows(), store) {
  if (!seasonId) return { ok: false, error: "Season id is required." };
  if (!entries.some((entry) => entry.season_id === seasonId)) {
    return { ok: false, error: "This network is not followed on this device." };
  }
  const next = entries.filter((entry) => entry.season_id !== seasonId);
  saveFollows(next, store);
  return { ok: true, entries: next };
}

/**
 * Public display label for the "My networks" shelf.
 * Docs: "checked" not "scanned" — never implies the operator saw your scans.
 */
export const FOLLOW_SHELF_COPY = {
  heading: "My networks",
  empty:
    "Networks you follow on this device appear here. Follow a network to check its public board without an account. This list is stored only on this device.",
  disclosure:
    "What this device remembers: the networks you follow (season ids), stored in your browser's local storage (hc_participant_follows). Nothing is uploaded to the operator. Clearing site data removes this list.",
  button_follow: "Follow",
  button_following: "Following",
  button_unfollow: "Unfollow",
  aria_follow: "Follow this public network on this device",
  aria_unfollow: "Unfollow this public network on this device",
  not_scanned:
    "Opening a network checks its public board. It is not a scan of you and is never uploaded.",
};

/**
 * Build the shelf HTML for followed networks.
 * @param {FollowEntry[]} entries
 * @param {{ heading?: string; empty?: string; disclosure?: string }} [copy]
 * @returns {string}
 */
export function buildFollowShelfHtml(entries, copy = {}) {
  const c = { ...FOLLOW_SHELF_COPY, ...copy };
  if (!Array.isArray(entries) || entries.length === 0) {
    return `<section class="participant-follow-shelf" aria-labelledby="participant-follow-heading" data-follow-shelf="empty">
  <h2 class="group-label" id="participant-follow-heading">My networks</h2>
  <p class="form-hint participant-follow-empty">${c.empty}</p>
  <p class="idea-footnote participant-follow-disclosure">${c.disclosure}</p>
</section>`;
  }
  const rows = entries
    .map((entry) => {
      const rulesPath = entry.rules_path || "/play/season/";
      const title = entry.title || entry.season_id;
      return `<li class="participant-follow-row">
  <a class="participant-follow-link" href="${rulesPath}">${title}</a>
  <button type="button" class="participant-follow-btn participant-follow-btn--following" data-participant-unfollow="${entry.season_id}" aria-label="${c.aria_unfollow}">${c.button_following}</button>
</li>`;
    })
    .join("");
  return `<section class="participant-follow-shelf" aria-labelledby="participant-follow-heading" data-follow-shelf="list">
  <h2 class="group-label" id="participant-follow-heading">My networks</h2>
  <p class="form-hint participant-follow-intro">${c.not_scanned}</p>
  <ul class="participant-follow-list">${rows}</ul>
  <p class="idea-footnote participant-follow-disclosure">${c.disclosure}</p>
</section>`;
}