import { describe, expect, it } from "vitest";

import { shouldShowCrossTabKeysNotice } from "../../site/js/device-cross-tab-visibility.mjs";
import {
  otherTabSwitchConfirmMessage,
  resolveOtherTabKeysAction,
} from "../../site/js/device-notice-nav-logic.mjs";
import {
  listOtherTabsWithKeys,
  normalizePresenceMap,
  capPresenceMap,
  isValidPresenceProfileId,
  pruneStalePresence,
  PRESENCE_STALE_MS,
} from "../../site/js/device-tab-presence-core.mjs";

describe("pruneStalePresence", () => {
  it("removes entries without updatedAt", () => {
    const map = { a: { profile_id: "p1" } };
    expect(pruneStalePresence(map, 100_000, PRESENCE_STALE_MS)).toBe(true);
    expect(map).toEqual({});
  });

  it("removes entries older than staleMs", () => {
    const map = { a: { profile_id: "p1", updatedAt: 0 } };
    expect(pruneStalePresence(map, PRESENCE_STALE_MS + 1, PRESENCE_STALE_MS)).toBe(
      true
    );
    expect(map).toEqual({});
  });

  it("keeps fresh entries", () => {
    const map = { a: { profile_id: "p1", updatedAt: 90_000 } };
    expect(pruneStalePresence(map, 100_000, PRESENCE_STALE_MS)).toBe(false);
    expect(map.a?.profile_id).toBe("p1");
  });
});

describe("listOtherTabsWithKeys", () => {
  const now = 100_000;
  const validProfile = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

  it("excludes self, stale rows, invalid profile ids, and same profile as this tab", () => {
    const map = {
      self: { profile_id: validProfile, updatedAt: now },
      other: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6", updatedAt: now, label: "B" },
      stale: { profile_id: validProfile, updatedAt: 0 },
      same: { profile_id: validProfile, updatedAt: now },
      bad: { profile_id: "not-valid!!!", updatedAt: now },
    };
    const { others } = listOtherTabsWithKeys({
      map,
      tabId: "self",
      thisProfile: validProfile,
      now,
    });
    expect(others).toHaveLength(1);
    expect(others[0]?.tabId).toBe("other");
  });

  it("sorts by updatedAt descending", () => {
    const map = {
      self: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5", updatedAt: now },
      a: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6", updatedAt: now - 1000 },
      b: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD7", updatedAt: now },
    };
    const { others } = listOtherTabsWithKeys({
      map,
      tabId: "self",
      thisProfile: null,
      now,
    });
    expect(others.map((o) => o.tabId)).toEqual(["b", "a"]);
  });
});

describe("shouldShowCrossTabKeysNotice", () => {
  it("requires other tabs and no unsaved-keys notice in this tab", () => {
    expect(shouldShowCrossTabKeysNotice(1, 0)).toBe(true);
    expect(shouldShowCrossTabKeysNotice(1, 1)).toBe(false);
    expect(shouldShowCrossTabKeysNotice(0, 0)).toBe(false);
  });
});

describe("resolveOtherTabKeysAction", () => {
  const entry = { profile_id: "profile-b" };

  it("dismisses when this tab already has keys for the same profile", () => {
    expect(
      resolveOtherTabKeysAction({
        session: { profile_id: "profile-b", owner_private_key_b58: "k" },
        entry,
        hasWalletEntry: false,
      })
    ).toEqual({ kind: "dismiss" });
  });

  it("opens wallet when saved and this tab has no keys", () => {
    expect(
      resolveOtherTabKeysAction({
        session: null,
        entry,
        hasWalletEntry: true,
      })
    ).toEqual({ kind: "open-wallet" });
  });

  it("focus-only when no wallet and no keys here", () => {
    expect(
      resolveOtherTabKeysAction({
        session: null,
        entry,
        hasWalletEntry: false,
      })
    ).toEqual({ kind: "focus-only" });
  });

  it("requires confirm before focus when this tab has different keys", () => {
    expect(
      resolveOtherTabKeysAction({
        session: { profile_id: "profile-a", owner_private_key_b58: "k" },
        entry,
        hasWalletEntry: false,
      })
    ).toEqual({ kind: "focus-only", needsConfirm: true });
  });

  it("loads wallet after confirm when saved and this tab has different keys", () => {
    expect(
      resolveOtherTabKeysAction({
        session: { profile_id: "profile-a", owner_private_key_b58: "k" },
        entry,
        hasWalletEntry: true,
      })
    ).toEqual({ kind: "focus-then-open-wallet", needsConfirm: true });
  });
});

describe("presence map hardening", () => {
  it("validates profile_id shape", () => {
    expect(isValidPresenceProfileId("7Xk9mP2nQ4rT6vW8yZ1aB3cD5")).toBe(true);
    expect(isValidPresenceProfileId("bad id")).toBe(false);
    expect(isValidPresenceProfileId("")).toBe(false);
  });

  it("drops invalid rows and caps entry count", () => {
    const now = 100_000;
    const map = {};
    for (let i = 0; i < 25; i++) {
      map[`t${i}`] = {
        profile_id: `7Xk9mP2nQ4rT6vW8yZ1aB3c${String(i).padStart(2, "0")}`,
        updatedAt: now - i,
      };
    }
    map.bad = { profile_id: "!!!", updatedAt: now };
    const normalized = normalizePresenceMap(map, now);
    expect(Object.keys(normalized).length).toBeLessThanOrEqual(20);
    expect(normalized.bad).toBeUndefined();
  });

  it("caps presence map to newest entries", () => {
    const map = {
      a: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5", updatedAt: 1 },
      b: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6", updatedAt: 3 },
      c: { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD7", updatedAt: 2 },
    };
    const capped = capPresenceMap(map, 2);
    expect(Object.keys(capped)).toEqual(["b", "c"]);
  });
});

describe("otherTabSwitchConfirmMessage", () => {
  it("mentions both profile ids", () => {
    const msg = otherTabSwitchConfirmMessage(
      { profile_id: "aaaaaaaaaaaa" },
      { profile_id: "bbbbbbbbbbbb" }
    );
    expect(msg).toContain("aaaaaaaaaaaa");
    expect(msg).toContain("bbbbbbbbbbbb");
  });
});
