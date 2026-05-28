import { describe, expect, it } from "vitest";

import {
  HEALTH_SNAPSHOT_TTL_MS,
  isResolverSyncTabsEnabled,
  mergeNetworkSnapshotIntoCache,
  networkSnapshotOriginMatches,
  parseHealthSnapshotMessage,
  parseLiveControlSnapshotMessage,
  parseNetworkSnapshotMessage,
  RESOLVER_SYNC_CHANNEL,
  RESOLVER_SYNC_SNAPSHOT_TTL_MS,
  shouldFollowerSkipHealthFetch,
  shouldFollowerSkipNetworkFetch,
  shouldIgnoreHealthSnapshotMessage,
} from "../../site/js/device-resolver-sync-core.mjs";
import { WALLET_NETWORK_CACHE_MAX_ENTRIES } from "../../site/js/device-wallet-network-core.mjs";

describe("device-resolver-sync-core", () => {
  it("defaults sync on unless pref is 0", () => {
    expect(isResolverSyncTabsEnabled(null)).toBe(true);
    expect(isResolverSyncTabsEnabled("1")).toBe(true);
    expect(isResolverSyncTabsEnabled("0")).toBe(false);
  });

  it("parses valid network-snapshot messages", () => {
    const parsed = parseNetworkSnapshotMessage({
      type: "network-snapshot",
      tabId: "tab-a",
      at: 1000,
      origin: "https://api.example",
      entries: [
        {
          profile_id: "p1",
          status: "active",
          scanKind: "active",
          qrScope: "print_artifact",
          cachedAt: 999,
          resolverConfirmed: true,
          alertState: "active",
        },
      ],
    });
    expect(parsed?.entries).toHaveLength(1);
    expect(parsed?.entries[0].profile_id).toBe("p1");
    expect(parsed?.entries[0].qrScope).toBe("print_artifact");
  });

  it("rejects invalid snapshot payloads", () => {
    expect(parseNetworkSnapshotMessage({ type: "other" })).toBeNull();
    expect(parseNetworkSnapshotMessage({ type: "network-snapshot", entries: [] })).toBeNull();
  });

  it("skips auto fetch when snapshot is fresh (sync on)", () => {
    const now = 100_000;
    expect(
      shouldFollowerSkipNetworkFetch({
        syncEnabled: true,
        isLeader: false,
        snapshotAt: now - 30_000,
        now,
        ttlMs: RESOLVER_SYNC_SNAPSHOT_TTL_MS,
      })
    ).toBe(true);
    expect(
      shouldFollowerSkipNetworkFetch({
        syncEnabled: true,
        isLeader: false,
        snapshotAt: now - 90_000,
        now,
        ttlMs: RESOLVER_SYNC_SNAPSHOT_TTL_MS,
      })
    ).toBe(false);
    expect(
      shouldFollowerSkipNetworkFetch({
        syncEnabled: false,
        isLeader: false,
        snapshotAt: now - 1000,
        now,
      })
    ).toBe(false);
  });

  it("matches snapshot origin to local resolver origin", () => {
    expect(networkSnapshotOriginMatches("https://a", "https://a")).toBe(true);
    expect(networkSnapshotOriginMatches("https://a", "https://b")).toBe(false);
  });

  it("parses health-snapshot messages", () => {
    const parsed = parseHealthSnapshotMessage({
      type: "health-snapshot",
      tabId: "tab-b",
      at: 2000,
      status: "degraded",
    });
    expect(parsed?.status).toBe("degraded");
    expect(parseHealthSnapshotMessage({ type: "health-snapshot", status: "ok" })).toBeNull();
  });

  it("skips follower health fetch when snapshot is fresh", () => {
    const now = 50_000;
    expect(
      shouldFollowerSkipHealthFetch({
        syncEnabled: true,
        isLeader: false,
        snapshotAt: now - 10_000,
        now,
        ttlMs: HEALTH_SNAPSHOT_TTL_MS,
      })
    ).toBe(true);
  });

  it("ignores duplicate health snapshots", () => {
    expect(shouldIgnoreHealthSnapshotMessage(1000, 1000)).toBe(true);
    expect(shouldIgnoreHealthSnapshotMessage(1001, 1000)).toBe(false);
  });

  it("uses unified resolver sync channel name", () => {
    expect(RESOLVER_SYNC_CHANNEL).toBe("hc-resolver-sync");
  });

  it("parses live-control-snapshot on unified channel", () => {
    const parsed = parseLiveControlSnapshotMessage({
      type: "live-control-snapshot",
      tabId: "tab-c",
      at: 3000,
      pending: [{ challenge_id: "c1" }],
      health: "ok",
    });
    expect(parsed?.type).toBe("live-control-snapshot");
    expect(parsed?.pending).toHaveLength(1);
    expect(parseLiveControlSnapshotMessage({ type: "snapshot", tabId: "t", at: 1 })).toEqual(
      expect.objectContaining({ type: "live-control-snapshot", tabId: "t", at: 1 })
    );
  });

  it("merges snapshot rows into cache map", () => {
    const merged = mergeNetworkSnapshotIntoCache(
      {},
      [
        {
          profile_id: "p1",
          status: "active",
          scanKind: "active",
          qrScope: "print_artifact",
          verification: { label: "Steward", state: "steward" },
          cachedAt: 50,
          resolverConfirmed: true,
          alertState: "active",
        },
      ],
      100
    );
    expect(merged.p1).toMatchObject({
      status: "active",
      scanKind: "active",
      qrScope: "print_artifact",
      verificationLabel: "Steward",
      at: 50,
    });
  });

  it("bounds merged cache to WALLET_NETWORK_CACHE_MAX_ENTRIES", () => {
    const now = 5_000_000;
    /** @type {Record<string, { status: string; scanKind: string; at: number }>} */
    const existing = {};
    for (let i = 0; i < 25; i += 1) {
      existing[`old${i}`] = { status: "active", scanKind: "active", at: now - 60_000 - i };
    }
    const rows = [
      {
        profile_id: "leader-new",
        status: "active",
        scanKind: "active",
        cachedAt: now,
        resolverConfirmed: true,
      },
    ];
    const merged = mergeNetworkSnapshotIntoCache(existing, rows, now);
    expect(Object.keys(merged).length).toBeLessThanOrEqual(WALLET_NETWORK_CACHE_MAX_ENTRIES);
    expect(merged["leader-new"]).toBeDefined();
  });
});
