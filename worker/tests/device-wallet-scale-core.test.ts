import { describe, expect, it } from "vitest";

import {
  LARGE_WALLET_THRESHOLD,
  isLargeWallet,
  largeWalletHint,
  selectLiveControlPollEntries,
  selectNetworkRefreshEntries,
  walletNetworkMaxParallel,
} from "../../site/js/device-wallet-scale-core.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "7Xk9mP2nQ4rT6vW8yZ1aB3cD6";

describe("isLargeWallet", () => {
  it("is false below threshold", () => {
    expect(isLargeWallet(LARGE_WALLET_THRESHOLD - 1)).toBe(false);
  });

  it("is true at threshold", () => {
    expect(isLargeWallet(LARGE_WALLET_THRESHOLD)).toBe(true);
  });
});

describe("selectLiveControlPollEntries", () => {
  const entries = [
    { profile_id: PROFILE_A },
    { profile_id: PROFILE_B },
    { profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD7" },
  ];

  it("returns all entries for small wallets", () => {
    expect(
      selectLiveControlPollEntries(entries, {
        walletSize: 3,
        activeProfileId: PROFILE_A,
        pendingProfileIds: [],
      })
    ).toEqual(entries);
  });

  it("narrows to active + pending when large", () => {
    const narrowed = selectLiveControlPollEntries(entries, {
      walletSize: LARGE_WALLET_THRESHOLD,
      activeProfileId: PROFILE_A,
      pendingProfileIds: [PROFILE_B],
    });
    expect(narrowed.map((e) => e.profile_id).sort()).toEqual(
      [PROFILE_A, PROFILE_B].sort()
    );
  });
});

describe("selectNetworkRefreshEntries", () => {
  const entries = [
    { profile_id: PROFILE_A },
    { profile_id: PROFILE_B },
  ];

  it("returns all stale rows for small wallets", () => {
    const stale = [{ profile_id: PROFILE_A }];
    expect(
      selectNetworkRefreshEntries(entries, {
        walletSize: 2,
        staleEntries: stale,
        cursor: 0,
      }).entries
    ).toEqual(stale);
  });

  it("round-robins one stale row when large", () => {
    const stale = [
      { profile_id: PROFILE_A },
      { profile_id: PROFILE_B },
    ];
    const first = selectNetworkRefreshEntries(entries, {
      walletSize: LARGE_WALLET_THRESHOLD,
      staleEntries: stale,
      cursor: 0,
    });
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0].profile_id).toBe(PROFILE_A);
    const second = selectNetworkRefreshEntries(entries, {
      walletSize: LARGE_WALLET_THRESHOLD,
      staleEntries: stale,
      cursor: first.nextCursor,
    });
    expect(second.entries[0].profile_id).toBe(PROFILE_B);
  });

  it("prefers active profile when stale", () => {
    const stale = [{ profile_id: PROFILE_B }];
    const picked = selectNetworkRefreshEntries(entries, {
      walletSize: LARGE_WALLET_THRESHOLD,
      staleEntries: stale,
      activeProfileId: PROFILE_A,
      cursor: 3,
    });
    expect(picked.entries[0].profile_id).toBe(PROFILE_B);
  });

  it("prefers visible stale row before round-robin cursor", () => {
    const stale = [
      { profile_id: PROFILE_A },
      { profile_id: PROFILE_B },
    ];
    const picked = selectNetworkRefreshEntries(entries, {
      walletSize: LARGE_WALLET_THRESHOLD,
      staleEntries: stale,
      visibleProfileIds: [PROFILE_B],
      cursor: 0,
    });
    expect(picked.entries[0].profile_id).toBe(PROFILE_B);
  });
});

describe("walletNetworkMaxParallel", () => {
  it("caps large wallet parallelism", () => {
    expect(walletNetworkMaxParallel(12)).toBe(2);
    expect(walletNetworkMaxParallel(12, { manual: true })).toBe(1);
    expect(walletNetworkMaxParallel(3)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("largeWalletHint", () => {
  it("returns copy at threshold", () => {
    expect(largeWalletHint(LARGE_WALLET_THRESHOLD)).toContain("Large wallet");
    expect(largeWalletHint(2)).toBeNull();
  });
});
