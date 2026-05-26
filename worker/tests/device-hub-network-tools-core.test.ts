import { describe, expect, it } from "vitest";

import {
  formatHubNetworkStatusLine,
  formatLastCheckedRel,
  isWatchLiveProofEnabled,
} from "../../site/js/device-hub-network-tools-core.mjs";

describe("isWatchLiveProofEnabled", () => {
  it("defaults to on when storage unset", () => {
    expect(isWatchLiveProofEnabled(() => null)).toBe(true);
  });

  it("respects explicit off", () => {
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
});
