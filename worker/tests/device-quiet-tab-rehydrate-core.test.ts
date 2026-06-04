import { describe, expect, it } from "vitest";

import {
  filterCrossTabEntriesAfterQuietRehydrate,
  quietRehydrateBlockedByOtherTabPresence,
  quietRehydrateBlockedOnScanForDifferentCard,
  quietRehydrateBlockedForUrlProfile,
  resolveQuietTabRehydrateTarget,
  shouldQuietTabRehydrate,
  soleSigningWalletEntry,
  walletEntriesWithSigningKeys,
} from "../../site/js/device-quiet-tab-rehydrate-core.mjs";
import { quietTabRehydrateEnabledFromStorage } from "../../site/js/device-quiet-tab-rehydrate-prefs.mjs";

describe("device-quiet-tab-rehydrate-core", () => {
  it("filters wallet rows with signing material", () => {
    const entries = walletEntriesWithSigningKeys([
      { profile_id: "a", owner_private_key_b58: "k1" },
      { profile_id: "b" },
      { profile_id: "c", owner_private_key_b58: "k2" },
      {
        profile_id: "d",
        custody_mode: "device_unlock",
        wrapped_owner_key: {
          version: 1,
          credential_id: "cred",
          prf_salt: "salt",
          iv: "iv",
          ciphertext: "cipher",
        },
      },
    ]);
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.profile_id)).toEqual(["a", "c"]);
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

  it("resolves single-card target without last-active", () => {
    const wallet = [{ profile_id: "only", owner_private_key_b58: "k" }];
    expect(resolveQuietTabRehydrateTarget(wallet, null)).toEqual(wallet[0]);
  });

  it("resolves multi-card target from last-active profile id", () => {
    const wallet = [
      { profile_id: "a", owner_private_key_b58: "k1" },
      { profile_id: "b", owner_private_key_b58: "k2" },
    ];
    expect(resolveQuietTabRehydrateTarget(wallet, "b")).toEqual(wallet[1]);
    expect(resolveQuietTabRehydrateTarget(wallet, "missing")).toEqual(wallet[0]);
    expect(resolveQuietTabRehydrateTarget(wallet, null)).toEqual(wallet[0]);
  });

  it("excludes scan vouchee profile from quiet rehydrate target", () => {
    const wallet = [
      { profile_id: "steward", owner_private_key_b58: "k1" },
      { profile_id: "vouchee", owner_private_key_b58: "k2" },
    ];
    expect(resolveQuietTabRehydrateTarget(wallet, "vouchee", "vouchee")).toEqual(
      wallet[0]
    );
    expect(resolveQuietTabRehydrateTarget(wallet, null, "vouchee")).toEqual(
      wallet[0]
    );
    expect(resolveQuietTabRehydrateTarget(wallet, "vouchee", "vouchee")).toEqual(
      wallet[0]
    );
    expect(
      resolveQuietTabRehydrateTarget(
        [{ profile_id: "only", owner_private_key_b58: "k" }],
        null,
        "only"
      )
    ).toBeNull();
  });

  it("allows rehydrate for single saved card without tab control", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 1,
        targetEntry: { profile_id: "only" },
        requiresUnlock: false,
      })
    ).toBe(true);
  });

  it("allows multi-card rehydrate when toggle on and target resolved", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 2,
        targetEntry: { profile_id: "b" },
        requiresUnlock: false,
        quietRehydrateEnabled: true,
      })
    ).toBe(true);
  });

  it("skips multi-card rehydrate when toggle off", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 2,
        targetEntry: { profile_id: "b" },
        requiresUnlock: false,
        quietRehydrateEnabled: false,
      })
    ).toBe(false);
  });

  it("skips when tab already has control", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: true,
        signingWalletCount: 1,
        targetEntry: { profile_id: "only" },
        requiresUnlock: false,
      })
    ).toBe(false);
  });

  it("skips for zero signing rows or missing target", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 0,
        targetEntry: null,
        requiresUnlock: false,
      })
    ).toBe(false);
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 2,
        targetEntry: null,
        requiresUnlock: false,
        quietRehydrateEnabled: true,
      })
    ).toBe(false);
  });

  it("skips when sign lock requires unlock", () => {
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 1,
        targetEntry: { profile_id: "only" },
        requiresUnlock: true,
      })
    ).toBe(false);
  });

  it("blocks scan rehydrate when vouchee profile differs from sole saved card", () => {
    const entry = { profile_id: "saved_card", owner_private_key_b58: "k" };
    expect(
      quietRehydrateBlockedOnScanForDifferentCard(entry, "scanned_card")
    ).toBe(true);
    expect(quietRehydrateBlockedOnScanForDifferentCard(entry, "saved_card")).toBe(
      false
    );
  });

  it("blocks rehydrate when another tab already heartbeats the target profile", () => {
    const map = {
      "tab-a": { profile_id: "card_a", updatedAt: Date.now() },
      "tab-b": { profile_id: "card_a", updatedAt: Date.now() },
    };
    expect(
      quietRehydrateBlockedByOtherTabPresence(map, "card_a", "tab-a")
    ).toBe(true);
    expect(
      quietRehydrateBlockedByOtherTabPresence(map, "card_a", "tab-b")
    ).toBe(true);
  });

  it("blocks rehydrate when /created/ URL profile differs from sole saved card", () => {
    const entry = { profile_id: "saved_other", owner_private_key_b58: "k" };
    expect(quietRehydrateBlockedForUrlProfile(entry, "url_card")).toBe(true);
    expect(quietRehydrateBlockedForUrlProfile(entry, "saved_other")).toBe(false);
    expect(quietRehydrateBlockedForUrlProfile(entry, null)).toBe(false);
    expect(
      shouldQuietTabRehydrate({
        hasTabControl: false,
        signingWalletCount: 1,
        targetEntry: entry,
        requiresUnlock: false,
        urlProfileId: "url_card",
      })
    ).toBe(false);
  });

  it("filters cross-tab rows for quietly rehydrated profile only", () => {
    const entries = [
      { tabId: "t1", profile_id: "rehydrated" },
      { tabId: "t2", profile_id: "unsaved-other" },
    ];
    expect(
      filterCrossTabEntriesAfterQuietRehydrate(entries, {
        quietRehydratedProfileId: "rehydrated",
        thisTabProfileId: "rehydrated",
      })
    ).toEqual([{ tabId: "t2", profile_id: "unsaved-other" }]);
  });

  it("keeps all entries when no quiet rehydrate context", () => {
    const entries = [{ tabId: "t1", profile_id: "a" }];
    expect(filterCrossTabEntriesAfterQuietRehydrate(entries, {})).toEqual(entries);
  });
});

describe("device-quiet-tab-rehydrate-prefs", () => {
  it("defaults quiet rehydrate on unless explicitly off", () => {
    expect(quietTabRehydrateEnabledFromStorage(null)).toBe(true);
    expect(quietTabRehydrateEnabledFromStorage("1")).toBe(true);
    expect(quietTabRehydrateEnabledFromStorage("0")).toBe(false);
  });
});
