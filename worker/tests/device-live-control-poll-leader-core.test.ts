import { describe, expect, it } from "vitest";

import {
  isLiveControlPollLeaderStale,
  shouldTabActAsLiveControlPollLeader,
} from "../../site/js/device-live-control-poll-leader-core.mjs";

describe("liveControlPollLeader", () => {
  it("allows claim when lock is stale", () => {
    const now = 100_000;
    expect(
      shouldTabActAsLiveControlPollLeader(
        { tabId: "other", at: now - 30_000 },
        "mine",
        now
      )
    ).toBe(true);
  });

  it("denies non-leader when lock is fresh", () => {
    const now = 100_000;
    expect(
      shouldTabActAsLiveControlPollLeader({ tabId: "other", at: now - 1000 }, "mine", now)
    ).toBe(false);
    expect(
      shouldTabActAsLiveControlPollLeader({ tabId: "mine", at: now - 1000 }, "mine", now)
    ).toBe(true);
  });

  it("detects stale locks", () => {
    expect(isLiveControlPollLeaderStale({ tabId: "a", at: 0 }, 25_000)).toBe(true);
    expect(isLiveControlPollLeaderStale({ tabId: "a", at: 20_000 }, 25_000)).toBe(false);
  });
});
