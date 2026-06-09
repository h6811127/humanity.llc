/**
 * WS-SW summer S5 — faction badges + mobile lore enrollment (**SW-11** / **SW-15**).
 * Canon: docs/CITY_GAME_SUMMER_MOMENTUM.md Lane B #5.
 */
import {
  buildMobileLoreEnrollmentRow,
  validateMobileLoreEnrollmentList,
} from "./city-game-mobile-lore-core.mjs";

/** Profile that owns pilot print_artifact QRs (production season root). */
export const SUMMER_S5_OWNER_PROFILE_ID = "GcP3Ee17yGqMHdidhEVMYBzq";

export const SUMMER_S5_MIN_FACTION_BADGES = 4;

export const SUMMER_S5_FACTIONS = ["red", "blue", "green", "yellow"];

const ENROLLED_AT = "2026-06-06T18:00:00-05:00";

/** @type {Record<string, { artifact: string; label: string; missionLine: string; achievementLines: string[] }>} */
export const SUMMER_S5_FACTION_BADGE_TEMPLATES = {
  red: {
    artifact: "pa_crSummerBadgeRed01",
    label: "Red faction hoodie",
    missionLine: "Hold NewBo and river spine relays through the weekend",
    achievementLines: ["Sanctuary pledge · NewBo", "First relay capture"],
  },
  blue: {
    artifact: "pa_crSummerBadgeBlue01",
    label: "Blue faction hoodie",
    missionLine: "Contest downtown gates and the bridge corridor",
    achievementLines: ["Bridge watch", "Reinforce hot relay"],
  },
  green: {
    artifact: "pa_crSummerBadgeGreen01",
    label: "Green faction hoodie",
    missionLine: "Greene Square fragments and plaza switches",
    achievementLines: ["Fragment registered", "Finale path scout"],
  },
  yellow: {
    artifact: "pa_crSummerBadgeYellow01",
    label: "Yellow faction hoodie",
    missionLine: "Czech Village heritage and cabinet path",
    achievementLines: ["Heritage clue shared", "Witness pass issued"],
  },
};

/** @type {{ artifact: string; label: string; fragmentHint: string; courierNote?: string }[]} */
export const SUMMER_S5_MOBILE_LORE_TEMPLATES = [
  {
    artifact: "pa_glitchHoodieCourier01",
    label: "Glitch courier · North",
    fragmentHint: "Fragment 3 · Greene dusk rumor",
    courierNote: "Rotating pseudonym on owner status line",
  },
];

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function buildSummerS5CanonEnrollments() {
  const rows = [];

  for (const faction of SUMMER_S5_FACTIONS) {
    const tpl = SUMMER_S5_FACTION_BADGE_TEMPLATES[faction];
    rows.push(
      buildMobileLoreEnrollmentRow({
        profileId: SUMMER_S5_OWNER_PROFILE_ID,
        artifact: tpl.artifact,
        label: tpl.label,
        role: "faction_badge",
        faction,
        missionLine: tpl.missionLine,
        achievementLines: tpl.achievementLines,
      })
    );
  }

  for (const tpl of SUMMER_S5_MOBILE_LORE_TEMPLATES) {
    rows.push(
      buildMobileLoreEnrollmentRow({
        profileId: SUMMER_S5_OWNER_PROFILE_ID,
        artifact: tpl.artifact,
        label: tpl.label,
        role: "mobile_lore",
        fragmentHint: tpl.fragmentHint,
        courierNote: tpl.courierNote,
      })
    );
  }

  for (const row of rows) {
    row.enrolled_at = ENROLLED_AT;
  }

  return rows;
}

/**
 * @param {Record<string, unknown>} season
 */
export function validateSeasonSummerS5(season) {
  const issues = [];

  if (season.season_root_profile_id !== SUMMER_S5_OWNER_PROFILE_ID) {
    issues.push(
      `season_root_profile_id expected ${SUMMER_S5_OWNER_PROFILE_ID} for pilot canon enrollments.`
    );
  }

  const s5 = season.signal_war?.summer_s5;
  if (!s5 || s5.badge_enrollment_ready !== true) {
    issues.push("signal_war.summer_s5.badge_enrollment_ready must be true.");
  }

  const rows = season.mobile_lore_enrollment ?? [];
  issues.push(...validateMobileLoreEnrollmentList(rows));

  const badges = rows.filter((r) => r?.role === "faction_badge");
  if (badges.length < SUMMER_S5_MIN_FACTION_BADGES) {
    issues.push(
      `mobile_lore_enrollment needs ≥${SUMMER_S5_MIN_FACTION_BADGES} faction_badge rows (got ${badges.length}).`
    );
  }

  for (const faction of SUMMER_S5_FACTIONS) {
    if (!badges.some((r) => r.faction === faction)) {
      issues.push(`missing faction_badge enrollment for ${faction}.`);
    }
  }

  const canon = buildSummerS5CanonEnrollments();
  const byArtifact = new Map(rows.map((r) => [r.print_artifact_id, r]));
  for (const expected of canon) {
    const have = byArtifact.get(expected.print_artifact_id);
    if (!have) {
      issues.push(`missing canon enrollment ${expected.print_artifact_id}.`);
      continue;
    }
    if (have.role !== expected.role || have.faction !== expected.faction) {
      issues.push(`${expected.print_artifact_id} drift from summer-s5 canon.`);
    }
  }

  return { ok: issues.length === 0, issues, badgeCount: badges.length };
}

/**
 * @param {Record<string, unknown>} season
 */
export function mergeSummerS5Enrollments(season) {
  const merged = structuredClone(season);
  const canon = buildSummerS5CanonEnrollments();
  const canonIds = new Set(canon.map((r) => r.print_artifact_id));
  const kept = (merged.mobile_lore_enrollment ?? []).filter(
    (r) => r && !canonIds.has(r.print_artifact_id)
  );
  merged.mobile_lore_enrollment = [...canon, ...kept];

  if (!merged.signal_war || typeof merged.signal_war !== "object") {
    merged.signal_war = {};
  }
  merged.signal_war.summer_s5 = {
    badge_enrollment_ready: true,
    owner_profile_id: SUMMER_S5_OWNER_PROFILE_ID,
    faction_badge_ids: SUMMER_S5_FACTIONS.map(
      (f) => SUMMER_S5_FACTION_BADGE_TEMPLATES[f].artifact
    ),
    mobile_lore_ids: SUMMER_S5_MOBILE_LORE_TEMPLATES.map((t) => t.artifact),
  };

  const guide = merged.signal_war.player_guide;
  if (Array.isArray(guide)) {
    const hasBadgeGuide = guide.some((step) =>
      String(step?.title ?? "").includes("Faction badge")
    );
    if (!hasBadgeGuide) {
      merged.signal_war.player_guide = [
        ...guide,
        {
          title: "Faction badge scans",
          body: "Scan a Glitch hoodie or wristband QR enrolled in the season — read public faction, mission, and achievement lines. No account and no log of who scanned whom.",
        },
      ];
    }
  }

  return merged;
}
