import { describe, expect, it } from "vitest";

import {
  STATE_FILTER_CHIPS,
  buildStateFilterHtml,
  deriveNodeBoardStates,
  matchesBoardStateFilters,
  matchesStateFilter,
} from "../../site/js/city-game-map-state-filter-core.mjs";

describe("city-game-map-state-filter-core", () => {
  describe("buildStateFilterHtml", () => {
    it("renders All states pressed by default and escapes chip attributes", () => {
      const html = buildStateFilterHtml();
      expect(html).toContain('role="toolbar"');
      expect(html).toContain('aria-label="Filter by world state"');
      expect(html).toMatch(
        /data-state-filter="all"[^>]*aria-pressed="true"/
      );
      expect(html).toMatch(
        /data-state-filter="needs_action"[^>]*aria-pressed="false"/
      );
      for (const chip of STATE_FILTER_CHIPS) {
        expect(html).toContain(`data-state-filter="${chip.id}"`);
        expect(html).toContain(`data-filter-label="${chip.label}"`);
        expect(html).toContain(`>${chip.label}</button>`);
      }
    });
  });

  describe("deriveNodeBoardStates", () => {
    it("uses role fallbacks when snapshot is missing", () => {
      expect(deriveNodeBoardStates(null, "relay_gate")).toEqual(["needs_action"]);
      expect(deriveNodeBoardStates(undefined, "temp_drop")).toEqual(["needs_action"]);
      expect(deriveNodeBoardStates(null, "finale")).toEqual(["locked"]);
      expect(deriveNodeBoardStates(null, "lore_archive")).toEqual(["locked"]);
      expect(deriveNodeBoardStates(null, "sanctuary")).toEqual(["sanctuary_open"]);
      expect(deriveNodeBoardStates(null, "status_plate")).toEqual([]);
    });

    it("marks compromised from lifecycle, flag, or chip text", () => {
      expect(deriveNodeBoardStates({ lifecycle: "revoked" }, "status_plate")).toContain(
        "compromised"
      );
      expect(deriveNodeBoardStates({ compromised: true }, "status_plate")).toContain(
        "compromised"
      );
      expect(
        deriveNodeBoardStates(
          { chips: [{ kind: "alert", value: "Compromised signal" }] },
          "status_plate"
        )
      ).toContain("compromised");
    });

    it("marks care_paused from map_mode or lifecycle and suppresses sanctuary_open", () => {
      expect(deriveNodeBoardStates({ map_mode: "care_pause" }, "sanctuary")).toEqual([
        "care_paused",
      ]);
      expect(deriveNodeBoardStates({ lifecycle: "paused" }, "sanctuary")).toEqual([
        "care_paused",
      ]);
      expect(
        deriveNodeBoardStates({ map_mode: "care_pause", recently_changed: true }, "sanctuary")
      ).toEqual(["care_paused", "changed_recently"]);
    });

    it("derives unlocked, locked, and needs_action from route/chips/map_mode", () => {
      expect(
        deriveNodeBoardStates({ route_open: true }, "status_plate").sort()
      ).toEqual(["unlocked"]);
      expect(
        deriveNodeBoardStates(
          { chips: [{ value: "Open · live" }] },
          "status_plate"
        )
      ).toContain("unlocked");
      expect(
        deriveNodeBoardStates({ map_mode: "dormant" }, "status_plate")
      ).toContain("locked");
      expect(
        deriveNodeBoardStates(
          { chips: [{ value: "Sealed / dormant" }] },
          "status_plate"
        )
      ).toContain("locked");
      expect(
        deriveNodeBoardStates({ map_mode: "quorum" }, "status_plate")
      ).toContain("needs_action");
      expect(
        deriveNodeBoardStates({ map_mode: "fragment" }, "status_plate")
      ).toContain("needs_action");
      expect(
        deriveNodeBoardStates({ map_mode: "scarcity" }, "status_plate")
      ).toContain("needs_action");
      expect(
        deriveNodeBoardStates(
          { chips: [{ value: "Needs collective quorum" }] },
          "status_plate"
        )
      ).toContain("needs_action");
    });

    it("adds sanctuary_open for sanctuary roles that are not care-paused", () => {
      expect(
        deriveNodeBoardStates({ route_open: true }, "sanctuary").sort()
      ).toEqual(["sanctuary_open", "unlocked"]);
    });

    it("falls back when snapshot produces no matching signals", () => {
      expect(deriveNodeBoardStates({}, "relay_gate")).toEqual(["needs_action"]);
      expect(deriveNodeBoardStates({}, "temp_drop")).toEqual(["needs_action"]);
      expect(deriveNodeBoardStates({}, "status_plate")).toEqual(["locked"]);
      expect(deriveNodeBoardStates({ chips: "not-an-array" }, "status_plate")).toEqual([
        "locked",
      ]);
    });

    it("can accumulate multiple independent board states", () => {
      const states = deriveNodeBoardStates(
        {
          lifecycle: "revoked",
          map_mode: "quorum",
          route_open: true,
          recently_changed: true,
          chips: [{ value: "Locked · needs action" }],
        },
        "status_plate"
      );
      expect(states.sort()).toEqual(
        [
          "changed_recently",
          "compromised",
          "locked",
          "needs_action",
          "unlocked",
        ].sort()
      );
    });
  });

  describe("matchesStateFilter / matchesBoardStateFilters", () => {
    it("treats missing or all as match-everything", () => {
      expect(matchesStateFilter("locked unlocked", null)).toBe(true);
      expect(matchesStateFilter("locked unlocked", undefined)).toBe(true);
      expect(matchesStateFilter("locked unlocked", "all")).toBe(true);
      expect(matchesStateFilter("", "all")).toBe(true);
      expect(matchesBoardStateFilters({ boardStates: "locked" }, {})).toBe(true);
      expect(
        matchesBoardStateFilters({ boardStates: "locked" }, { activeState: "all" })
      ).toBe(true);
    });

    it("matches whitespace-delimited board state tokens exactly", () => {
      expect(matchesStateFilter("needs_action unlocked", "needs_action")).toBe(true);
      expect(matchesStateFilter("needs_action unlocked", "locked")).toBe(false);
      expect(matchesStateFilter("  locked   changed_recently  ", "changed_recently")).toBe(
        true
      );
      expect(matchesStateFilter(null, "locked")).toBe(false);
      expect(matchesStateFilter(undefined, "unlocked")).toBe(false);
      expect(
        matchesBoardStateFilters(
          { boardStates: "care_paused sanctuary_open" },
          { activeState: "sanctuary_open" }
        )
      ).toBe(true);
      expect(
        matchesBoardStateFilters(
          { boardStates: "care_paused" },
          { activeState: "sanctuary_open" }
        )
      ).toBe(false);
    });
  });
});
