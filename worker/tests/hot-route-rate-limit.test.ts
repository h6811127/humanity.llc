import { describe, expect, it, vi } from "vitest";

import {
  checkLiveControlGetRateLimit,
  checkResolverHealthRateLimit,
  hashIp,
  LIVE_CONTROL_GET_LIMIT_PER_MINUTE,
  RESOLVER_HEALTH_LIMIT_PER_MINUTE,
} from "../src/db/rate-limit";
import { handleGetPendingLiveControlChallenge } from "../src/resolver/live-control";
import { handleGetResolverHealth } from "../src/resolver/resolver-health";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function rateLimitDb(): D1Database {
  const store = new RateLimitBucketStore();
  return { prepare: (sql: string) => store.prepare(sql) } as unknown as D1Database;
}

describe("live-control GET rate limit (O2 step 2)", () => {
  it("blocks at LIVE_CONTROL_GET_LIMIT_PER_MINUTE", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.20");
    const fixedNow = new Date("2026-05-28T10:15:00.000Z");

    for (let i = 0; i < LIVE_CONTROL_GET_LIMIT_PER_MINUTE; i += 1) {
      const rate = await checkLiveControlGetRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkLiveControlGetRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("handleGetPendingLiveControlChallenge returns 429 when cap exceeded", async () => {
    const database = rateLimitDb();
    const ip = "203.0.113.21";
    const ipHash = await hashIp(ip);
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const url = `https://humanity.llc/.well-known/hc/v1/cards/${profileId}/live-control/challenges?qr_id=qr_test`;

    for (let i = 0; i < LIVE_CONTROL_GET_LIMIT_PER_MINUTE; i += 1) {
      await checkLiveControlGetRateLimit(database, ipHash);
    }

    const res = await handleGetPendingLiveControlChallenge(
      new Request(url, { headers: { "CF-Connecting-IP": ip } }),
      database,
      profileId
    );
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("RATE_LIMITED");
  });
});

describe("resolver health rate limit (O2 step 2)", () => {
  it("blocks at RESOLVER_HEALTH_LIMIT_PER_MINUTE", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.22");
    const fixedNow = new Date("2026-05-28T10:20:00.000Z");

    for (let i = 0; i < RESOLVER_HEALTH_LIMIT_PER_MINUTE; i += 1) {
      const rate = await checkResolverHealthRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkResolverHealthRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
  });

  it("handleGetResolverHealth returns 429 when cap exceeded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-28T10:00:00.000Z"));
    try {
      const database = rateLimitDb();
      const ip = "203.0.113.23";
      const ipHash = await hashIp(ip);

      for (let i = 0; i < RESOLVER_HEALTH_LIMIT_PER_MINUTE; i += 1) {
        await checkResolverHealthRateLimit(database, ipHash);
      }

      const res = await handleGetResolverHealth(
        new Request("https://humanity.llc/.well-known/hc/v1/health", {
          headers: { "CF-Connecting-IP": ip },
        }),
        { DB: database } as import("../src/env").Env
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
