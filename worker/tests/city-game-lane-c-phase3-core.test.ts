import { describe, expect, it } from "vitest";

import {
  assessLaneCPhase3,
  formatLaneCPhase3Report,
} from "../scripts/city-game-lane-c-phase3-core.mjs";
import {
  RESEARCH_LAUNCH_PAGE_RELS,
  rulesPageIsLaunchReady,
} from "../scripts/city-game-launch-surfaces-core.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesDraft = readFileSync(
  join(root, "site/play/cedar-rapids/index.html"),
  "utf8"
);

const launchSeason = {
  season_id: "cr_season_01_wake",
  title: "Wake the city",
  season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt",
  window: {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-06-08T22:00:00-05:00",
  },
};

describe("city-game-lane-c-phase3-core", () => {
  it("flags engineering blockers when season window missing", () => {
    const report = assessLaneCPhase3({
      season: { season_id: "x", nodes: [] },
      rulesHtml: rulesDraft,
      researchHtmlByRel: {},
    });
    expect(report.engineeringReady).toBe(false);
    expect(report.surfacesReady.ready).toBe(false);
  });

  it("passes engineering when on-disk launch surfaces are applied", () => {
    const researchHtmlByRel = Object.fromEntries(
      RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
    );
    expect(rulesPageIsLaunchReady(rulesDraft)).toBe(true);

    const report = assessLaneCPhase3({
      season: launchSeason,
      rulesHtml: rulesDraft,
      researchHtmlByRel,
      wranglerToml: 'CITY_GAME_ENABLED = "1"',
      expectApplied: true,
      launchCtx: { rulesPath: "/play/cedar-rapids/" },
    });
    expect(report.surfacesApplied).toBe(true);
    expect(report.engineeringReady).toBe(true);
    expect(report.e4.enabled).toBe(true);
  });

  it("expect-applied fails when rules page still draft", () => {
    const draftRules = `<meta name="robots" content="noindex, nofollow"><strong>Draft rules page.</strong>`;
    const report = assessLaneCPhase3({
      season: launchSeason,
      rulesHtml: draftRules,
      researchHtmlByRel: {},
      expectApplied: true,
    });
    expect(report.engineeringReady).toBe(false);
  });

  it("format report mentions Phase 3 playbook", () => {
    const report = assessLaneCPhase3({
      season: launchSeason,
      rulesHtml: rulesDraft,
      researchHtmlByRel: {},
    });
    const text = formatLaneCPhase3Report(report);
    expect(text).toContain("Phase 3");
    expect(text).toContain("launch-surfaces");
  });
});
