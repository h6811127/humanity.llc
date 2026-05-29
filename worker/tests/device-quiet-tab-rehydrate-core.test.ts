import { describe, expect, it } from "vitest";

import {
  shouldQuietTabRehydrate,
  soleSigningWalletEntry,
  walletEntriesWithSigningKeys,
} from "../../site/js/device-quiet-tab-rehydrate-core.mjs";

describe("device-quiet-tab-rehydrate-core", () => {
  it("filters wallet rows with signing material", () => {
    const entries = walletEntriesWithSigningKeys([
      { profile_id: "a", owner_private_key_b58: "k1" },
      { profile_id: "b" },
      { profile_id: "c", owner_private_key_b58: "k2" },
    ]);
    expect(entries).toHaveLength(2);
  });

  it("returns sole entry only when exactly one signing row", () => {
    expect(
      soleSigningWalletEntry([{ profile_id: "only", owner_private_key_b58: "k" }])
    ).toEqual({ profile_id: "only", owner_private_key_b58: "k" });
    expect(soleSigningWalletEntry([])).toBeNull();
    expect(
      soleSigningWalletEntry([
        { profile_id: "a", owner_private_key_b58: "k1" },
        { profile_id: "b", owner_private_key_b58: "k2" },
      ])
    ).toBeNull();
  });

  it("allows rehydrate for single saved card without tab control", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 1,
        requiresUnlock: false,
      })
    ).toBe(true);
  });

  it("skips when tab already has control", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: true,
        signingWalletCount: 1,
        requiresUnlock: false,
      })
    ).toBe(false);
  });

  it("skips for zero or multiple signing rows", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 0,
        requiresUnlock: false,
      })
    ).toBe(false);
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 2,
        requiresUnlock: false,
      })
    ).toBe(false);
  });

  it("skips when sign lock requires unlock", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 1,
        requiresUnlock: true,
      })
    ).toBe(false);
  });
});
