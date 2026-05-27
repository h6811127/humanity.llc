import { describe, expect, it } from "vitest";

import {
  HEALTH_SNAPSHOT_TTL_MS,
  isResolverSyncTabsEnabled,
  mergeNetworkSnapshotIntoCache,
  networkSnapshotOriginMatches,
  parseHealthSnapshotMessage,
  parseNetworkSnapshotMessage,
  RESOLVER_SYNC_SNAPSHOT_TTL_MS,
  shouldFollowerSkipHealthFetch,
  shouldFollowerSkipNetworkFetch,
  shouldIgnoreHealthSnapshotMessage,
} from "../../site/js/device-resolver-sync-core.mjs";

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
          cachedAt: 999,
          resolverConfirmed: true,
          alertState: "active",
        },
      ],
    });
    expect(parsed?.entries).toHaveLength(1);
    expect(parsed?.entries[0].profile_id).toBe("p1");
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

  it("merges snapshot rows into cache map", () => {
    const merged = mergeNetworkSnapshotIntoCache(
      {},
      [
        {
          profile_id: "p1",
          status: "active",
          scanKind: "active",
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
      verificationLabel: "Steward",
      at: 50,
    });
  });
});
