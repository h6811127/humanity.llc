import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import {
  assessSelfServeStagingReady,
  countActiveGameNodes,
  formatSelfServeStagingReport,
  SELF_SERVE_STAGING_REQUIRED_NODE_COUNT,
  selfServeStagingWalkthroughSteps,
} from "../../site/js/city-game-self-serve-staging-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game-self-serve-staging-core", () => {
  const exampleSeason = loadSeasonJsonFile(root, "city-game-example-season-01.json");
  const crSeason = loadSeasonJsonFile(root, "city-game-cr-season-01.json");

  it("lists browser-only E3 walkthrough steps", () => {
    const steps = selfServeStagingWalkthroughSteps();
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps.join("\n")).toMatch(/\/created\//);
    expect(steps.join("\n")).not.toMatch(/city-game:mint-node -- --all/);
  });

  it("counts active game nodes with issued QRs", () => {
    expect(
      countActiveGameNodes([
        { object_type: "game_node", status: "active", qr_id: "qr_a" },
        { object_type: "game_node", status: "active", qr_id: null },
        { object_type: "status_plate", status: "active", qr_id: "qr_b" },
      ])
    ).toBe(1);
  });

  it("blocks pilot season for E3 assessment", () => {
    const result = assessSelfServeStagingReady({ season: crSeason });
    expect(result.engineeringReady).toBe(false);
    expect(result.blockers[0]).toMatch(/pilot/i);
  });

  it("tracks network progress toward 15 nodes", () => {
    const partial = assessSelfServeStagingReady({
      season: exampleSeason,
      networkGameNodeCount: 14,
      profileId: "prof_example",
    });
    expect(partial.engineeringReady).toBe(false);
    expect(partial.blockers[0]).toContain("14/15");

    const complete = assessSelfServeStagingReady({
      season: exampleSeason,
      networkGameNodeCount: SELF_SERVE_STAGING_REQUIRED_NODE_COUNT,
      profileId: "prof_example",
      rulesPublishReady: true,
    });
    expect(complete.humanWalkthroughComplete).toBe(true);
  });

  it("formats a readable preflight report", () => {
    const text = formatSelfServeStagingReport(
      assessSelfServeStagingReady({ season: exampleSeason })
    );
    expect(text).toContain("E3");
    expect(text).toContain("Browser walkthrough");
  });
});
