import { describe, expect, it, vi } from "vitest";

import {
  CARD_RESOLUTION_LIMIT_PER_MINUTE,
  checkCardResolutionRateLimit,
  hashIp,
} from "../src/db/rate-limit";
import { handleGetScanStatus } from "../src/resolver/scan-status";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function rateLimitDb(): D1Database {
  const store = new RateLimitBucketStore();
  return { prepare: (sql: string) => store.prepare(sql) } as unknown as D1Database;
}

describe("card resolution rate limit (O2 step 1)", () => {
  it("allows requests under the per-minute cap", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.10");
    for (let i = 0; i < 5; i += 1) {
      const rate = await checkCardResolutionRateLimit(database, ipHash);
      expect(rate.allowed).toBe(true);
    }
  });

  it("blocks at CARD_RESOLUTION_LIMIT_PER_MINUTE with retryAfterSec", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.11");
    const fixedNow = new Date("2026-05-27T12:34:56.000Z");

    for (let i = 0; i < CARD_RESOLUTION_LIMIT_PER_MINUTE; i += 1) {
      const rate = await checkCardResolutionRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkCardResolutionRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("handleGetScanStatus returns 429 RATE_LIMITED when cap exceeded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T12:00:00.000Z"));
    try {
      const database = rateLimitDb();
      const ip = "203.0.113.12";
      const ipHash = await hashIp(ip);
      const url = "https://humanity.llc/.well-known/hc/v1/cards/7Xk9mP2nQ4rT6vW8yZ1aB3cD5/status?q=qr_test";

      for (let i = 0; i < CARD_RESOLUTION_LIMIT_PER_MINUTE; i += 1) {
        await checkCardResolutionRateLimit(database, ipHash);
      }

      const res = await handleGetScanStatus(
        new Request(url, { headers: { "CF-Connecting-IP": ip } }),
        database,
        "7Xk9mP2nQ4rT6vW8yZ1aB3cD5"
      );
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeTruthy();
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("RATE_LIMITED");
    } finally {
      vi.useRealTimers();
    }
  });
});
