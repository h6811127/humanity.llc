import { describe, expect, it } from "vitest";

import {
  findSeasonPrintArtifactEnrollment,
  normalizeSiteCode,
  seasonContributeCode,
  seasonNodeIdForObject,
  seasonNodePledgeFaction,
  seasonObjectIdForNode,
  seasonRelayCapturePlayerEnabled,
  seasonRelayPointsPerHour,
  type CrSeasonConfig,
} from "../src/city-game/season-config";

function testSeason(overrides: Partial<CrSeasonConfig> = {}): CrSeasonConfig {
  return {
    season_id: "test_season_01",
    nodes: [
      {
        node_id: "node_a",
        object_id: "obj_a",
        role: "relay_gate",
        district: "downtown",
        label: "A",
        faction: "red",
        points_per_hour: 3,
      },
      {
        node_id: "node_b",
        object_id: "obj_b",
        role: "relay_gate",
        district: "downtown",
        label: "B",
        points_per_hour: 4,
      },
      {
        node_id: "node_c",
        object_id: "obj_c",
        role: "relay_gate",
        district: "downtown",
        label: "C",
        faction: "   ",
        points_per_hour: 0,
      },
    ],
    unlock_edges: [],
    contribute_codes: {
      node_a: { code: "  TEST-A  ", epoch: "  e1  " },
      node_b: { code: "   ", epoch: "e2" },
      node_c: { code: "TEST-C" },
    },
    automation: {
      relay_points_per_hour: {
        node_b: 25_000,
        node_zero: 0,
        node_neg: -2,
      },
    },
    ...overrides,
  } as CrSeasonConfig;
}

describe("season object ↔ node mapping", () => {
  it("resolves known pairs and returns null for unknown ids", () => {
    const season = testSeason();
    expect(seasonNodeIdForObject("obj_a", season)).toBe("node_a");
    expect(seasonObjectIdForNode("node_a", season)).toBe("obj_a");
    expect(seasonNodeIdForObject("obj_missing", season)).toBeNull();
    expect(seasonObjectIdForNode("node_missing", season)).toBeNull();
  });

  it("reads pledge faction only when the node has a non-blank faction", () => {
    const season = testSeason();
    expect(seasonNodePledgeFaction("node_a", season)).toBe("red");
    expect(seasonNodePledgeFaction("node_b", season)).toBeNull();
    expect(seasonNodePledgeFaction("node_c", season)).toBeNull();
    expect(seasonNodePledgeFaction(null, season)).toBeNull();
  });
});

describe("seasonContributeCode", () => {
  it("trims codes and falls back epoch to season_id", () => {
    const season = testSeason();
    expect(seasonContributeCode("node_a", season)).toEqual({
      code: "TEST-A",
      epoch: "e1",
    });
    expect(seasonContributeCode("node_c", season)).toEqual({
      code: "TEST-C",
      epoch: "test_season_01",
    });
  });

  it("returns null for blank or missing contribute codes", () => {
    const season = testSeason();
    expect(seasonContributeCode("node_b", season)).toBeNull();
    expect(seasonContributeCode("node_missing", season)).toBeNull();
  });
});

describe("seasonRelayPointsPerHour", () => {
  it("prefers automation weight, floors it, and caps at 10000", () => {
    const season = testSeason();
    expect(seasonRelayPointsPerHour("node_b", season)).toBe(10_000);
    expect(seasonRelayPointsPerHour("node_a", season)).toBe(3);
  });

  it("ignores non-positive automation weights and zero row weights", () => {
    const season = testSeason();
    expect(seasonRelayPointsPerHour("node_zero", season)).toBeNull();
    expect(seasonRelayPointsPerHour("node_neg", season)).toBeNull();
    expect(seasonRelayPointsPerHour("node_c", season)).toBeNull();
    expect(seasonRelayPointsPerHour("node_missing", season)).toBeNull();
  });
});

describe("seasonRelayCapturePlayerEnabled", () => {
  it("is env-gated when the graph flag is off", () => {
    const season = testSeason({
      automation: { relay_capture_player_enabled: false },
    });
    expect(seasonRelayCapturePlayerEnabled(season)).toBe(false);
    expect(
      seasonRelayCapturePlayerEnabled(season, { CITY_GAME_RELAY_CAPTURE_PLAYER: "1" })
    ).toBe(true);
    expect(
      seasonRelayCapturePlayerEnabled(season, { CITY_GAME_RELAY_CAPTURE_PLAYER: "true" })
    ).toBe(false);
  });
});

describe("print-artifact enrollment + site codes", () => {
  const rows = [
    {
      profile_id: "p1",
      print_artifact_id: "pa_badge01",
      label: "Badge",
      role: "faction_badge",
    },
    {
      profile_id: "p1",
      print_artifact_id: "pa_lore01",
      label: "Lore",
    },
  ];

  it("matches role, including default mobile_lore when role is omitted", () => {
    expect(
      findSeasonPrintArtifactEnrollment("p1", "pa_badge01", "faction_badge", rows)?.label
    ).toBe("Badge");
    expect(
      findSeasonPrintArtifactEnrollment("p1", "  pa_lore01  ", "mobile_lore", rows)?.label
    ).toBe("Lore");
    expect(findSeasonPrintArtifactEnrollment("p1", "pa_lore01", "faction_badge", rows)).toBeNull();
    expect(findSeasonPrintArtifactEnrollment("p1", "pa_badge01", "mobile_lore", rows)).toBeNull();
    expect(findSeasonPrintArtifactEnrollment("p1", "pa_badge01", null, rows)?.label).toBe("Badge");
  });

  it("returns null for missing artifact or profile mismatch", () => {
    expect(findSeasonPrintArtifactEnrollment("p1", null, null, rows)).toBeNull();
    expect(findSeasonPrintArtifactEnrollment("p1", "   ", null, rows)).toBeNull();
    expect(findSeasonPrintArtifactEnrollment("p2", "pa_lore01", null, rows)).toBeNull();
  });

  it("normalizes contribute site codes", () => {
    expect(normalizeSiteCode("  cr-relay-1n  ")).toBe("CR-RELAY-1N");
  });
});
