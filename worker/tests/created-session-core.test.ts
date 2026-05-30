import { describe, expect, it } from "vitest";

import {
  CREATED_SESSION_STORAGE_KEY,
  sanitizeCreatedSessionForStorage,
  sessionHasTabSigningKey,
  shouldPersistCreatedSession,
} from "../../site/js/created-session-core.mjs";

describe("created-session-core (P0-6)", () => {
  it("sessionHasTabSigningKey accepts owner or recovery private keys", () => {
    expect(sessionHasTabSigningKey(null)).toBe(false);
    expect(sessionHasTabSigningKey({ profile_id: "abc", handle: "x" })).toBe(false);
    expect(
      sessionHasTabSigningKey({
        profile_id: "abc",
        owner_private_key_b58: "privkey",
      })
    ).toBe(true);
    expect(
      sessionHasTabSigningKey({
        profile_id: "abc",
        recovery_private_key_b58: "recpriv",
      })
    ).toBe(true);
  });

  it("shouldPersistCreatedSession rejects metadata-only payloads", () => {
    expect(
      shouldPersistCreatedSession({
        profile_id: "abc",
        handle: "demo",
        manifesto_line: "line",
        status: "active",
      })
    ).toBe(false);
    expect(CREATED_SESSION_STORAGE_KEY).toBe("hc_created");
    expect(
      sanitizeCreatedSessionForStorage({
        profile_id: "abc",
        owner_private_key_b58: "priv",
      })
    ).toEqual({ profile_id: "abc", owner_private_key_b58: "priv" });
    expect(
      sanitizeCreatedSessionForStorage({
        profile_id: "abc",
        handle: "demo",
      })
    ).toBe(null);
  });
});
