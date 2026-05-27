import { describe, expect, it } from "vitest";

import {
  DEMO_CREATE_LIMIT_PER_HOUR,
  DEMO_ORPHAN_MIN_AGE_DAYS,
  isDemoHandle,
} from "../src/demo-card-policy";
import { checkDemoCreateRateLimit, hashIp } from "../src/db/rate-limit";

describe("demo card policy", () => {
  it("recognizes demo and legacy live_demo handles", () => {
    expect(isDemoHandle("demo_abc")).toBe(true);
    expect(isDemoHandle("live_demo_xwr")).toBe(true);
    expect(isDemoHandle("studio_door")).toBe(false);
  });

  it("exports demo limits", () => {
    expect(DEMO_CREATE_LIMIT_PER_HOUR).toBe(5);
    expect(DEMO_ORPHAN_MIN_AGE_DAYS).toBe(7);
  });
});

class FakeDemoRateDb {
  private readonly buckets = new Map<string, { count: number; window_start: string }>();

  prepare(sql: string) {
    const buckets = this.buckets;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("SELECT count FROM rate_limit_buckets")) {
              const key = args[0] as string;
              const row = buckets.get(key);
              return (row ? { count: row.count } : null) as T | null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.includes("UPDATE rate_limit_buckets")) {
              const key = args[0] as string;
              const existing = buckets.get(key);
              if (existing) existing.count += 1;
              return { meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO rate_limit_buckets")) {
              const [key, windowStart] = args as [string, string];
              buckets.set(key, { count: 1, window_start: windowStart });
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

describe("demo create rate limit", () => {
  it("blocks after DEMO_CREATE_LIMIT_PER_HOUR attempts", async () => {
    const db = new FakeDemoRateDb() as unknown as D1Database;
    const ipHash = await hashIp("203.0.113.9");
    const now = new Date("2026-05-25T02:30:00.000Z");

    for (let i = 0; i < DEMO_CREATE_LIMIT_PER_HOUR; i++) {
      const r = await checkDemoCreateRateLimit(db, ipHash, now);
      expect(r.allowed).toBe(true);
    }

    const blocked = await checkDemoCreateRateLimit(db, ipHash, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
