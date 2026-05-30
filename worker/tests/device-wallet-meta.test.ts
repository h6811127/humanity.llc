import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { walletStorageFingerprint } from "../../site/js/device-wallet-summary-integrity-core.mjs";
import {
  findWalletEntryById,
  findWalletEntryByProfileId,
  getPollableWalletEntries,
  getWalletCount,
  getWalletEntrySummaries,
  getWalletEntrySummariesByProfileIds,
  getWalletPollableCount,
  getWalletSigningKeyCount,
  listPollableWalletEntries,
  listWalletDisplayEntries,
  loadWallet,
  loadWalletSummary,
  reconcileWalletSummaryIntegrity,
  resetWalletCachesForTests,
  saveWallet,
  syncWalletCacheFromDisk,
  WALLET_STORAGE_KEY,
  WALLET_SUMMARY_STORAGE_KEY,
} from "../../site/js/device-wallet.mjs";

const QR_A = "qr_xBZTq7M27tueCzBY";
const QR_B = "qr_E2eWakketTest9";

function entry(id: string, profileId: string, qrId: string | null, withKey = false) {
  return {
    id,
    profile_id: profileId,
    qr_id: qrId,
    label: `Card ${id}`,
    handle: `card-${id}`,
    owner_private_key_b58: withKey ? `private-${id}` : undefined,
  };
}

describe("device wallet metadata hot paths", () => {
  let localStore: Map<string, string>;

  beforeEach(() => {
    localStore = new Map();
    resetWalletCachesForTests();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        localStore.set(key, String(value));
      },
      removeItem: (key: string) => {
        localStore.delete(key);
      },
      clear: () => localStore.clear(),
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetWalletCachesForTests();
  });

  it("serves repeated count reads from wallet metadata without reparsing or copying keys", () => {
    localStore.set(
      WALLET_STORAGE_KEY,
      JSON.stringify([
        entry("a", "profile-meta-a", QR_A, true),
        entry("b", "profile-meta-b", null, false),
        {
          ...entry("c", "profile-meta-c", null, false),
          scan_url: `https://humanity.llc/c/profile-meta-c?q=${QR_B}`,
        },
      ])
    );
    const parseSpy = vi.spyOn(JSON, "parse");

    expect(getWalletCount()).toBe(3);
    expect(getWalletPollableCount()).toBe(2);
    expect(getWalletSigningKeyCount()).toBe(1);
    expect(parseSpy).toHaveBeenCalledTimes(1);

    parseSpy.mockClear();
    expect(getWalletCount()).toBe(3);
    expect(getWalletPollableCount()).toBe(2);
    expect(getWalletSigningKeyCount()).toBe(1);
    expect(parseSpy).not.toHaveBeenCalled();

    const summaries = getWalletEntrySummaries(2);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      id: "a",
      profile_id: "profile-meta-a",
      label: "Card a",
      handle: "card-a",
    });
    expect(summaries[0]).not.toHaveProperty("owner_private_key_b58");
  });

  it("keeps metadata in sync after saveWallet without requiring a fresh JSON parse", () => {
    const parseSpy = vi.spyOn(JSON, "parse");

    saveWallet([entry("saved", "profile-save-a", QR_A, true)]);
    parseSpy.mockClear();

    expect(getWalletCount()).toBe(1);
    expect(getWalletPollableCount()).toBe(1);
    expect(getWalletSigningKeyCount()).toBe(1);
    expect(parseSpy).not.toHaveBeenCalled();
    expect(findWalletEntryById("saved")?.owner_private_key_b58).toBe("private-saved");
    expect(findWalletEntryByProfileId("profile-save-a")?.id).toBe("saved");
    expect(getPollableWalletEntries()).toHaveLength(1);
  });

  it("hydrates only requested profile summaries for inbox rows", () => {
    localStore.set(
      WALLET_STORAGE_KEY,
      JSON.stringify([
        entry("a", "profile-summary-a", QR_A, true),
        entry("b", "profile-summary-b", QR_B, true),
      ])
    );

    expect(getWalletEntrySummariesByProfileIds(["profile-summary-b"])).toEqual([
      {
        id: "b",
        profile_id: "profile-summary-b",
        label: "Card b",
        handle: "card-b",
      },
    ]);
    expect(loadWallet()[0].owner_private_key_b58).toBe("private-a");
  });

  it("listWalletDisplayEntries omits private keys for hub row render", () => {
    localStore.set(
      WALLET_STORAGE_KEY,
      JSON.stringify([
        entry("a", "profile-hub-a", QR_A, true),
        entry("b", "profile-hub-b", null, false),
      ])
    );

    const rows = listWalletDisplayEntries();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "a",
      profile_id: "profile-hub-a",
      has_signing_key: true,
    });
    expect(rows[0]).not.toHaveProperty("owner_private_key_b58");
    expect(rows[1].has_signing_key).toBe(false);
  });

  it("listPollableWalletEntries omits private keys", () => {
    localStore.set(
      WALLET_STORAGE_KEY,
      JSON.stringify([
        entry("a", "profile-poll-a", QR_A, true),
        entry("b", "profile-poll-b", null, true),
      ])
    );

    const pollable = listPollableWalletEntries();
    expect(pollable).toHaveLength(1);
    expect(pollable[0]).toMatchObject({
      profile_id: "profile-poll-a",
      qr_id: QR_A,
      has_signing_key: true,
    });
    expect(pollable[0]).not.toHaveProperty("owner_private_key_b58");
  });

  it("loadWalletSummary rows carry qr_scope for collapsed hub object typing", () => {
    localStore.set(
      WALLET_STORAGE_KEY,
      JSON.stringify([
        {
          ...entry("root", "profile-root", QR_A, true),
          qr_scope: "card",
        },
        {
          ...entry("print", "profile-print", QR_B, true),
          qr_scope: "print_artifact",
        },
      ])
    );

    const summary = loadWalletSummary();
    expect(summary.rows).toMatchObject([
      { profile_id: "profile-root", qr_scope: "card" },
      { profile_id: "profile-print", qr_scope: "print_artifact" },
    ]);
    expect(summary.rows[0]).not.toHaveProperty("owner_private_key_b58");
  });

  it("reconcileWalletSummaryIntegrity rebuilds desynced hc_wallet_summary (RC-15)", () => {
    const wallet = JSON.stringify([entry("a", "profile-meta-a", QR_A, true)]);
    const fp = walletStorageFingerprint(wallet);
    localStore.set(WALLET_STORAGE_KEY, wallet);
    localStore.set(
      WALLET_SUMMARY_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        walletFingerprint: fp,
        count: 0,
        profileIds: [],
        signingKeyCount: 0,
        pollableCount: 0,
        stewardReady: false,
        rows: [],
      })
    );
    resetWalletCachesForTests();

    expect(reconcileWalletSummaryIntegrity()).toEqual({ repaired: true });
    expect(getWalletCount()).toBe(1);
    expect(reconcileWalletSummaryIntegrity()).toEqual({ repaired: false });
  });

  it("syncWalletCacheFromDisk drops stale memo after disk eviction (RC-16)", () => {
    const wallet = JSON.stringify([entry("a", "profile-meta-a", QR_A, true)]);
    localStore.set(WALLET_STORAGE_KEY, wallet);
    expect(loadWallet()).toHaveLength(1);
    localStore.delete(WALLET_STORAGE_KEY);

    expect(syncWalletCacheFromDisk()).toEqual({ invalidated: true });
    expect(getWalletCount()).toBe(0);
    expect(syncWalletCacheFromDisk()).toEqual({ invalidated: false });
  });
});
