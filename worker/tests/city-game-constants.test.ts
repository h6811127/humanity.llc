import { describe, expect, it } from "vitest";

import {
  GAME_DISTRICTS,
  GAME_NODE_OBJECT_TYPE,
  GAME_NODE_ROLES,
  GAME_SEASON_ID_RE,
  isCityGameEnabled,
  isGameNodeRole,
} from "../src/city-game/constants";

describe("city-game constants", () => {
  it("gates the city game behind CITY_GAME_ENABLED=1", () => {
    expect(isCityGameEnabled({})).toBe(false);
    expect(isCityGameEnabled({ CITY_GAME_ENABLED: "0" })).toBe(false);
    expect(isCityGameEnabled({ CITY_GAME_ENABLED: "true" })).toBe(false);
    expect(isCityGameEnabled({ CITY_GAME_ENABLED: "1" })).toBe(true);
  });

  it("accepts only known game node roles", () => {
    expect(GAME_NODE_OBJECT_TYPE).toBe("game_node");
    expect(isGameNodeRole("relay_gate")).toBe(true);
    expect(isGameNodeRole("finale")).toBe(true);
    expect(isGameNodeRole("care_loop")).toBe(true);
    expect(isGameNodeRole("unknown_role")).toBe(false);
    expect(isGameNodeRole("Relay_Gate")).toBe(false);
    expect(GAME_NODE_ROLES).toContain("witness");
    expect(GAME_DISTRICTS).toContain("newbo");
  });

  it("validates season ids with the shared regex", () => {
    expect(GAME_SEASON_ID_RE.test("cr-season-01")).toBe(true);
    expect(GAME_SEASON_ID_RE.test("a")).toBe(true);
    expect(GAME_SEASON_ID_RE.test("season_with-underscore")).toBe(true);
    expect(GAME_SEASON_ID_RE.test("1bad")).toBe(false);
    expect(GAME_SEASON_ID_RE.test("BadCaps")).toBe(false);
    expect(GAME_SEASON_ID_RE.test("has space")).toBe(false);
    expect(GAME_SEASON_ID_RE.test("x".repeat(49))).toBe(false);
  });
});
