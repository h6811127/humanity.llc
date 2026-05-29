import { describe, expect, it } from "vitest";
import {
  gatherInboxInput,
  getInboxDotOverlay,
  getInboxItems,
  notificationCount,
} from "../../site/js/device-inbox-loader.mjs";

describe("device-inbox-loader fallbacks", () => {
  it("returns safe defaults before inbox module loads", () => {
    expect(notificationCount()).toBe(0);
    expect(getInboxDotOverlay()).toBe("none");
    expect(getInboxItems()).toEqual([]);
    expect(gatherInboxInput().liveProofCount).toBe(0);
    expect(gatherInboxInput().tabNoticeCount).toBe(0);
  });
});
