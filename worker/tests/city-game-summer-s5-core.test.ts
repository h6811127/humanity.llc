import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  SUMMER_S5_FACTIONS,
  SUMMER_S5_MIN_FACTION_BADGES,
  buildSummerS5CanonEnrollments,
  mergeSummerS5Enrollments,
  validateSeasonSummerS5,
} from "../scripts/city-game-summer-s5-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

describe("city-game-summer-s5-core (SW-11 / SW-15)", () => {
  it("builds four faction badges plus one mobile lore courier", () => {
    const rows = buildSummerS5CanonEnrollments();
    const badges = rows.filter((r) => r.role === "faction_badge");
    expect(badges).toHaveLength(SUMMER_S5_MIN_FACTION_BADGES);
    for (const faction of SUMMER_S5_FACTIONS) {
      expect(badges.some((r) => r.faction === faction)).toBe(true);
    }
    expect(rows.filter((r) => r.role === "mobile_lore")).toHaveLength(1);
  });

  it("merge + validate round-trip on season JSON", () => {
    const season = JSON.parse(readFileSync(seasonPath, "utf8"));
    const merged = mergeSummerS5Enrollments(season);
    const result = validateSeasonSummerS5(merged);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.badgeCount).toBe(4);
    expect(merged.signal_war.summer_s5.badge_enrollment_ready).toBe(true);
  });

  it("validates on-disk season after merge", () => {
    const season = JSON.parse(readFileSync(seasonPath, "utf8"));
    if ((season.mobile_lore_enrollment ?? []).length === 0) {
      const merged = mergeSummerS5Enrollments(season);
      const dry = validateSeasonSummerS5(merged);
      expect(dry.ok).toBe(true);
      return;
    }
    const result = validateSeasonSummerS5(season);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
