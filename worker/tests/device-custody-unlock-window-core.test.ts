import { describe, expect, it } from "vitest";

import {
  DEVICE_UNLOCK_WINDOW_MS,
  deviceUnlockWindowExpiresAt,
  deviceUnlockWindowMatchesEntry,
  isDeviceUnlockWindowValid,
  parseDeviceUnlockWindowCache,
  sessionFromDeviceUnlockWindow,
} from "../../site/js/device-custody-unlock-window-core.mjs";

describe("device-custody-unlock-window-core", () => {
  it("validates window expiry", () => {
    const now = 1_000_000;
    expect(isDeviceUnlockWindowValid(now + 1000, now)).toBe(true);
    expect(isDeviceUnlockWindowValid(now - 1, now)).toBe(false);
    expect(isDeviceUnlockWindowValid(undefined, now)).toBe(false);
  });

  it("computes default window length", () => {
    const now = 5_000_000;
    expect(deviceUnlockWindowExpiresAt(now)).toBe(now + DEVICE_UNLOCK_WINDOW_MS);
  });

  it("parses session cache", () => {
    const now = 10_000;
    const valid = parseDeviceUnlockWindowCache(
      {
        profile_id: "p1",
        owner_private_key_b58: "secret",
        granted_until: now + 60_000,
      },
      now
    );
    expect(valid?.profile_id).toBe("p1");
    expect(
      parseDeviceUnlockWindowCache(
        { profile_id: "p1", owner_private_key_b58: "k", granted_until: now - 1 },
        now
      )
    ).toBeNull();
  });

  it("builds activation session from cache", () => {
    const entry = { profile_id: "p1", wrapped_owner_key: { credential_id: "c" } };
    const cache = {
      profile_id: "p1",
      owner_private_key_b58: "k",
      granted_until: 99,
    };
    expect(deviceUnlockWindowMatchesEntry(entry, cache)).toBe(true);
    expect(deviceUnlockWindowMatchesEntry({ profile_id: "other" }, cache)).toBe(false);
    expect(sessionFromDeviceUnlockWindow(entry, cache).owner_private_key_b58).toBe("k");
  });
});
