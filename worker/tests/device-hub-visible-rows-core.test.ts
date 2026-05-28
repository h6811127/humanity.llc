import { describe, expect, it } from "vitest";

import {
  expandSummaryRowLimitForVisible,
  isScrollNearBottom,
  nextSummaryRowWindowLimit,
  orderEntriesVisibleFirst,
  profileIdsWithVisibleRows,
  summaryRowLimitAfterViewportLoad,
  summaryRowLoadIncrement,
  visibleSummaryRowWindow,
} from "../../site/js/device-hub-visible-rows-core.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "7Xk9mP2nQ4rT6vW8yZ1aB3cD6";

describe("profileIdsWithVisibleRows", () => {
  it("returns ids intersecting viewport", () => {
    const ids = profileIdsWithVisibleRows(
      [
        { profileId: PROFILE_A, top: 10, bottom: 50 },
        { profileId: PROFILE_B, top: 200, bottom: 240 },
      ],
      { top: 0, bottom: 100 }
    );
    expect(ids).toEqual([PROFILE_A]);
  });
});

describe("orderEntriesVisibleFirst", () => {
  it("moves visible profiles before others", () => {
    const entries = [
      { profile_id: PROFILE_B },
      { profile_id: PROFILE_A },
    ];
    expect(
      orderEntriesVisibleFirst(entries, [PROFILE_A]).map((e) => e.profile_id)
    ).toEqual([PROFILE_A, PROFILE_B]);
  });

  it("returns original order when none visible", () => {
    const entries = [{ profile_id: PROFILE_A }];
    expect(orderEntriesVisibleFirst(entries, [])).toEqual(entries);
  });
});

describe("visibleSummaryRowWindow", () => {
  it("returns the initial visible row window and remaining count", () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({ profile_id: `p${i}` }));
    const window = visibleSummaryRowWindow(entries, { limit: 8 });
    expect(window.rows).toHaveLength(8);
    expect(window.rows[0].profile_id).toBe("p0");
    expect(window.remaining).toBe(4);
  });

  it("handles zero or overlarge limits", () => {
    const entries = [{ profile_id: PROFILE_A }];
    expect(visibleSummaryRowWindow(entries, { limit: 0 })).toEqual({
      rows: [],
      remaining: 1,
    });
    expect(visibleSummaryRowWindow(entries, { limit: 99 })).toEqual({
      rows: entries,
      remaining: 0,
    });
  });
});

describe("isScrollNearBottom", () => {
  it("returns false when content fits without scrolling", () => {
    expect(
      isScrollNearBottom({ scrollTop: 0, scrollHeight: 400, clientHeight: 400 })
    ).toBe(false);
  });

  it("returns true within threshold of bottom", () => {
    expect(
      isScrollNearBottom({ scrollTop: 280, scrollHeight: 400, clientHeight: 100 }, 120)
    ).toBe(true);
  });
});

describe("nextSummaryRowWindowLimit", () => {
  it("caps at total count", () => {
    expect(nextSummaryRowWindowLimit(8, 8, 12)).toBe(12);
    expect(nextSummaryRowWindowLimit(10, 8, 12)).toBe(12);
  });
});

describe("summaryRowLoadIncrement", () => {
  it("never exceeds remaining rows", () => {
    expect(summaryRowLoadIncrement(3, 8)).toBe(3);
    expect(summaryRowLoadIncrement(12, 8)).toBe(8);
  });
});

describe("expandSummaryRowLimitForVisible", () => {
  it("extends the window to include visible profile indices", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ profile_id: `p${i}` }));
    expect(
      expandSummaryRowLimitForVisible(entries, 8, ["p10"], { overscan: 2 })
    ).toBe(13);
  });

  it("keeps current limit when nothing is visible", () => {
    const entries = [{ profile_id: PROFILE_A }];
    expect(expandSummaryRowLimitForVisible(entries, 8, [])).toBe(1);
  });
});

describe("summaryRowLimitAfterViewportLoad", () => {
  it("increments on near-end scroll", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ profile_id: `p${i}` }));
    expect(
      summaryRowLimitAfterViewportLoad(entries, 8, {
        visibleProfileIds: [],
        nearEnd: true,
        increment: 8,
      })
    ).toBe(16);
  });
});
