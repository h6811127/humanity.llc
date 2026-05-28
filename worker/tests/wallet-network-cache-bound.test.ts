import { describe, expect, it } from "vitest";

import {
  pruneWalletNetworkCache,
  WALLET_NETWORK_CACHE_MAX_ENTRIES,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "../../site/js/device-wallet-network-core.mjs";

function entry(at: number, status = "active") {
  return { status, scanKind: "active", at };
}

describe("pruneWalletNetworkCache (S6)", () => {
  it("drops expired rows", () => {
    const now = 1_000_000;
    const cache = {
      fresh: entry(now - 1000),
      stale: entry(now - WALLET_NETWORK_CACHE_TTL_MS - 1),
    };
    const pruned = pruneWalletNetworkCache(cache, { now });
    expect(Object.keys(pruned)).toEqual(["fresh"]);
  });

  it("LRU-evicts oldest rows when over max entries", () => {
    const now = 2_000_000;
    /** @type {Record<string, ReturnType<typeof entry>>} */
    const cache = {};
    for (let i = 0; i < WALLET_NETWORK_CACHE_MAX_ENTRIES + 5; i += 1) {
      cache[`p${i}`] = entry(now - (WALLET_NETWORK_CACHE_MAX_ENTRIES + 5 - i) * 1000);
    }
    const pruned = pruneWalletNetworkCache(cache, { now });
    expect(Object.keys(pruned)).toHaveLength(WALLET_NETWORK_CACHE_MAX_ENTRIES);
    expect(pruned.p0).toBeUndefined();
    expect(pruned.p4).toBeUndefined();
    expect(pruned[`p${WALLET_NETWORK_CACHE_MAX_ENTRIES + 4}`]).toBeDefined();
  });

  it("protects wallet profile IDs until non-protected rows are evicted", () => {
    const now = 3_000_000;
    /** @type {Record<string, ReturnType<typeof entry>>} */
    const cache = {};
    for (let i = 0; i < WALLET_NETWORK_CACHE_MAX_ENTRIES + 3; i += 1) {
      cache[`p${i}`] = entry(now - (WALLET_NETWORK_CACHE_MAX_ENTRIES + 3 - i) * 1000);
    }
    const pruned = pruneWalletNetworkCache(cache, {
      now,
      protectProfileIds: ["p0", "p1"],
    });
    expect(Object.keys(pruned)).toHaveLength(WALLET_NETWORK_CACHE_MAX_ENTRIES);
    expect(pruned.p0).toBeDefined();
    expect(pruned.p1).toBeDefined();
    expect(pruned.p2).toBeUndefined();
  });
});
