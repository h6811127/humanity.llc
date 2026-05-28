import { describe, expect, it } from "vitest";

import {
  isLiveControlPollLeaderStale,
  shouldIgnoreLiveControlSnapshotFromSameTab,
  shouldTabActAsLiveControlPollLeader,
} from "../../site/js/device-live-control-poll-leader-core.mjs";
import {
  HUB_NETWORK_CHECKED_AT_SESSION_KEY,
  LIVE_PROOF_CHECKED_AT_SESSION_KEY,
} from "../../site/js/device-hub-network-tools-core.mjs";

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

  it("ignores live-control snapshots from the same tab", () => {
    expect(shouldIgnoreLiveControlSnapshotFromSameTab("tab-a", "tab-a")).toBe(true);
    expect(shouldIgnoreLiveControlSnapshotFromSameTab("tab-a", "tab-b")).toBe(false);
    expect(shouldIgnoreLiveControlSnapshotFromSameTab("", "tab-b")).toBe(false);
  });
});

describe("hub monitoring session keys", () => {
  it("documents cross-tab checked-at storage keys", () => {
    expect(HUB_NETWORK_CHECKED_AT_SESSION_KEY).toBe("hc_hub_network_checked_at");
    expect(LIVE_PROOF_CHECKED_AT_SESSION_KEY).toBe("hc_live_proof_checked_at");
  });
});
