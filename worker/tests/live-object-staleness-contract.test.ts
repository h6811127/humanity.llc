import { describe, expect, it } from "vitest";

import {
  buildScanFreshnessPayload,
  maxAgeSecondsFromCacheControl,
  STALE_DISCLOSURE_CACHE,
  STALE_DISCLOSURE_RESOLVER,
} from "../src/live-object/staleness-contract";
import { CACHE_ACTIVE, CACHE_INACTIVE } from "../src/resolver/scan-state";

describe("staleness contract (Order 6)", () => {
  it("parses max-age from cache-control", () => {
    expect(maxAgeSecondsFromCacheControl(CACHE_ACTIVE)).toBe(30);
    expect(maxAgeSecondsFromCacheControl(CACHE_INACTIVE)).toBe(60);
  });

  it("builds resolver freshness payload for active scans", () => {
    const now = new Date("2026-06-07T18:00:00.000Z");
    const payload = buildScanFreshnessPayload({
      now,
      cacheControl: CACHE_ACTIVE,
      kind: "active",
    });
    expect(payload.fetched_at).toBe("2026-06-07T18:00:00.000Z");
    expect(payload.max_age_seconds).toBe(30);
    expect(payload.source).toBe("resolver");
    expect(payload.stale_disclosure).toBe(STALE_DISCLOSURE_RESOLVER);
  });

  it("uses cache disclosure when source is cache", () => {
    const payload = buildScanFreshnessPayload({
      kind: "active",
      source: "cache",
    });
    expect(payload.stale_disclosure).toBe(STALE_DISCLOSURE_CACHE);
    expect(payload.source).toBe("cache");
  });
});
