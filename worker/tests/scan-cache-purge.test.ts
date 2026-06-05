import { describe, expect, it, vi } from "vitest";

import {
  CACHE_ACTIVE,
  CACHE_NO_STORE,
  buildScanCachePurgeUrls,
  cacheControlForScanKind,
  purgeScanCacheUrls,
  qrIdsForScanCachePurge,
} from "../src/resolver/scan-cache-purge";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_A = "qr_7Xk9mP2nQ4rT6vW8";
const QR_B = "qr_8Yl0nQ3oR5sU7xX9zZ2bC4dE6";

describe("cacheControlForScanKind", () => {
  it("allows short must-revalidate cache only for active scans", () => {
    expect(cacheControlForScanKind("active")).toBe(CACHE_ACTIVE);
    expect(CACHE_ACTIVE).toContain("must-revalidate");
    expect(CACHE_ACTIVE).not.toContain("stale-while-revalidate");
    expect(cacheControlForScanKind("qr_revoked")).toBe(CACHE_NO_STORE);
    expect(cacheControlForScanKind("card_revoked")).toBe(CACHE_NO_STORE);
  });
});

describe("buildScanCachePurgeUrls", () => {
  it("includes scan HTML and status JSON for each qr", () => {
    const urls = buildScanCachePurgeUrls("https://humanity.llc", PROFILE, [
      QR_A,
      QR_B,
    ]);
    expect(urls).toContain(
      `https://humanity.llc/c/${PROFILE}?q=${QR_A}`
    );
    expect(urls).toContain(
      `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/status?q=${QR_A}`
    );
    expect(urls).toContain(
      `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/status`
    );
    expect(urls).toHaveLength(5);
  });
});

describe("purgeScanCacheUrls", () => {
  it("deletes each request from caches.default", async () => {
    const del = vi.fn(async () => true);
    vi.stubGlobal("caches", { default: { delete: del } });
    const purged = await purgeScanCacheUrls([
      `https://humanity.llc/c/${PROFILE}?q=${QR_A}`,
    ]);
    expect(purged).toBe(1);
    expect(del).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("qrIdsForScanCachePurge", () => {
  it("purges one qr for qr_credential revoke", async () => {
    const db = {} as D1Database;
    const ids = await qrIdsForScanCachePurge(
      db,
      PROFILE,
      "qr_credential",
      QR_A
    );
    expect(ids).toEqual([QR_A]);
  });

  it("lists all profile qrs for card revoke", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: [{ qr_id: QR_A }, { qr_id: QR_B }] }),
        }),
      }),
    } as unknown as D1Database;
    const ids = await qrIdsForScanCachePurge(db, PROFILE, "card", null);
    expect(ids).toEqual([QR_A, QR_B]);
  });
});
