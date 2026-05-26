import { describe, expect, it } from "vitest";

import { shouldSkipPresenceHeartbeat } from "../../site/js/device-tab-presence-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("shouldSkipPresenceHeartbeat", () => {
  it("never skips when session has no keys (clear path)", () => {
    expect(shouldSkipPresenceHeartbeat({}, "tab-a", false)).toBe(false);
  });

  it("skips when only this tab would be in the map", () => {
    const now = Date.now();
    expect(
      shouldSkipPresenceHeartbeat(
        {
          "tab-a": {
            profile_id: PROFILE,
            updatedAt: now,
          },
        },
        "tab-a",
        true,
        now
      )
    ).toBe(true);
  });

  it("runs when another tab is present", () => {
    const now = Date.now();
    expect(
      shouldSkipPresenceHeartbeat(
        {
          "tab-a": { profile_id: PROFILE, updatedAt: now },
          "tab-b": { profile_id: PROFILE, updatedAt: now },
        },
        "tab-a",
        true,
        now
      )
    ).toBe(false);
  });
});
