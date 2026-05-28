import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  clearSignLock,
  getSignLock,
  isSignLockEnabled,
  isSignUnlocked,
  markSignUnlocked,
  setPinSignLock,
  verifyPinSignLock,
  VOUCH_SIGN_LOCKS_KEY,
} from "../../site/js/vouch-sign-lock.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";

describe("vouch-sign-lock", () => {
  /** @type {Map<string, string>} */
  let localStore;
  /** @type {Map<string, string>} */
  let sessionStore;

  beforeEach(() => {
    localStore = new Map();
    sessionStore = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => {
        localStore.set(key, String(value));
      },
      removeItem: (key) => {
        localStore.delete(key);
      },
      clear: () => localStore.clear(),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key) => sessionStore.get(key) ?? null,
      setItem: (key, value) => {
        sessionStore.set(key, String(value));
      },
      removeItem: (key) => {
        sessionStore.delete(key);
      },
      clear: () => sessionStore.clear(),
    });
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  it("stores and verifies a PIN lock", async () => {
    const set = await setPinSignLock(PROFILE, "1234");
    expect(set.ok).toBe(true);
    expect(isSignLockEnabled(PROFILE)).toBe(true);
    expect(getSignLock(PROFILE)?.mode).toBe("pin");
    expect(isSignUnlocked(PROFILE)).toBe(false);

    const bad = await verifyPinSignLock(PROFILE, "0000");
    expect(bad.ok).toBeUndefined();
    expect(bad.error).toContain("Incorrect PIN");

    const good = await verifyPinSignLock(PROFILE, "1234");
    expect(good.ok).toBe(true);
    expect(isSignUnlocked(PROFILE)).toBe(true);
  });

  it("clears lock and unlock state", async () => {
    await setPinSignLock(PROFILE, "1234");
    markSignUnlocked(PROFILE);
    expect(isSignUnlocked(PROFILE)).toBe(true);

    clearSignLock(PROFILE);
    expect(localStorage.getItem(VOUCH_SIGN_LOCKS_KEY)).toBe("{}");
    expect(isSignLockEnabled(PROFILE)).toBe(false);
    expect(isSignUnlocked(PROFILE)).toBe(true);
  });
});
