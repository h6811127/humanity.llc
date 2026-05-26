import { describe, expect, it } from "vitest";

import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_SHOW_MS,
  presenceMetadataFingerprint,
  shouldTouchPresenceRow,
} from "../../site/js/device-tab-presence-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

function entry(overrides = {}) {
  return {
    profile_id: PROFILE,
    qr_id: null,
    handle: null,
    label: "Card",
    updatedAt: 0,
    ...overrides,
  };
}

describe("presenceMetadataFingerprint", () => {
  it("changes when public metadata changes", () => {
    const a = entry({ label: "A" });
    const b = entry({ label: "B" });
    expect(presenceMetadataFingerprint(a)).not.toBe(presenceMetadataFingerprint(b));
  });
});

describe("shouldTouchPresenceRow", () => {
  it("always touches a new row", () => {
    expect(shouldTouchPresenceRow(undefined, entry(), 1000)).toBe(true);
  });

  it("touches when metadata fingerprint changes", () => {
    const existing = entry({ label: "A", updatedAt: 1000 });
    const next = entry({ label: "B", updatedAt: 5000 });
    expect(shouldTouchPresenceRow(existing, next, 5000)).toBe(true);
  });

  it("skips duplicate heartbeat when metadata unchanged", () => {
    const existing = entry({ updatedAt: 1000 });
    const next = entry({ updatedAt: 3000 });
    expect(shouldTouchPresenceRow(existing, next, 3000)).toBe(false);
  });

  it("touches before show window would expire", () => {
    const existing = entry({ updatedAt: 0 });
    const next = entry({ updatedAt: PRESENCE_SHOW_MS });
    expect(shouldTouchPresenceRow(existing, next, PRESENCE_SHOW_MS - 400)).toBe(true);
  });
});

describe("presence timing constants", () => {
  it("keeps show window wider than heartbeat", () => {
    expect(PRESENCE_SHOW_MS).toBeGreaterThan(PRESENCE_HEARTBEAT_MS);
    expect(PRESENCE_HEARTBEAT_MS).toBe(5000);
  });
});
