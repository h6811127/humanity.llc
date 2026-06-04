import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  SUMMER_S6_REQUIRED_PATTERN_IDS,
  mergeSummerS6Debrief,
  validateSeasonSummerS6,
} from "../scripts/city-game-summer-s6-core.mjs";
import {
  shouldGateDebriefPatterns,
} from "../../site/js/city-game-debrief-core.mjs";
import {
  buildDebriefBoardCtaHtml,
  shouldShowDebriefBoardCta,
} from "../../site/js/city-game-debrief-board-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

describe("city-game-summer-s6-core (SW-14)", () => {
  it("merge validates debrief canon", () => {
    const season = JSON.parse(readFileSync(seasonPath, "utf8"));
    const merged = mergeSummerS6Debrief(season);
    const result = validateSeasonSummerS6(merged);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(merged.debrief_path).toBe("/play/cedar-rapids/debrief/");
    for (const id of SUMMER_S6_REQUIRED_PATTERN_IDS) {
      expect(
        merged.debrief.game_theory_patterns.some(
          (p: { id: string }) => p.id === id
        )
      ).toBe(true);
    }
  });

  it("gates pattern bodies while season is open", () => {
    expect(shouldGateDebriefPatterns("open", { status: "active" })).toBe(true);
    expect(shouldGateDebriefPatterns("after", { status: "active" })).toBe(false);
    expect(shouldGateDebriefPatterns("open", { status: "ended" })).toBe(false);
  });

  it("builds board CTA with debrief link after close", () => {
    const season = {
      debrief_path: "/play/cedar-rapids/debrief/",
      status: "active",
      window: {
        starts_at: "2026-06-06T18:00:00-05:00",
        ends_at: "2026-06-07T22:00:00-05:00",
      },
    };
    const after = new Date("2026-06-08T12:00:00.000Z");
    expect(shouldShowDebriefBoardCta(season, after)).toBe(true);
    const html = buildDebriefBoardCtaHtml(season, after);
    expect(html).toContain('href="/play/cedar-rapids/debrief/"');
    expect(html).toContain("Open season debrief");
  });
});
