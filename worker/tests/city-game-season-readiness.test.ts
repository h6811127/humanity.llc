import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cityGameSeasonReadiness } from "../scripts/city-game-season-readiness.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("cityGameSeasonReadiness", () => {
  it("passes for current season registry", () => {
    const { ready, issues } = cityGameSeasonReadiness(season);
    expect(issues).toEqual([]);
    expect(ready).toBe(true);
  });

  it("passes requireLaunch when season root and window dates are set", () => {
    const { ready, issues } = cityGameSeasonReadiness(season, { requireLaunch: true });
    expect(issues).toEqual([]);
    expect(ready).toBe(true);
  });

  it("requires season root and dates for launch when unset", () => {
    const preLaunch = {
      ...season,
      season_root_profile_id: "",
      window: { starts_at: "", ends_at: "" },
    };
    const { ready, issues } = cityGameSeasonReadiness(preLaunch, { requireLaunch: true });
    expect(ready).toBe(false);
    expect(issues.some((i) => i.includes("season_root_profile_id"))).toBe(true);
    expect(issues.some((i) => i.includes("window"))).toBe(true);
  });

  it("rejects broken unlock edge", () => {
    const broken = {
      ...season,
      unlock_edges: [{ from: "node_99", to: "node_07", label: "bad" }],
    };
    const { ready, issues } = cityGameSeasonReadiness(broken);
    expect(ready).toBe(false);
    expect(issues.some((i) => i.includes("node_99"))).toBe(true);
  });

  it("requires autonomous spine config and contribute codes", () => {
    const broken = {
      ...season,
      automation: { ...season.automation, quorum_nodes: [] },
      contribute_codes: { ...season.contribute_codes, node_04: { code: "", epoch: season.season_id } },
    };
    const { ready, issues } = cityGameSeasonReadiness(broken);
    expect(ready).toBe(false);
    expect(issues.some((i) => i.includes("quorum_nodes"))).toBe(true);
    expect(issues.some((i) => i.includes("node_04"))).toBe(true);
  });
});
