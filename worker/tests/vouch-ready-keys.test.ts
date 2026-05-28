import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  clearDefaultVouchIfProfile,
  DEFAULT_VOUCH_PROFILE_KEY,
  getDefaultVouchProfileId,
  isDefaultVouchProfile,
  isVouchAutoActivateEnabled,
  setDefaultVouchProfile,
  VOUCH_AUTO_ACTIVATE_KEY,
} from "../../site/js/vouch-ready-keys.mjs";

describe("vouch-ready-keys settings", () => {
  /** @type {Map<string, string>} */
  let store;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  it("starts with no default and auto-activate off", () => {
    expect(getDefaultVouchProfileId()).toBeNull();
    expect(isVouchAutoActivateEnabled()).toBe(false);
    expect(isDefaultVouchProfile("abc")).toBe(false);
  });

  it("sets default profile and enables auto-activate", () => {
    setDefaultVouchProfile("cuAPt5nFYr8VCCWgPbAAupBS");
    expect(localStorage.getItem(DEFAULT_VOUCH_PROFILE_KEY)).toBe(
      "cuAPt5nFYr8VCCWgPbAAupBS"
    );
    expect(localStorage.getItem(VOUCH_AUTO_ACTIVATE_KEY)).toBe("1");
    expect(isVouchAutoActivateEnabled()).toBe(true);
    expect(isDefaultVouchProfile("cuAPt5nFYr8VCCWgPbAAupBS")).toBe(true);
  });

  it("clears default and auto-activate when profile is null", () => {
    setDefaultVouchProfile("profile_a");
    setDefaultVouchProfile(null);
    expect(getDefaultVouchProfileId()).toBeNull();
    expect(isVouchAutoActivateEnabled()).toBe(false);
  });

  it("clearDefaultVouchIfProfile only clears matching profile", () => {
    setDefaultVouchProfile("profile_a");
    clearDefaultVouchIfProfile("profile_b");
    expect(getDefaultVouchProfileId()).toBe("profile_a");
    clearDefaultVouchIfProfile("profile_a");
    expect(getDefaultVouchProfileId()).toBeNull();
  });
});
