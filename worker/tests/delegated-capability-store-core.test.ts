import { describe, expect, it, vi } from "vitest";

import {
  delegatedCapabilityStoreKey,
  readDelegatedCapabilitiesCache,
  writeDelegatedCapabilitiesCache,
} from "../../site/js/delegated-capability-store-core.mjs";

/**
 * @returns {Pick<Storage, "getItem" | "setItem"> & { store: Map<string, string> }}
 */
function memoryStorage() {
  const store = new Map();
  return {
    store,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

describe("delegated-capability-store-core", () => {
  it("namespaces cache keys by profile id", () => {
    expect(delegatedCapabilityStoreKey("prof_a")).toBe(
      "hc_delegated_capabilities_v1:prof_a"
    );
    expect(delegatedCapabilityStoreKey("prof_b")).not.toBe(
      delegatedCapabilityStoreKey("prof_a")
    );
  });

  it("round-trips capabilities and stamps updated_at", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T10:00:00.000Z"));
    const storage = memoryStorage();
    const caps = [
      { capability_id: "cap_1", status: "active" },
      { capability_id: "cap_2", status: "revoked" },
    ];

    writeDelegatedCapabilitiesCache(storage, "prof_roundtrip", caps);

    const raw = storage.getItem(delegatedCapabilityStoreKey("prof_roundtrip"));
    expect(JSON.parse(raw)).toEqual({
      updated_at: "2026-08-04T10:00:00.000Z",
      capabilities: caps,
    });
    expect(readDelegatedCapabilitiesCache(storage, "prof_roundtrip")).toEqual(caps);
    vi.useRealTimers();
  });

  it("isolates cache entries across profiles", () => {
    const storage = memoryStorage();
    writeDelegatedCapabilitiesCache(storage, "prof_a", [{ capability_id: "a" }]);
    writeDelegatedCapabilitiesCache(storage, "prof_b", [{ capability_id: "b" }]);

    expect(readDelegatedCapabilitiesCache(storage, "prof_a")).toEqual([
      { capability_id: "a" },
    ]);
    expect(readDelegatedCapabilitiesCache(storage, "prof_b")).toEqual([
      { capability_id: "b" },
    ]);
  });

  it("no-ops writes and returns [] for empty profile ids", () => {
    const storage = memoryStorage();
    writeDelegatedCapabilitiesCache(storage, "", [{ capability_id: "x" }]);
    expect(storage.store.size).toBe(0);
    expect(readDelegatedCapabilitiesCache(storage, "")).toEqual([]);
    expect(readDelegatedCapabilitiesCache(storage, null)).toEqual([]);
    expect(readDelegatedCapabilitiesCache(storage, undefined)).toEqual([]);
  });

  it("returns [] for missing, malformed, or non-array capability payloads", () => {
    const storage = memoryStorage();
    const key = delegatedCapabilityStoreKey("prof_bad");

    expect(readDelegatedCapabilitiesCache(storage, "prof_bad")).toEqual([]);

    storage.setItem(key, "{not-json");
    expect(readDelegatedCapabilitiesCache(storage, "prof_bad")).toEqual([]);

    storage.setItem(key, JSON.stringify({ updated_at: "2026-01-01T00:00:00Z" }));
    expect(readDelegatedCapabilitiesCache(storage, "prof_bad")).toEqual([]);

    storage.setItem(
      key,
      JSON.stringify({ updated_at: "2026-01-01T00:00:00Z", capabilities: { not: "array" } })
    );
    expect(readDelegatedCapabilitiesCache(storage, "prof_bad")).toEqual([]);

    storage.setItem(key, JSON.stringify({ capabilities: null }));
    expect(readDelegatedCapabilitiesCache(storage, "prof_bad")).toEqual([]);
  });

  it("survives storage.getItem throwing without leaking the error", () => {
    const storage = {
      getItem() {
        throw new Error("quota or private mode");
      },
      setItem() {},
    };
    expect(readDelegatedCapabilitiesCache(storage, "prof_throw")).toEqual([]);
  });
});
