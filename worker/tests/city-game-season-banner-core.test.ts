import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  formatSeasonWindowLabel,
  resolveSeasonWindowPhase,
  seasonBannerBodyHtml,
  seasonBannerHeadline,
  seasonBannerNoticeClass,
  seasonListSubtitle,
} from "../../site/js/city-game-season-banner-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-season-banner-core", () => {
  it("formats season window label", () => {
    expect(formatSeasonWindowLabel(season)).toContain("Wake the city");
    expect(formatSeasonWindowLabel(season)).toContain("2026-06-06");
  });

  it("resolves before, open, and after phases", () => {
    expect(resolveSeasonWindowPhase(new Date("2026-06-06T12:00:00-05:00"), season)).toBe(
      "before"
    );
    expect(resolveSeasonWindowPhase(new Date("2026-06-07T12:00:00-05:00"), season)).toBe("open");
    expect(resolveSeasonWindowPhase(new Date("2026-06-09T08:00:00-05:00"), season)).toBe("after");
  });

  it("uses phase-aware headlines and body copy", () => {
    expect(seasonBannerHeadline("before")).toBe("Season opens soon.");
    expect(seasonBannerHeadline("open")).toBe("Season live.");
    expect(seasonBannerHeadline("after")).toBe("Season ended.");
    expect(seasonListSubtitle("before", season)).toContain("Season opens soon");
    expect(seasonListSubtitle("before", season)).toContain("Cedar Rapids");
    expect(seasonBannerBodyHtml("before", "rules", season)).toContain("plan your weekend");
    expect(seasonBannerBodyHtml("open", "rules", season)).toContain("#city-state");
    expect(seasonBannerBodyHtml("open", "rules", season)).toContain("Cedar Rapids");
    expect(seasonBannerBodyHtml("open", "research", season)).toContain("/play/cedar-rapids/");
    expect(seasonBannerNoticeClass("after")).toBe("hc-notice--warning");
  });
});
