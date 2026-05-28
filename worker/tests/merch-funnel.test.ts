import { describe, expect, it } from "vitest";

import {
  handleGetMerchFunnelMonitor,
  handlePostMerchFunnelBeacon,
} from "../src/http/merch-funnel";
import { incrementMerchFunnelCounter } from "../src/db/merch-funnel";

const TOKEN = "test-operator-audit-token";
const MONITOR_URL = "https://humanity.llc/.well-known/hc/v1/operator/merch-funnel-monitor";
const BEACON_URL = "https://humanity.llc/.well-known/hc/v1/metrics/merch-funnel";

class FakeMerchFunnelDb {
  private counters = new Map<string, number>();
  private buckets = new Map<string, { count: number; window_start: string }>();

  prepare(sql: string) {
    const counters = this.counters;
    const buckets = this.buckets;
    return {
      bind(...args: unknown[]) {
        return {
          async run() {
            if (sql.includes("INSERT INTO merch_funnel_counters")) {
              const ref = args[0] as string;
              const event = args[1] as string;
              const day = args[2] as string;
              const key = `${ref}|${event}|${day}`;
              counters.set(key, (counters.get(key) ?? 0) + 1);
            }
            if (sql.includes("INSERT INTO rate_limit_buckets")) {
              const key = args[0] as string;
              buckets.set(key, { count: 1, window_start: args[1] as string });
            }
            if (sql.includes("UPDATE rate_limit_buckets SET count = count + 1")) {
              const key = args[0] as string;
              const row = buckets.get(key);
              if (row) row.count += 1;
            }
          },
          async first<T>() {
            if (sql.includes("SELECT count FROM rate_limit_buckets WHERE bucket_key = ?")) {
              const key = args[0] as string;
              const row = buckets.get(key);
              return (row ? { count: row.count } : null) as T | null;
            }
            if (sql.includes("COALESCE(SUM(count), 0)")) {
              const ref = args[0] as string;
              const event = args[1] as string;
              const sinceDay = args[2] as string;
              let total = 0;
              for (const [key, count] of counters.entries()) {
                const [r, e, day] = key.split("|");
                if (r !== ref || e !== event || day < sinceDay) continue;
                total += count;
              }
              return { total } as T;
            }
            return null;
          },
          async all<T>() {
            if (sql.includes("FROM merch_funnel_counters")) {
              const sinceDay = args[0] as string;
              const rows = [];
              for (const [key, count] of counters.entries()) {
                const [ref, event, day] = key.split("|");
                if (day < sinceDay) continue;
                rows.push({ ref, event, day, count });
              }
              return { results: rows } as T;
            }
            return { results: [] } as T;
          },
        };
      },
    };
  }
}

function authRequest(url: string): Request {
  return new Request(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
}

describe("merch-funnel HTTP", () => {
  it("records scan_landing beacon", async () => {
    const db = new FakeMerchFunnelDb() as unknown as D1Database;
    const res = await handlePostMerchFunnelBeacon(
      new Request(BEACON_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.10" },
        body: JSON.stringify({ ref: "tier0_sticker", event: "scan_landing" }),
      }),
      db
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; ref: string };
    expect(body.ok).toBe(true);
    expect(body.ref).toBe("tier0_sticker");
  });

  it("rejects invalid beacon payload", async () => {
    const db = new FakeMerchFunnelDb() as unknown as D1Database;
    const res = await handlePostMerchFunnelBeacon(
      new Request(BEACON_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: "bad", event: "scan_landing" }),
      }),
      db
    );
    expect(res.status).toBe(422);
  });

  it("returns operator monitor with scan_to_create_pct", async () => {
    const db = new FakeMerchFunnelDb() as unknown as D1Database;
    await incrementMerchFunnelCounter(db, "tier0_sticker", "scan_landing");
    await incrementMerchFunnelCounter(db, "tier0_sticker", "scan_landing");
    await incrementMerchFunnelCounter(db, "tier0_sticker", "create_attributed");

    const res = await handleGetMerchFunnelMonitor(authRequest(MONITOR_URL), db, TOKEN);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      metrics: {
        by_ref: Record<
          string,
          { scan_landing: number; create_attributed: number; scan_to_create_pct: number | null }
        >;
      };
    };
    expect(body.metrics.by_ref.tier0_sticker.scan_landing).toBe(2);
    expect(body.metrics.by_ref.tier0_sticker.create_attributed).toBe(1);
    expect(body.metrics.by_ref.tier0_sticker.scan_to_create_pct).toBe(50);
  });

  it("requires operator token for monitor", async () => {
    const db = new FakeMerchFunnelDb() as unknown as D1Database;
    const res = await handleGetMerchFunnelMonitor(new Request(MONITOR_URL), db, TOKEN);
    expect(res.status).toBe(401);
  });
});
