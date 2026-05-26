import { describe, expect, it } from "vitest";

import {
  formatHubNetworkStatusLine,
  formatLastCheckedRel,
  isWatchLiveProofEnabled,
  shouldScheduleWalletNetworkFetchAfterHubRender,
  walletHubNetworkFetchScopeActive,
} from "../../site/js/device-hub-network-tools-core.mjs";

describe("isWatchLiveProofEnabled", () => {
  it("defaults to off when storage unset", () => {
    expect(isWatchLiveProofEnabled(() => null)).toBe(false);
  });

  it("requires explicit opt-in", () => {
    expect(isWatchLiveProofEnabled(() => "0")).toBe(false);
    expect(isWatchLiveProofEnabled(() => "1")).toBe(true);
  });
});

describe("formatLastCheckedRel", () => {
  it("returns null when never checked", () => {
    expect(formatLastCheckedRel(0, 1000)).toBeNull();
  });

  it("formats recent checks", () => {
    expect(formatLastCheckedRel(1000, 1030)).toBe("just now");
    expect(formatLastCheckedRel(1000, 121_000)).toBe("2 min ago");
  });
});

describe("walletHubNetworkFetchScopeActive (Safari P1)", () => {
  it("is active on wallet page or expanded hub", () => {
    expect(walletHubNetworkFetchScopeActive({ onWalletPage: true, hubExpanded: false })).toBe(
      true
    );
    expect(walletHubNetworkFetchScopeActive({ onWalletPage: false, hubExpanded: true })).toBe(
      true
    );
    expect(walletHubNetworkFetchScopeActive({ onWalletPage: false, hubExpanded: false })).toBe(
      false
    );
  });

  it("skips fetch scheduling when hub collapsed on landing", () => {
    expect(
      shouldScheduleWalletNetworkFetchAfterHubRender({
        fetchNetworkStatus: true,
        onWalletPage: false,
        hubExpanded: false,
      })
    ).toBe(false);
  });

  it("schedules on wallet page even when hub element is collapsed", () => {
    expect(
      shouldScheduleWalletNetworkFetchAfterHubRender({
        fetchNetworkStatus: true,
        onWalletPage: true,
        hubExpanded: false,
      })
    ).toBe(true);
  });
});

describe("formatHubNetworkStatusLine", () => {
  it("combines network and live proof timestamps", () => {
    const line = formatHubNetworkStatusLine({
      networkCheckedAt: 1000,
      liveProofCheckedAt: 2000,
      now: 130_000,
    });
    expect(line).toContain("Network checked");
    expect(line).toContain("Live proof checked");
  });

  it("shows placeholder when nothing checked", () => {
    expect(formatHubNetworkStatusLine({})).toBe("Not checked yet this visit");
  });

  it("shows budget paused copy when watch on and cap hit", () => {
    const line = formatHubNetworkStatusLine({
      autoPollBudgetPaused: true,
      liveProofWatchOn: true,
    });
    expect(line).toContain("paused for today");
  });
});
