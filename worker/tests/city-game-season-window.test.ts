import { describe, expect, it } from "vitest";

import {
  isLocalSeasonPlayOverride,
  isSeasonContributeOpen,
  isSeasonPlayOpen,
  localSummerNodeCapOverride,
  resolveSeasonWindowPhase,
  seasonWindowChip,
  seasonWindowContributeMessage,
  seasonWindowScanNote,
} from "../src/city-game/season-window";

const TEST_WINDOW = {
  status: "planned" as const,
  window: {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-06-08T22:00:00-05:00",
  },
};

describe("season-window", () => {
  it("treats unset window as open for local dev", () => {
    expect(resolveSeasonWindowPhase(new Date(), { window: { starts_at: null, ends_at: null } })).toBe(
      "unset"
    );
    expect(isSeasonPlayOpen("unset")).toBe(true);
  });

  it("resolves before, open, and after phases", () => {
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-06T12:00:00-05:00"), TEST_WINDOW)
    ).toBe("before");
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-07T12:00:00-05:00"), TEST_WINDOW)
    ).toBe("open");
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-09T08:00:00-05:00"), TEST_WINDOW)
    ).toBe("after");
  });

  it("treats status ended as after even inside window", () => {
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-07T12:00:00-05:00"), {
        ...TEST_WINDOW,
        status: "ended",
      })
    ).toBe("after");
  });

  it("exposes scan and contribute copy for closed windows", () => {
    expect(seasonWindowChip("before", TEST_WINDOW)).toContain("Season opens");
    expect(seasonWindowChip("before", TEST_WINDOW)).toContain("Scans work now");
    expect(seasonWindowChip("after")).toContain("ended");
    expect(seasonWindowScanNote("after")).toContain("Season 1 has ended");
    expect(seasonWindowScanNote("before", TEST_WINDOW)).toContain("Scans work now");
    expect(seasonWindowContributeMessage("before")).toContain("not opened");
  });

  it("allows local contribute override before window when env flag set", () => {
    expect(isSeasonContributeOpen("before", { CITY_GAME_LOCAL_PLAY_OPEN: "1" })).toBe(true);
    expect(isSeasonContributeOpen("before", {})).toBe(false);
    expect(isSeasonContributeOpen("after", { CITY_GAME_LOCAL_PLAY_OPEN: "1" })).toBe(false);
    expect(isLocalSeasonPlayOverride({ CITY_GAME_LOCAL_PLAY_OPEN: "1" })).toBe(true);
  });

  it("parses local node cap override for worker:dev seeding", () => {
    expect(localSummerNodeCapOverride({})).toBeNull();
    expect(localSummerNodeCapOverride({ CITY_GAME_LOCAL_NODE_CAP: "60" })).toBe(60);
    expect(localSummerNodeCapOverride({ CITY_GAME_LOCAL_NODE_CAP: "0" })).toBeNull();
    expect(localSummerNodeCapOverride({ CITY_GAME_LOCAL_NODE_CAP: "abc" })).toBeNull();
  });
});
