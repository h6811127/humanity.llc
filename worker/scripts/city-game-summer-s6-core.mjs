/**
 * WS-SW summer S6 — post-season debrief surface (**SW-14**).
 * Canon: docs/CITY_GAME_SUMMER_MOMENTUM.md Lane B #6.
 */

export const SUMMER_S6_DEBRIEF_PATH = "/play/cedar-rapids/debrief/";

export const SUMMER_S6_REQUIRED_PATTERN_IDS = [
  "public_goods",
  "commons",
  "coordination",
  "contest",
];

export const SUMMER_S6_MIN_PATTERNS = 4;

/** @type {{ title: string; lead: string; game_theory_patterns: Array<{ id: string; title: string; body: string }> }} */
export const SUMMER_S6_DEBRIEF_CANON = {
  title: "Wake the city · debrief",
  lead: "Patterns you may have felt on the street — named after the season without a lecture during play.",
  game_theory_patterns: [
    {
      id: "public_goods",
      title: "Public goods",
      body: "River Lantern quorum and witness scarcity needed everyone to show up — hiding clues delayed the lattice.",
    },
    {
      id: "commons",
      title: "Tragedy of the commons",
      body: "Hot relays could flip compromised when too many capture attempts piled on — factions still lost the relay.",
    },
    {
      id: "coordination",
      title: "Coordination",
      body: "Fragment nodes and vouch paths only opened when the city shared clues outward.",
    },
    {
      id: "contest",
      title: "Network contest",
      body: "Relay holds and decay forced revisits — the board showed faction truth, not personal scan counts.",
    },
  ],
};

/**
 * @param {Record<string, unknown>} season
 */
export function validateSeasonSummerS6(season) {
  const issues = [];

  const path = String(season.debrief_path ?? "").trim();
  if (path !== SUMMER_S6_DEBRIEF_PATH) {
    issues.push(`debrief_path must be ${SUMMER_S6_DEBRIEF_PATH}.`);
  }

  const endsAt = season.window?.ends_at;
  if (!endsAt || typeof endsAt !== "string" || !endsAt.trim()) {
    issues.push("window.ends_at required for post-season debrief window.");
  }

  const debrief =
    season.debrief && typeof season.debrief === "object"
      ? /** @type {Record<string, unknown>} */ (season.debrief)
      : null;
  if (!debrief) {
    issues.push("debrief block required on season JSON.");
    return { ok: false, issues };
  }

  if (debrief.title !== SUMMER_S6_DEBRIEF_CANON.title) {
    issues.push("debrief.title drift from summer-s6-core canon.");
  }
  if (debrief.lead !== SUMMER_S6_DEBRIEF_CANON.lead) {
    issues.push("debrief.lead drift from summer-s6-core canon.");
  }

  const patterns = Array.isArray(debrief.game_theory_patterns)
    ? debrief.game_theory_patterns
    : [];
  if (patterns.length < SUMMER_S6_MIN_PATTERNS) {
    issues.push(
      `debrief.game_theory_patterns needs ≥${SUMMER_S6_MIN_PATTERNS} entries.`
    );
  }

  for (const id of SUMMER_S6_REQUIRED_PATTERN_IDS) {
    const row = patterns.find(
      (p) => p && typeof p === "object" && String(/** @type {Record<string, unknown>} */ (p).id) === id
    );
    if (!row) {
      issues.push(`debrief missing game_theory_patterns id ${id}.`);
    }
  }

  const s6 = season.signal_war?.summer_s6;
  if (!s6 || s6.debrief_ready !== true) {
    issues.push("signal_war.summer_s6.debrief_ready must be true.");
  }

  return { ok: issues.length === 0, issues, patternCount: patterns.length };
}

/**
 * @param {Record<string, unknown>} season
 */
export function mergeSummerS6Debrief(season) {
  const merged = structuredClone(season);
  merged.debrief_path = SUMMER_S6_DEBRIEF_PATH;
  merged.debrief = structuredClone(SUMMER_S6_DEBRIEF_CANON);

  if (!merged.signal_war || typeof merged.signal_war !== "object") {
    merged.signal_war = {};
  }
  merged.signal_war.summer_s6 = {
    debrief_ready: true,
    debrief_path: SUMMER_S6_DEBRIEF_PATH,
    pattern_ids: SUMMER_S6_REQUIRED_PATTERN_IDS,
  };

  return merged;
}
