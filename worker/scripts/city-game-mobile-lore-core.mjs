/**
 * Validation helpers for Glitch hoodie mobile_lore enrollment rows.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md Phase C
 */

export const MOBILE_LORE_PROFILE_ID_RE =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20,30}$/;

export const MOBILE_LORE_PRINT_ARTIFACT_ID_RE = /^pa_[a-zA-Z0-9_]{8,64}$/;

/**
 * @param {unknown} row
 * @returns {string[]}
 */
export function validateMobileLoreEnrollmentRow(row) {
  const issues = [];
  if (!row || typeof row !== "object") {
    return ["mobile_lore_enrollment row must be an object."];
  }
  const entry = /** @type {Record<string, unknown>} */ (row);
  const profileId =
    typeof entry.profile_id === "string" ? entry.profile_id.trim() : "";
  const printArtifactId =
    typeof entry.print_artifact_id === "string"
      ? entry.print_artifact_id.trim()
      : "";
  const label = typeof entry.label === "string" ? entry.label.trim() : "";

  if (!MOBILE_LORE_PROFILE_ID_RE.test(profileId)) {
    issues.push("profile_id must be a valid Humanity Card profile id.");
  }
  if (!MOBILE_LORE_PRINT_ARTIFACT_ID_RE.test(printArtifactId)) {
    issues.push("print_artifact_id must match pa_<opaque>.");
  }
  if (!label) {
    issues.push("label is required (courier display name).");
  }
  const role = entry.role == null ? "mobile_lore" : String(entry.role).trim();
  if (role !== "mobile_lore" && role !== "faction_badge") {
    issues.push('role must be "mobile_lore" or "faction_badge" when set.');
  }
  if (role === "faction_badge") {
    const faction =
      typeof entry.faction === "string" ? entry.faction.trim().toLowerCase() : "";
    if (!["red", "blue", "green", "yellow"].includes(faction)) {
      issues.push("faction must be red, blue, green, or yellow for faction_badge.");
    }
    if (
      entry.mission_line != null &&
      typeof entry.mission_line !== "string"
    ) {
      issues.push("mission_line must be a string when set.");
    }
    if (entry.achievement_lines != null) {
      if (!Array.isArray(entry.achievement_lines)) {
        issues.push("achievement_lines must be an array when set.");
      } else if (entry.achievement_lines.length > 6) {
        issues.push("achievement_lines may include at most 6 entries.");
      }
    }
  }
  if (
    entry.fragment_hint != null &&
    typeof entry.fragment_hint !== "string"
  ) {
    issues.push("fragment_hint must be a string when set.");
  }
  if (entry.courier_note != null && typeof entry.courier_note !== "string") {
    issues.push("courier_note must be a string when set.");
  }
  return issues;
}

/**
 * @param {unknown[]} rows
 * @returns {string[]}
 */
export function validateMobileLoreEnrollmentList(rows) {
  if (!Array.isArray(rows)) {
    return ["mobile_lore_enrollment must be an array (empty OK)."];
  }
  const issues = [];
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    for (const issue of validateMobileLoreEnrollmentRow(rows[i])) {
      issues.push(`mobile_lore_enrollment[${i}]: ${issue}`);
    }
    const row = rows[i];
    if (row && typeof row === "object" && row.print_artifact_id) {
      const key = String(row.print_artifact_id).trim();
      if (seen.has(key)) {
        issues.push(`duplicate print_artifact_id in enrollment: ${key}`);
      }
      seen.add(key);
    }
  }
  return issues;
}

/**
 * @param {{ profileId: string; artifact: string; label: string; fragmentHint?: string; courierNote?: string }} input
 */
/**
 * @param {{ profileId: string; artifact: string; label: string; role?: string; faction?: string; missionLine?: string; achievementLines?: string[]; fragmentHint?: string; courierNote?: string }} input
 */
export function buildMobileLoreEnrollmentRow(input) {
  const role = input.role?.trim() === "faction_badge" ? "faction_badge" : "mobile_lore";
  const row = {
    profile_id: input.profileId.trim(),
    print_artifact_id: input.artifact.trim(),
    label: input.label.trim() || (role === "faction_badge" ? "Faction badge" : "Mobile lore courier"),
    role,
    enrolled_at: new Date().toISOString(),
  };
  if (role === "faction_badge" && input.faction?.trim()) {
    row.faction = input.faction.trim().toLowerCase();
  }
  if (role === "faction_badge" && input.missionLine?.trim()) {
    row.mission_line = input.missionLine.trim();
  }
  if (role === "faction_badge" && input.achievementLines?.length) {
    row.achievement_lines = input.achievementLines.map((line) => String(line).trim()).filter(Boolean);
  }
  if (input.fragmentHint?.trim()) {
    row.fragment_hint = input.fragmentHint.trim();
  }
  if (input.courierNote?.trim()) {
    row.courier_note = input.courierNote.trim();
  }
  return row;
}
