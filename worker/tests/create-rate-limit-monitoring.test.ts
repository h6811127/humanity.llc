import { describe, expect, it } from "vitest";

import { getCreateRateLimitMonitoring } from "../src/db/rate-limit";

class FakeMonitoringDb {
  constructor(
    private readonly buckets: Array<{
      bucket_key: string;
      count: number;
      window_start: string;
    }>
  ) {}

  prepare(sql: string) {
    const buckets = this.buckets;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("SUM(count)") && sql.includes("bucket_key LIKE ?")) {
              const prefix = String(args[0]).replace("%", "");
              const since = args[1] as string;
              let attempts = 0;
              let windows = 0;
              for (const row of buckets) {
                if (!row.bucket_key.startsWith(prefix)) continue;
                if (row.window_start < since) continue;
                attempts += row.count;
                windows += 1;
              }
              return { attempts, windows } as T;
            }
            return null as T | null;
          },
        };
      },
    };
  }
}

function db(
  buckets: Array<{ bucket_key: string; count: number; window_start: string }>
): D1Database {
  return new FakeMonitoringDb(buckets) as unknown as D1Database;
}

describe("getCreateRateLimitMonitoring", () => {
  it("returns zeros when no create buckets exist", async () => {
    const metrics = await getCreateRateLimitMonitoring(db([]), "2026-08-01T00:00:00.000Z");
    expect(metrics).toEqual({
      allowed_attempts: 0,
      blocked_attempts: 0,
      unique_allowed_ip_windows: 0,
      unique_blocked_ip_windows: 0,
    });
  });

  it("sums allowed and blocked create windows after sinceIso", async () => {
    const metrics = await getCreateRateLimitMonitoring(
      db([
        {
          bucket_key: "create:aaa:2026-08-10T10:00:00.000Z",
          count: 4,
          window_start: "2026-08-10T10:00:00.000Z",
        },
        {
          bucket_key: "create:bbb:2026-08-10T11:00:00.000Z",
          count: 6,
          window_start: "2026-08-10T11:00:00.000Z",
        },
        {
          bucket_key: "create_blocked:aaa:2026-08-10T10:00:00.000Z",
          count: 2,
          window_start: "2026-08-10T10:00:00.000Z",
        },
        {
          bucket_key: "create:ccc:2026-07-01T00:00:00.000Z",
          count: 99,
          window_start: "2026-07-01T00:00:00.000Z",
        },
      ]),
      "2026-08-01T00:00:00.000Z"
    );

    expect(metrics.allowed_attempts).toBe(10);
    expect(metrics.blocked_attempts).toBe(2);
    expect(metrics.unique_allowed_ip_windows).toBe(2);
    expect(metrics.unique_blocked_ip_windows).toBe(1);
  });

  it("does not count demo or unrelated rate-limit prefixes as create pressure", async () => {
    const metrics = await getCreateRateLimitMonitoring(
      db([
        {
          bucket_key: "create_demo:aaa:2026-08-10T10:00:00.000Z",
          count: 8,
          window_start: "2026-08-10T10:00:00.000Z",
        },
        {
          bucket_key: "create_demo_blocked:aaa:2026-08-10T10:00:00.000Z",
          count: 3,
          window_start: "2026-08-10T10:00:00.000Z",
        },
        {
          bucket_key: "status:aaa:2026-08-10T10:00:00.000Z",
          count: 50,
          window_start: "2026-08-10T10:00:00.000Z",
        },
        {
          bucket_key: "create:ddd:2026-08-10T12:00:00.000Z",
          count: 1,
          window_start: "2026-08-10T12:00:00.000Z",
        },
      ]),
      "2026-08-01T00:00:00.000Z"
    );

    expect(metrics.allowed_attempts).toBe(1);
    expect(metrics.blocked_attempts).toBe(0);
    expect(metrics.unique_allowed_ip_windows).toBe(1);
    expect(metrics.unique_blocked_ip_windows).toBe(0);
  });
});
