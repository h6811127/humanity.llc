import { describe, expect, it } from "vitest";

import {
  isSeasonPlayOpen,
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
    expect(seasonWindowChip("before")).toContain("not open");
    expect(seasonWindowChip("after")).toContain("ended");
    expect(seasonWindowScanNote("after")).toContain("Season 1 has ended");
    expect(seasonWindowContributeMessage("before")).toContain("not opened");
  });
});
