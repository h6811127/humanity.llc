import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assessLaneCDensity,
  assessLaneC,
  seasonRegistryNodeCount,
} from "../scripts/city-game-lane-c-core.mjs";
import { LANE_C_SUMMER_MARKETING_TARGET } from "../scripts/city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-lane-c-core", () => {
  it("reads registry node count from season JSON", () => {
    expect(seasonRegistryNodeCount(season)).toBe(season.nodes.length);
  });

  it("flags density gap until 40-node summer open", () => {
    const density = assessLaneCDensity(season);
    expect(density.target).toBe(LANE_C_SUMMER_MARKETING_TARGET);
    if (season.nodes.length < LANE_C_SUMMER_MARKETING_TARGET) {
      expect(density.readyForSummerMarketing).toBe(false);
      expect(density.warnings.length).toBeGreaterThan(0);
    }
  });

  it("assessLaneC returns blockers array", () => {
    const report = assessLaneC({ season });
    expect(report.registry).toBe(season.nodes.length);
    expect(Array.isArray(report.blockers)).toBe(true);
    expect(report.laneB).toBeDefined();
  });
});
