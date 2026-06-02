import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_LAUNCH_PAGE_RELS,
  RULES_PAGE_REL,
  applyResearchPageLaunchPatches,
  applyRulesPageLaunchPatches,
  assessLaunchSurfacesApplied,
  assessLaunchSurfacesReady,
  formatSeasonWindowLabel,
  researchPageIsLaunchReady,
  rulesPageIsLaunchReady,
} from "../scripts/city-game-launch-surfaces-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesHtml = readFileSync(join(root, RULES_PAGE_REL), "utf8");

const launchSeason = {
  season_id: "cr_season_01_wake",
  title: "Wake the city",
  season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt",
  window: {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-06-08T22:00:00-05:00",
  },
};

describe("city-game-launch-surfaces-core", () => {
  it("formats season window label", () => {
    expect(formatSeasonWindowLabel(launchSeason)).toContain("Wake the city");
    expect(formatSeasonWindowLabel(launchSeason)).toContain("2026-06-06");
  });

  it("requires season root and window before launch surfaces apply", () => {
    const { ready, issues } = assessLaunchSurfacesReady({
      season_id: "cr_season_01_wake",
      window: { starts_at: null, ends_at: null },
    });
    expect(ready).toBe(false);
    expect(issues.some((i) => i.includes("season_root_profile_id"))).toBe(true);
    expect(issues.some((i) => i.includes("window"))).toBe(true);
  });

  it("patches rules page for launch", () => {
    const next = applyRulesPageLaunchPatches(rulesHtml, launchSeason);
    expect(next).not.toMatch(/noindex/i);
    expect(next).toContain("Season live.");
    expect(next).toContain("2026-06-06T18:00:00-05:00");
    expect(next).not.toContain("Draft rules page");
    expect(rulesPageIsLaunchReady(next)).toBe(true);
  });

  it("patches research pages for launch", () => {
    for (const rel of RESEARCH_LAUNCH_PAGE_RELS) {
      const html = readFileSync(join(root, rel), "utf8");
      const next = applyResearchPageLaunchPatches(html, launchSeason, rel);
      expect(researchPageIsLaunchReady(next, rel)).toBe(true);
      if (rel !== "site/what-can-a-qr-do.html") {
        expect(next).not.toContain("In development:");
      }
    }
  });

  it("detects applied launch surfaces", () => {
    const researchHtmlByRel = Object.fromEntries(
      RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [
        rel,
        applyResearchPageLaunchPatches(
          readFileSync(join(root, rel), "utf8"),
          launchSeason,
          rel
        ),
      ])
    );
    const { applied, issues } = assessLaunchSurfacesApplied(launchSeason, {
      rulesHtml: applyRulesPageLaunchPatches(rulesHtml, launchSeason),
      researchHtmlByRel,
    });
    expect(issues).toEqual([]);
    expect(applied).toBe(true);
  });

  it("pre-launch rules page is not launch-ready", () => {
    expect(rulesPageIsLaunchReady(rulesHtml)).toBe(false);
  });
});
