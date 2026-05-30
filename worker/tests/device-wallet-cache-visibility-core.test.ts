import { describe, expect, it } from "vitest";

import {
  shouldInvalidateWalletCacheOnVisibility,
  walletCacheMemoStaleOnDisk,
} from "../../site/js/device-wallet-cache-visibility-core.mjs";

describe("walletCacheMemoStaleOnDisk (RC-16)", () => {
  it("detects disk eviction vs warm memo", () => {
    expect(walletCacheMemoStaleOnDisk('[{"id":"w1"}]', null)).toBe(true);
    expect(walletCacheMemoStaleOnDisk(null, null)).toBe(false);
    expect(walletCacheMemoStaleOnDisk(undefined, null)).toBe(false);
  });

  it("detects disk write after memo warmed", () => {
    const before = "[]";
    const after = '[{"id":"w1"}]';
    expect(walletCacheMemoStaleOnDisk(before, after)).toBe(true);
    expect(walletCacheMemoStaleOnDisk(after, after)).toBe(false);
  });
});

describe("shouldInvalidateWalletCacheOnVisibility (RC-16)", () => {
  it("invalidates when wallet or summary memo diverges from disk", () => {
    const disk = '[{"id":"w1"}]';
    expect(
      shouldInvalidateWalletCacheOnVisibility({
        memoWalletRaw: "[]",
        memoSummaryRaw: "[]",
        diskWalletRaw: disk,
      })
    ).toBe(true);
    expect(
      shouldInvalidateWalletCacheOnVisibility({
        memoWalletRaw: disk,
        memoSummaryRaw: "[]",
        diskWalletRaw: disk,
      })
    ).toBe(true);
    expect(
      shouldInvalidateWalletCacheOnVisibility({
        memoWalletRaw: disk,
        memoSummaryRaw: disk,
        diskWalletRaw: disk,
      })
    ).toBe(false);
  });
});
