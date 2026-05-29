import { describe, expect, it } from "vitest";
import {
  HUB_STRANGER_EMPTY_CLASS,
  isHubStrangerEmptyState,
} from "../../site/js/device-hub-stranger-empty-core.mjs";

describe("device-hub-stranger-empty-core", () => {
  it("is true only when wallet, pins, and inbox actions are all zero", () => {
    expect(isHubStrangerEmptyState({})).toBe(true);
    expect(isHubStrangerEmptyState({ walletCount: 0, pinCount: 0, inboxActionCount: 0 })).toBe(
      true
    );
    expect(isHubStrangerEmptyState({ walletCount: 1 })).toBe(false);
    expect(isHubStrangerEmptyState({ pinCount: 1 })).toBe(false);
    expect(isHubStrangerEmptyState({ inboxActionCount: 1 })).toBe(false);
  });

  it("exports stable root class name", () => {
    expect(HUB_STRANGER_EMPTY_CLASS).toBe("device-hub--stranger-empty");
  });
});
