import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import {
  assessOrganizerRulesPublish,
  buildSelfServePublishedRulesHtml,
  datetimeLocalValueToIso,
  deployChecklistText,
  isoToDatetimeLocalValue,
  jsonBasenameFromPublicUrl,
  mergeOrganizerPublishSeason,
  parseDistrictsDraftText,
  seasonSupportsBrowserRulesPublish,
} from "../../site/js/city-game-rules-publish-core.mjs";
import { rulesPageIsLaunchReady } from "../../site/js/city-game-launch-surfaces-shared.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game-rules-publish-core", () => {
  it("parses json basename from public url", () => {
    expect(jsonBasenameFromPublicUrl("/data/city-game-example-season-01.json")).toBe(
      "city-game-example-season-01.json"
    );
  });

  it("round-trips datetime-local helpers", () => {
    const iso = "2026-07-04T18:00:00.000Z";
    const local = isoToDatetimeLocalValue(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(datetimeLocalValueToIso(local)).toBeTruthy();
  });

  it("parses district slugs from organizer textarea", () => {
    expect(parseDistrictsDraftText("Downtown, river\nold town")).toEqual([
      "downtown",
      "river",
      "old_town",
    ]);
  });

  it("merges organizer profile and window draft onto season", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const merged = mergeOrganizerPublishSeason(
      season,
      {
        window: {
          starts_at: "2026-07-04T18:00:00.000Z",
          ends_at: "2026-07-06T23:59:00.000Z",
        },
        status: "active",
      },
      "profile_test_01"
    );
    expect(merged.season_root_profile_id).toBe("profile_test_01");
    expect(merged.status).toBe("active");
    expect(merged.window?.starts_at).toBe("2026-07-04T18:00:00.000Z");
  });

  it("merges organizer districts draft onto season", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const merged = mergeOrganizerPublishSeason(season, { districts: ["harbor", "downtown"] }, "");
    expect(merged.districts).toEqual(["harbor", "downtown"]);
  });

  it("merges unlock_edges draft onto season for rules publish", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const merged = mergeOrganizerPublishSeason(
      season,
      {
        unlock_edges: [{ from: "node_04", to: "node_05", label: "opens relay" }],
      },
      ""
    );
    expect(merged.unlock_edges).toEqual([
      { from: "node_04", to: "node_05", label: "opens relay" },
    ]);
  });

  it("assesses example season ready when window and profile set", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    expect(seasonSupportsBrowserRulesPublish(season)).toBe(true);
    const draft = {
      window: {
        starts_at: "2026-07-04T18:00:00.000Z",
        ends_at: "2026-07-06T23:59:00.000Z",
      },
      status: "active",
    };
    const assessment = assessOrganizerRulesPublish(
      season,
      "city-game-example-season-01.json",
      "profile_test_01",
      draft
    );
    expect(assessment.ready).toBe(true);
    expect(assessment.publishedHtml).toBeTruthy();
    expect(assessment.publishedIsLaunchReady).toBe(true);
    expect(rulesPageIsLaunchReady(assessment.publishedHtml ?? "")).toBe(true);
  });

  it("builds launch-ready html without noindex", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const html = buildSelfServePublishedRulesHtml(
      season,
      "city-game-example-season-01.json",
      "profile_test_01",
      {
        window: {
          starts_at: "2026-07-04T18:00:00.000Z",
          ends_at: "2026-07-06T23:59:00.000Z",
        },
        status: "active",
      }
    );
    expect(html).not.toMatch(/noindex/i);
    expect(html).toContain("data-city-game-season-banner");
    expect(html).not.toContain("Template only.");
  });

  it("includes deploy checklist with rules page path", () => {
    const season = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const assessment = assessOrganizerRulesPublish(
      season,
      "city-game-example-season-01.json",
      "profile_test_01",
      {
        window: {
          starts_at: "2026-07-04T18:00:00.000Z",
          ends_at: "2026-07-06T23:59:00.000Z",
        },
        status: "active",
      }
    );
    const text = deployChecklistText(assessment.launchCtx);
    expect(text).toContain("site/play/example-city/index.html");
    expect(text).toContain("/play/example-city/");
  });

  it("flags cedar rapids pilot for terminal launch surfaces", () => {
    const season = loadSeasonJsonFile(root, "city-game-cr-season-01.json");
    expect(seasonSupportsBrowserRulesPublish(season)).toBe(false);
    const assessment = assessOrganizerRulesPublish(
      season,
      "city-game-cr-season-01.json",
      "profile_test_01",
      {
        window: {
          starts_at: "2026-06-06T10:00:00.000Z",
          ends_at: "2026-06-08T22:00:00.000Z",
        },
        status: "active",
      }
    );
    expect(assessment.ready).toBe(false);
    expect(assessment.issues.some((issue) => issue.includes("auto_rules_page"))).toBe(true);
  });
});
