import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isSetupDone,
  resolveCreatedMode,
  SETUP_DONE_KEY,
  syncSetupDoneForSavedProfile,
} from "../../site/js/created-mode.mjs";
import { stewardFocusKeyFromHash } from "../../site/js/created-tabs.mjs";

/** @type {Map<string, string>} */
let storage;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveCreatedMode", () => {
  it("returns view without profile or keys", () => {
    expect(
      resolveCreatedMode({
        profileId: null,
        hasSigningKeys: false,
      })
    ).toBe("view");
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: false,
      })
    ).toBe("view");
  });

  it("returns setup for fresh create or keys not saved on device", () => {
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        freshParam: true,
        setupDone: true,
        walletSaved: true,
      })
    ).toBe("setup");
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        setupDone: false,
        walletSaved: false,
      })
    ).toBe("setup");
  });

  it("stewardFocusKeyFromHash recognizes hub deep-link hashes", () => {
    expect(stewardFocusKeyFromHash("#revoke")).toBe("revoke");
    expect(stewardFocusKeyFromHash("#setup-qr")).toBe(null);
  });

  it("syncSetupDoneForSavedProfile backfills hc_setup_done when wallet has a row", () => {
    const profileId = "profile-backfill-test";
    storage.set(
      "hc_wallet",
      JSON.stringify([
        {
          id: "w1",
          profile_id: profileId,
          owner_private_key_b58: "priv",
          owner_public_key_b58: "pub",
        },
      ])
    );
    expect(isSetupDone(profileId)).toBe(false);
    syncSetupDoneForSavedProfile(profileId);
    expect(isSetupDone(profileId)).toBe(true);
    expect(JSON.parse(storage.get(SETUP_DONE_KEY) || "{}")[profileId]).toBe(true);
  });

  it("returns control for returning steward (saved on device, not fresh)", () => {
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        freshParam: false,
        setupDone: false,
        walletSaved: true,
      })
    ).toBe("control");
    expect(
      resolveCreatedMode({
        profileId: "abc",
        hasSigningKeys: true,
        freshParam: false,
        setupDone: true,
        walletSaved: true,
      })
    ).toBe("control");
  });
});
