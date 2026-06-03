import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CrSeasonConfig } from "../src/city-game/season-config";
import {
  defaultSeason,
  isSeasonRootProfile,
  registerSeasonConfig,
  registeredSeasonIds,
  resetSeasonRegistryForTests,
  resolveSeasonById,
  resolveSeasonByRootProfile,
  resolveSeasonForProfile,
} from "../src/city-game/season-loader";

const PILOT = defaultSeason();

const TEST_SEASON_02: CrSeasonConfig = {
  season_id: "test_season_02_spike",
  status: "planned",
  season_root_profile_id: "9Zz8Yy7Xx6Ww5Vv4Uu3Tt2Ss1Rr0Qq",
  window: { starts_at: null, ends_at: null },
  nodes: [
    {
      node_id: "node_01",
      object_id: "obj_test_node_01",
      role: "relay_gate",
      district: "downtown",
      label: "Test relay",
    },
  ],
  unlock_edges: [],
  automation: {
    quorum_nodes: ["node_01"],
    fragment_nodes: [],
    finale_node: "node_01",
    witness_scarcity_node: "node_01",
  },
};

describe("city game season loader (R-11)", () => {
  beforeEach(() => {
    resetSeasonRegistryForTests();
  });

  afterEach(() => {
    resetSeasonRegistryForTests();
  });

  it("resolves bundled pilot season by id", () => {
    expect(resolveSeasonById(PILOT.season_id)).toBe(PILOT);
    expect(resolveSeasonById("unknown_season")).toBeNull();
  });

  it("bundled registry includes template example city season", () => {
    expect(registeredSeasonIds()).toContain("example_city_season_01");
    expect(resolveSeasonById("example_city_season_01")?.rules_path).toBe("/play/example-city/");
  });

  it("registers a second season by root profile without colliding ids", () => {
    registerSeasonConfig(TEST_SEASON_02);

    expect(registeredSeasonIds()).toContain(PILOT.season_id);
    expect(registeredSeasonIds()).toContain(TEST_SEASON_02.season_id);

    expect(resolveSeasonById(TEST_SEASON_02.season_id)).toBe(TEST_SEASON_02);
    expect(resolveSeasonByRootProfile(TEST_SEASON_02.season_root_profile_id!)).toBe(
      TEST_SEASON_02
    );
    expect(resolveSeasonByRootProfile("not-a-root")).toBeNull();
  });

  it("resolveSeasonForProfile resolves bound pilot root or returns null for unknown profiles", () => {
    const root = PILOT.season_root_profile_id?.trim();
    expect(root).toBeTruthy();
    expect(resolveSeasonForProfile("unknown-profile")).toBeNull();
    expect(resolveSeasonForProfile(root!)).toBe(PILOT);

    registerSeasonConfig(TEST_SEASON_02);
    expect(resolveSeasonForProfile(TEST_SEASON_02.season_root_profile_id!)).toBe(
      TEST_SEASON_02
    );
  });

  it("isSeasonRootProfile matches bound root only; unbound seasons stay open", () => {
    const root = PILOT.season_root_profile_id?.trim();
    expect(root).toBeTruthy();
    expect(isSeasonRootProfile(root!, PILOT)).toBe(true);
    expect(isSeasonRootProfile("any", PILOT)).toBe(false);

    const unbound = { ...PILOT, season_root_profile_id: null };
    expect(isSeasonRootProfile("any", unbound)).toBe(true);

    const bound = { ...PILOT, season_root_profile_id: "rootA" };
    expect(isSeasonRootProfile("rootA", bound)).toBe(true);
    expect(isSeasonRootProfile("rootB", bound)).toBe(false);
  });
});
