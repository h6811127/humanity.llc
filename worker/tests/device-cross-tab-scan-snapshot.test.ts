import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "7Xk9mP2nQ4rT6vW8yZ1aB3cD6";

let tabNotice = 0;
let otherTabs = [];

vi.mock("../../site/js/device-counts.mjs", () => {
  return {
    tabNoticeCount: () => tabNotice,
  };
});

vi.mock("../../site/js/device-tab-presence.mjs", () => {
  return {
    getOtherTabsWithKeys: () => otherTabs,
    getOrphanRemovedTabsWithKeys: () => [],
  };
});

import {
  getCrossTabScanSnapshot,
  invalidateCrossTabNotificationState,
} from "../../site/js/device-cross-tab-state.mjs";

describe("cross-tab scan snapshot (Phase 3)", () => {
  beforeEach(() => {
    tabNotice = 0;
    otherTabs = [
      {
        tabId: "t1",
        profile_id: PROFILE_B,
        label: "Tab B",
      },
    ];
    invalidateCrossTabNotificationState();
    vi.stubGlobal("document", {
      body: { dataset: { boot: "ready" } },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires two reads before showing scan entries", () => {
    const first = getCrossTabScanSnapshot();
    expect(first.show).toBe(false);
    expect(first.entries).toHaveLength(0);

    const second = getCrossTabScanSnapshot();
    expect(second.show).toBe(true);
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0]?.profile_id).toBe(PROFILE_B);
  });

  it("hides when fingerprint changes between reads", () => {
    const first = getCrossTabScanSnapshot();
    expect(first.show).toBe(false);

    const second = getCrossTabScanSnapshot();
    expect(second.show).toBe(true);

    otherTabs = [
      {
        tabId: "t2",
        profile_id: PROFILE_A,
        label: "Tab A",
      },
    ];
    const third = getCrossTabScanSnapshot();
    expect(third.show).toBe(false);
    expect(third.entries).toHaveLength(0);
  });
});

