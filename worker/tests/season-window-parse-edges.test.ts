import { describe, expect, it } from "vitest";

import {
  formatSeasonOpenDate,
  isLocalSeasonPlayOverride,
  isSeasonContributeOpen,
  isSeasonPlayOpen,
  localSummerNodeCapOverride,
  resolveSeasonWindowPhase,
  seasonWindowChip,
  seasonWindowContributeMessage,
  seasonWindowOnboardingStatus,
  seasonWindowScanNote,
} from "../src/city-game/season-window";

const WINDOW = {
  status: "planned" as const,
  window: {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-06-08T22:00:00-05:00",
  },
};

describe("season-window parse and bound edges", () => {
  it("treats the start and end instants as open (exclusive bounds)", () => {
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-06T18:00:00-05:00"), WINDOW)
    ).toBe("open");
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-08T22:00:00-05:00"), WINDOW)
    ).toBe("open");
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-08T22:00:00.001-05:00"), WINDOW)
    ).toBe("after");
  });

  it("swallows malformed ISO window strings instead of throwing", () => {
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-07T12:00:00-05:00"), {
        status: "planned",
        window: {
          starts_at: "2026-06-06 18:00:00-05:00",
          ends_at: "not-a-date",
        },
      })
    ).toBe("open");
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-07T12:00:00-05:00"), {
        status: "planned",
        window: {
          starts_at: "2026-06-06T18:00:00",
          ends_at: "2026-06-08T22:00:00-05:00",
        },
      })
    ).toBe("open");
  });

  it("uses a lone valid end date when start is missing or unparseable", () => {
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-09T00:00:00-05:00"), {
        status: "planned",
        window: { starts_at: null, ends_at: "2026-06-08T22:00:00-05:00" },
      })
    ).toBe("after");
    expect(
      resolveSeasonWindowPhase(new Date("2026-06-07T12:00:00-05:00"), {
        status: "planned",
        window: { starts_at: "   ", ends_at: "2026-06-08T22:00:00-05:00" },
      })
    ).toBe("open");
  });

  it("formats the Chicago open date and returns null for invalid ISO", () => {
    expect(formatSeasonOpenDate("2026-06-06T18:00:00-05:00")).toBe(
      "Jun 6, 6:00 PM CDT"
    );
    expect(formatSeasonOpenDate("2026-06-06T18:00:00")).toBeNull();
    expect(formatSeasonOpenDate("")).toBeNull();
    expect(formatSeasonOpenDate(null)).toBeNull();
  });

  it("keeps pre-season chip/onboarding copy when the open date is missing", () => {
    expect(seasonWindowChip("before")).toBe("Season opens soon. Scans work now.");
    expect(seasonWindowChip("open")).toBeNull();
    expect(seasonWindowChip("unset")).toBeNull();
    expect(seasonWindowOnboardingStatus("unset")).toContain("Season open");
    expect(seasonWindowOnboardingStatus("after")).toContain("Season ended");
    expect(seasonWindowScanNote("open")).toBeNull();
    expect(seasonWindowContributeMessage("after")).toContain("contributions are paused");
  });

  it("gates local play override and node-cap parse tightly", () => {
    expect(isLocalSeasonPlayOverride({ CITY_GAME_LOCAL_PLAY_OPEN: "1" })).toBe(true);
    expect(isLocalSeasonPlayOverride({ CITY_GAME_LOCAL_PLAY_OPEN: "true" })).toBe(
      false
    );
    expect(isLocalSeasonPlayOverride({ CITY_GAME_LOCAL_PLAY_OPEN: "TRUE" })).toBe(
      false
    );
    expect(isSeasonContributeOpen("after", { CITY_GAME_LOCAL_PLAY_OPEN: "true" })).toBe(
      false
    );
    expect(isSeasonPlayOpen("after")).toBe(false);
    expect(localSummerNodeCapOverride({ CITY_GAME_LOCAL_NODE_CAP: " 60 " })).toBe(60);
    expect(localSummerNodeCapOverride({ CITY_GAME_LOCAL_NODE_CAP: "-3" })).toBeNull();
    expect(localSummerNodeCapOverride({ CITY_GAME_LOCAL_NODE_CAP: "" })).toBeNull();
  });
});
