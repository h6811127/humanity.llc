import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  controlActivationGateState,
  controlActivationRequiresUnlock,
} from "../../site/js/device-control-activation-core.mjs";
import {
  markSignUnlocked,
  setPinSignLock,
  VOUCH_SIGN_LOCKS_KEY,
} from "../../site/js/vouch-sign-lock.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";

describe("device-control-activation-core", () => {
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

  it("does not require unlock when no sign lock is configured", () => {
    expect(controlActivationRequiresUnlock(PROFILE)).toBe(false);
    expect(controlActivationGateState(PROFILE)).toEqual({
      requiresUnlock: false,
      unlocked: true,
    });
  });

  it("requires unlock when sign lock is enabled but tab is locked", async () => {
    await setPinSignLock(PROFILE, "1234");
    expect(controlActivationRequiresUnlock(PROFILE)).toBe(true);
    expect(controlActivationGateState(PROFILE)).toEqual({
      requiresUnlock: true,
      unlocked: false,
    });
  });

  it("treats tab as unlocked after successful unlock", async () => {
    await setPinSignLock(PROFILE, "1234");
    markSignUnlocked(PROFILE);
    expect(controlActivationRequiresUnlock(PROFILE)).toBe(false);
    expect(localStorage.getItem(VOUCH_SIGN_LOCKS_KEY)).toContain(PROFILE);
  });
});
