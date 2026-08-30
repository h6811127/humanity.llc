import { describe, expect, it } from "vitest";

import {
  deriveNodeBoardStates,
  matchesBoardStateFilters,
  matchesStateFilter,
} from "../../site/js/city-game-map-state-filter-core.mjs";

describe("deriveNodeBoardStates", () => {
  it("classifies missing snapshots from role only", () => {
    expect(deriveNodeBoardStates(null, "relay_gate")).toEqual(["needs_action"]);
    expect(deriveNodeBoardStates(null, "temp_drop")).toEqual(["needs_action"]);
    expect(deriveNodeBoardStates(undefined, "finale")).toEqual(["locked"]);
    expect(deriveNodeBoardStates(null, "lore_archive")).toEqual(["locked"]);
    expect(deriveNodeBoardStates(null, "sanctuary")).toEqual(["sanctuary_open"]);
    expect(deriveNodeBoardStates(null, "witness")).toEqual([]);
  });

  it("marks revoked, flagged, or chip-compromised nodes as compromised", () => {
    expect(deriveNodeBoardStates({ lifecycle: "revoked" }, "relay_gate")).toContain(
      "compromised"
    );
    expect(deriveNodeBoardStates({ compromised: true }, "relay_gate")).toContain(
      "compromised"
    );
    expect(
      deriveNodeBoardStates({ chips: [{ value: "Compromised seal" }] }, "relay_gate")
    ).toContain("compromised");
  });

  it("marks care_pause map mode or paused lifecycle as care_paused", () => {
    expect(deriveNodeBoardStates({ map_mode: "care_pause" }, "care_loop")).toEqual([
      "care_paused",
    ]);
    expect(deriveNodeBoardStates({ lifecycle: "paused" }, "care_loop")).toEqual([
      "care_paused",
    ]);
  });

  it("does not advertise sanctuary_open while care is paused", () => {
    expect(deriveNodeBoardStates({ map_mode: "care_pause" }, "sanctuary")).toEqual([
      "care_paused",
    ]);
    expect(deriveNodeBoardStates({ route_open: true }, "sanctuary")).toEqual([
      "unlocked",
      "sanctuary_open",
    ]);
  });

  it("derives unlocked, locked, and needs_action from chips and map mode", () => {
    expect(deriveNodeBoardStates({ route_open: true }, "witness")).toEqual(["unlocked"]);
    expect(
      deriveNodeBoardStates({ chips: [{ value: "Open · live" }] }, "witness")
    ).toEqual(["unlocked"]);
    expect(deriveNodeBoardStates({ map_mode: "dormant" }, "witness")).toEqual(["locked"]);
    expect(deriveNodeBoardStates({ map_mode: "quorum" }, "witness")).toEqual([
      "needs_action",
    ]);
    expect(
      deriveNodeBoardStates({ chips: [{ value: "unclaimed" }] }, "witness")
    ).toEqual(["locked", "needs_action"]);
  });

  it("falls back when a snapshot yields no states", () => {
    expect(deriveNodeBoardStates({}, "relay_gate")).toEqual(["needs_action"]);
    expect(deriveNodeBoardStates({}, "temp_drop")).toEqual(["needs_action"]);
    expect(deriveNodeBoardStates({}, "witness")).toEqual(["locked"]);
    expect(deriveNodeBoardStates({ chips: "not-an-array" }, "finale")).toEqual([
      "locked",
    ]);
  });

  it("records recently_changed independently of other states", () => {
    expect(
      deriveNodeBoardStates({ route_open: true, recently_changed: true }, "witness")
    ).toEqual(["changed_recently", "unlocked"]);
  });
});

describe("matchesStateFilter", () => {
  it("passes through all / empty / null filters", () => {
    expect(matchesStateFilter("locked compromised", "all")).toBe(true);
    expect(matchesStateFilter("locked", null)).toBe(true);
    expect(matchesStateFilter("locked", "")).toBe(true);
  });

  it("matches exact space-separated tokens only", () => {
    expect(matchesStateFilter("locked needs_action", "locked")).toBe(true);
    expect(matchesStateFilter("locked needs_action", "needs_action")).toBe(true);
    expect(matchesStateFilter("locked", "unlocked")).toBe(false);
    expect(matchesStateFilter(null, "locked")).toBe(false);
    expect(matchesStateFilter("  locked   compromised  ", "compromised")).toBe(true);
  });
});

describe("matchesBoardStateFilters", () => {
  it("ignores all/empty activeState and otherwise reads boardStates", () => {
    expect(
      matchesBoardStateFilters(
        { boardStates: "locked" },
        { activeState: "all" }
      )
    ).toBe(true);
    expect(
      matchesBoardStateFilters({ boardStates: "locked" }, { activeState: null })
    ).toBe(true);
    expect(
      matchesBoardStateFilters(
        { boardStates: "locked compromised" },
        { activeState: "compromised" }
      )
    ).toBe(true);
    expect(
      matchesBoardStateFilters(
        { boardStates: "locked" },
        { activeState: "unlocked" }
      )
    ).toBe(false);
  });
});
