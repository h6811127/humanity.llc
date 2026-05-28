import { describe, expect, it } from "vitest";

import worker from "../src";
import { checkCreateRateLimit, hashIp } from "../src/db/rate-limit";
import { handleGetCreateRateMonitor } from "../src/resolver/create-monitoring";

const TOKEN = "test-operator-audit-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/create-rate-monitor";

class FakeRateMonitorDb {
  private readonly cards = new Map<string, { created_at: string }>();
  private readonly buckets = new Map<string, { count: number; window_start: string }>();

  addCard(profileId: string, createdAt: string): void {
    this.cards.set(profileId, { created_at: createdAt });
  }

  prepare(sql: string) {
    const cards = this.cards;
    const buckets = this.buckets;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("SELECT count FROM rate_limit_buckets WHERE bucket_key = ?")) {
              const key = args[0] as string;
              const row = buckets.get(key);
              return (row ? { count: row.count } : null) as T | null;
            }
            if (sql.includes("SUM(count)") && sql.includes("bucket_key LIKE ?")) {
              const prefix = (args[0] as string).replace("%", "");
              const since = args[1] as string;
              let attempts = 0;
              let windows = 0;
              for (const [key, row] of buckets.entries()) {
                if (!key.startsWith(prefix)) continue;
                if (row.window_start < since) continue;
                attempts += row.count;
                windows += 1;
              }
              return { attempts, windows } as T;
            }
            if (sql.includes("FROM cards") && sql.includes("created_at >=")) {
              const since = args[0] as string;
              let n = 0;
              for (const row of cards.values()) {
                if (row.created_at >= since) n += 1;
              }
              return { n } as T;
            }
            return null as T | null;
          },
          async run() {
            if (sql.includes("UPDATE rate_limit_buckets SET count = count + 1")) {
              const key = args[0] as string;
              const existing = buckets.get(key);
              if (existing) existing.count += 1;
              return { meta: { changes: existing ? 1 : 0 } };
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

function db(): D1Database {
  return new FakeRateMonitorDb() as unknown as D1Database;
}

describe("operator create-rate monitor API", () => {
  it("returns 503 when token is not configured", async () => {
    const res = await handleGetCreateRateMonitor(new Request(URL), db(), undefined);
    expect(res.status).toBe(503);
  });

  it("returns 401 without token", async () => {
    const res = await handleGetCreateRateMonitor(new Request(URL), db(), TOKEN);
    expect(res.status).toBe(401);
  });

  it("returns create monitoring metrics when authorized", async () => {
    const fake = new FakeRateMonitorDb();
    const now = new Date();
    fake.addCard("a", new Date(now.getTime() - 3 * 3600_000).toISOString());
    fake.addCard("b", new Date(now.getTime() - 2 * 3600_000).toISOString());

    const ipHash = await hashIp("203.0.113.1");
    for (let i = 0; i < 10; i++) {
      await checkCreateRateLimit(fake as unknown as D1Database, ipHash, now);
    }
    await checkCreateRateLimit(fake as unknown as D1Database, ipHash, now);

    const res = await handleGetCreateRateMonitor(
      new Request(`${URL}?window_hours=48`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      fake as unknown as D1Database,
      TOKEN
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      controls: { create_limit_per_ip_per_hour: number };
      metrics: {
        cards_created: number;
        create_allowed_attempts: number;
        create_blocked_attempts: number;
      };
      runbook: string;
    };
    expect(body.controls.create_limit_per_ip_per_hour).toBe(10);
    expect(body.metrics.cards_created).toBe(2);
    expect(body.metrics.create_allowed_attempts).toBe(10);
    expect(body.metrics.create_blocked_attempts).toBe(1);
    expect(body.runbook).toContain("LAUNCH_MONITORING_RUNBOOK");
  });

  it("rejects invalid window_hours", async () => {
    const res = await handleGetCreateRateMonitor(
      new Request(`${URL}?window_hours=0`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      db(),
      TOKEN
    );
    expect(res.status).toBe(400);
  });

  it("routes through worker.fetch", async () => {
    const res = await worker.fetch(
      new Request(URL, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      { DB: undefined, OPERATOR_AUDIT_TOKEN: TOKEN },
      {} as ExecutionContext
    );
    expect(res.status).toBe(503);
  });
});
