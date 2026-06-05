/**
 * Post-season debrief page — SW-14.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Wake the city · Signal War
 */
import { seasonSnapshotUrl } from "./city-game-map-snapshot-core.mjs";
import { formatSeasonWindowLabel } from "./city-game-season-banner-core.mjs";

/**
 * @param {string} value
 */
export function escapeDebriefHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} season
 */
/**
 * @param {Record<string, unknown>} season
 */
export function resolveDebriefPath(season) {
  const explicit = String(season.debrief_path ?? "").trim();
  if (explicit) return explicit;
  const sw = season.signal_war;
  if (sw && typeof sw === "object") {
    const s6 = /** @type {Record<string, unknown>} */ (sw).summer_s6;
    if (s6 && typeof s6 === "object") {
      const path = String(/** @type {Record<string, unknown>} */ (s6).debrief_path ?? "").trim();
      if (path) return path;
    }
  }
  return "/play/cedar-rapids/debrief/";
}

/**
 * Hide pattern bodies during live play; show after window close.
 * @param {string} phase
 * @param {Record<string, unknown>} season
 */
export function shouldGateDebriefPatterns(phase, season) {
  if (phase === "after" || season.status === "ended") return false;
  return phase === "open" && season.status === "active";
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveDebriefCopy(season) {
  const debrief =
    season.debrief && typeof season.debrief === "object"
      ? /** @type {Record<string, unknown>} */ (season.debrief)
      : {};
  return {
    title: String(debrief.title ?? "Season debrief").trim(),
    lead:
      String(debrief.lead ?? "").trim() ||
      "What the city showed on the public board — not a personal scoreboard.",
    patterns: Array.isArray(debrief.game_theory_patterns)
      ? debrief.game_theory_patterns
          .filter((row) => row && typeof row === "object")
          .map((row) => {
            const r = /** @type {Record<string, string>} */ (row);
            return {
              id: String(r.id ?? "").trim(),
              title: String(r.title ?? "").trim(),
              body: String(r.body ?? "").trim(),
            };
          })
          .filter((row) => row.title && row.body)
      : [],
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @param {Record<string, unknown>} season
 */
export function buildDebriefOutcomeLines(snapshot, season) {
  const lines = [];
  const signalWar =
    snapshot?.signal_war && typeof snapshot.signal_war === "object"
      ? /** @type {Record<string, unknown>} */ (snapshot.signal_war)
      : null;
  const dual =
    signalWar?.dual_victory && typeof signalWar.dual_victory === "object"
      ? /** @type {Record<string, unknown>} */ (signalWar.dual_victory)
      : null;

  if (dual?.network_majority_met && dual.network_leader) {
    const leader = String(dual.network_leader);
    lines.push(
      `Signal War · ${leader.charAt(0).toUpperCase()}${leader.slice(1)} secured relay network majority`
    );
  } else if (signalWar?.dominant_faction) {
    const f = String(signalWar.dominant_faction);
    lines.push(
      `Signal War · ${f.charAt(0).toUpperCase()}${f.slice(1)} led network points at season close`
    );
  }

  if (dual?.awakening_fragments_complete) {
    lines.push("Wake the city · cooperative fragment lattice completed");
  } else if (dual?.finale_open) {
    lines.push("Wake the city · finale arch was live at close");
  }

  if (!lines.length) {
    lines.push("Season closed — scan stickers may still show care or lore state.");
  }

  const windowLabel = formatSeasonWindowLabel(season);
  if (windowLabel) {
    lines.push(`Window · ${windowLabel}`);
  }

  return lines;
}

/**
 * @param {string} seasonId
 * @param {string} [origin]
 */
export async function fetchSeasonSnapshotForDebrief(seasonId, origin = "") {
  const base =
    origin?.trim() ||
    (typeof globalThis !== "undefined" && globalThis.location?.origin
      ? globalThis.location.origin
      : "https://humanity.llc");
  const url = seasonSnapshotUrl(seasonId, base);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, status: res.status, snapshot: null };
  const snapshot = await res.json();
  return { ok: true, status: res.status, snapshot };
}

/**
 * @param {HTMLElement} root
 * @param {{ season: Record<string, unknown>; snapshot: Record<string, unknown> | null; windowPhase?: string }} input
 */
export function renderDebriefPanel(root, input) {
  const copy = resolveDebriefCopy(input.season);
  const outcomes = buildDebriefOutcomeLines(input.snapshot, input.season);
  const phase = input.windowPhase ?? "open";

  const outcomeHtml = outcomes
    .map(
      (line) =>
        `<li class="list-row"><span class="list-content"><span class="list-sub">${escapeDebriefHtml(line)}</span></span></li>`
    )
    .join("");

  const patternsHtml = copy.patterns.length
    ? copy.patterns
        .map(
          (row) =>
            `<li class="list-row"><span class="list-content"><span class="list-title">${escapeDebriefHtml(row.title)}</span><span class="list-sub">${escapeDebriefHtml(row.body)}</span></span></li>`
        )
        .join("")
    : `<li class="list-row"><span class="list-content"><span class="list-sub">Patterns appear here after stewards publish the debrief copy block on the season JSON.</span></span></li>`;

  const phaseNote =
    phase === "after" || input.season.status === "ended"
      ? `<p class="idea-footnote">Season window ended. This page names what the public objects showed. Not who scanned what.</p>`
      : `<p class="idea-footnote">Season still open. Outcomes below reflect live snapshot truth and may change before close.</p>`;

  root.innerHTML = `<section class="idea-section" aria-labelledby="debrief-outcomes-title">
  <h2 class="group-label" id="debrief-outcomes-title">Public outcomes</h2>
  <ul class="list list-compact">${outcomeHtml}</ul>
  ${phaseNote}
</section>
<section class="idea-section" aria-labelledby="debrief-patterns-title">
  <h2 class="group-label" id="debrief-patterns-title">Patterns in play</h2>
  <p class="group-intro short">${escapeDebriefHtml(copy.lead)}</p>
  <ul class="list list-compact">${patternsHtml}</ul>
</section>`;
}
