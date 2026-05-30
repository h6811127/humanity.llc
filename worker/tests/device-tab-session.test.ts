import { describe, expect, it } from "vitest";

import {
  tabSessionHasSigningKeys,
  tabSessionReadAction,
  tabSessionSerializeForStore,
} from "../../site/js/device-tab-session-core.mjs";

describe("tabSessionHasSigningKeys", () => {
  it("accepts owner or recovery private material", () => {
    expect(tabSessionHasSigningKeys({ owner_private_key_b58: "k" })).toBe(true);
    expect(tabSessionHasSigningKeys({ recovery_private_key_b58: "r" })).toBe(true);
    expect(tabSessionHasSigningKeys({ profile_id: "p", handle: "h" })).toBe(false);
    expect(tabSessionHasSigningKeys(null)).toBe(false);
  });
});

describe("tabSessionSerializeForStore (P0-6)", () => {
  it("rejects metadata-only sessions", () => {
    expect(
      tabSessionSerializeForStore({
        profile_id: "PROFILE",
        handle: "demo",
        status: "active",
      })
    ).toEqual({ ok: false });
  });

  it("serializes sessions with signing keys", () => {
    const session = {
      profile_id: "PROFILE",
      owner_private_key_b58: "priv",
    };
    const packed = tabSessionSerializeForStore(session);
    expect(packed.ok).toBe(true);
    if (packed.ok) {
      expect(JSON.parse(packed.serialized)).toEqual(session);
    }
  });
});

describe("tabSessionReadAction", () => {
  it("strips keyless pollution from storage reads", () => {
    expect(
      tabSessionReadAction(
        JSON.stringify({ profile_id: "p", handle: "demo_d4c", status: "active" })
      )
    ).toEqual({ action: "strip" });
  });

  it("keeps valid signing sessions", () => {
    const session = { profile_id: "p", owner_private_key_b58: "k" };
    expect(tabSessionReadAction(JSON.stringify(session))).toEqual({
      action: "keep",
      session,
    });
  });
});
