import { describe, expect, it } from "vitest";

import {
  isLiveControlAutoPollBudgetExhausted,
  liveControlAutoPollCountToday,
  recordLiveControlAutoPoll,
} from "../../site/js/device-live-control-poll-budget-core.mjs";

describe("liveControlAutoPollBudget", () => {
  it("starts at zero for a new day", () => {
    expect(liveControlAutoPollCountToday(null)).toBe(0);
  });

  it("increments and exhausts at cap", () => {
    let raw = null;
    for (let i = 0; i < 400; i += 1) {
      raw = recordLiveControlAutoPoll(raw);
    }
    expect(isLiveControlAutoPollBudgetExhausted(raw)).toBe(true);
    expect(liveControlAutoPollCountToday(raw)).toBe(400);
  });
});
