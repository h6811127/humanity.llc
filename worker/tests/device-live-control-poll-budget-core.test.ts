import { describe, expect, it } from "vitest";

import {
  isLiveControlAutoPollBudgetExhausted,
  LIVE_CONTROL_AUTO_POLL_DAILY_CAP,
  liveControlAutoPollCountToday,
  recordLiveControlAutoPoll,
} from "../../site/js/device-live-control-poll-budget-core.mjs";
import { REFERENCE_FREE_POLICY } from "../../site/js/device-steward-entitlements-core.mjs";

const HOSTED_POLICY = {
  ...REFERENCE_FREE_POLICY,
  pollLiveProofAutoDailyCap: 4000,
};

describe("liveControlAutoPollBudget", () => {
  it("starts at zero for a new day", () => {
    expect(liveControlAutoPollCountToday(null)).toBe(0);
  });

  it("increments and exhausts at free cap (400)", () => {
    let raw = null;
    for (let i = 0; i < 400; i += 1) {
      raw = recordLiveControlAutoPoll(raw);
    }
    expect(
      isLiveControlAutoPollBudgetExhausted(
        raw,
        Date.now(),
        REFERENCE_FREE_POLICY.pollLiveProofAutoDailyCap
      )
    ).toBe(true);
    expect(liveControlAutoPollCountToday(raw)).toBe(400);
  });

  it("exhausts at hosted cap (4000) when policy says so", () => {
    let raw = null;
    for (let i = 0; i < 4000; i += 1) {
      raw = recordLiveControlAutoPoll(raw);
    }
    expect(
      isLiveControlAutoPollBudgetExhausted(
        raw,
        Date.now(),
        HOSTED_POLICY.pollLiveProofAutoDailyCap
      )
    ).toBe(true);
    expect(liveControlAutoPollCountToday(raw)).toBe(4000);
    expect(
      isLiveControlAutoPollBudgetExhausted(raw, Date.now(), 4001)
    ).toBe(false);
  });

  it("defaults cap constant remains 400 for backward compatibility", () => {
    let raw = null;
    for (let i = 0; i < LIVE_CONTROL_AUTO_POLL_DAILY_CAP; i += 1) {
      raw = recordLiveControlAutoPoll(raw);
    }
    expect(isLiveControlAutoPollBudgetExhausted(raw)).toBe(true);
  });
});
