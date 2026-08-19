import { afterEach, describe, expect, it, vi } from "vitest";

import {
  handleGetMerchFunnelMonitor,
  handlePostMerchFunnelBeacon,
} from "../src/http/merch-funnel";

const TOKEN = "test-operator-audit-token";
const MONITOR_URL =
  "https://humanity.llc/.well-known/hc/v1/operator/merch-funnel-monitor";
const BEACON_URL = "https://humanity.llc/.well-known/hc/v1/metrics/merch-funnel";
const BEACON_LIMIT_PER_HOUR = 120;

class FakeMerchFunnelDb {
  counters = new Map<string, number>();
  buckets = new Map<string, { count: number; window_start: string }>();

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
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO rate_limit_buckets")) {
              const key = args[0] as string;
              buckets.set(key, { count: 1, window_start: args[1] as string });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE rate_limit_buckets SET count = count + 1")) {
              const key = args[0] as string;
              const row = buckets.get(key);
              if (row) row.count += 1;
              return { success: true, meta: { changes: row ? 1 : 0 } };
            }
            return { success: true, meta: { changes: 0 } };
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
                if (r !== ref || e !== event || !day || day < sinceDay) continue;
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
                if (!day || day < sinceDay) continue;
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

function beaconRequest(
  ip: string,
  body: unknown = { ref: "tier0_sticker", event: "scan_landing" }
): Request {
  return new Request(BEACON_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
    body: JSON.stringify(body),
  });
}

function monitorRequest(search = ""): Request {
  return new Request(`${MONITOR_URL}${search}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
}

async function postBeacon(
  database: D1Database,
  ip: string,
  body?: unknown
): Promise<Response> {
  return handlePostMerchFunnelBeacon(beaconRequest(ip, body), database);
}

describe("merch funnel beacon rate limit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows 120 beacons per IP per UTC hour and 429s the next with Retry-After", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:15:00.000Z"));
    const database = new FakeMerchFunnelDb() as unknown as D1Database;
    const ip = "203.0.113.40";

    for (let i = 0; i < BEACON_LIMIT_PER_HOUR; i += 1) {
      const res = await postBeacon(database, ip);
      expect(res.status).toBe(200);
    }

    const blocked = await postBeacon(database, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    const body = (await blocked.json()) as { error: string };
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("isolates beacon buckets per IP", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:15:00.000Z"));
    const store = new FakeMerchFunnelDb();
    const database = store as unknown as D1Database;

    for (let i = 0; i < BEACON_LIMIT_PER_HOUR; i += 1) {
      expect((await postBeacon(database, "203.0.113.41")).status).toBe(200);
    }
    expect((await postBeacon(database, "203.0.113.41")).status).toBe(429);
    expect((await postBeacon(database, "203.0.113.42")).status).toBe(200);
    expect(store.counters.size).toBeGreaterThan(0);
  });

  it("does not increment the beacon bucket for invalid payloads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:15:00.000Z"));
    const store = new FakeMerchFunnelDb();
    const database = store as unknown as D1Database;
    const ip = "203.0.113.43";

    const invalid = await postBeacon(database, ip, {
      ref: "not_an_allowed_ref",
      event: "scan_landing",
    });
    expect(invalid.status).toBe(422);
    expect(store.buckets.size).toBe(0);
    expect(store.counters.size).toBe(0);

    for (let i = 0; i < BEACON_LIMIT_PER_HOUR; i += 1) {
      expect((await postBeacon(database, ip)).status).toBe(200);
    }
    expect((await postBeacon(database, ip)).status).toBe(429);
  });

  it("resets the per-IP cap at the next UTC hour", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:59:00.000Z"));
    const database = new FakeMerchFunnelDb() as unknown as D1Database;
    const ip = "203.0.113.44";

    for (let i = 0; i < BEACON_LIMIT_PER_HOUR; i += 1) {
      expect((await postBeacon(database, ip)).status).toBe(200);
    }
    expect((await postBeacon(database, ip)).status).toBe(429);

    vi.setSystemTime(new Date("2026-08-19T11:00:00.000Z"));
    expect((await postBeacon(database, ip)).status).toBe(200);
  });
});

describe("merch funnel monitor window_days", () => {
  it("defaults omitted and empty window_days to 30", async () => {
    const database = new FakeMerchFunnelDb() as unknown as D1Database;

    const omitted = await handleGetMerchFunnelMonitor(
      monitorRequest(),
      database,
      TOKEN
    );
    expect(omitted.status).toBe(200);
    expect(((await omitted.json()) as { window_days: number }).window_days).toBe(30);

    const empty = await handleGetMerchFunnelMonitor(
      monitorRequest("?window_days="),
      database,
      TOKEN
    );
    expect(empty.status).toBe(200);
    expect(((await empty.json()) as { window_days: number }).window_days).toBe(30);
  });

  it("rejects window_days outside 1..90", async () => {
    const database = new FakeMerchFunnelDb() as unknown as D1Database;

    for (const search of ["?window_days=0", "?window_days=91", "?window_days=abc"]) {
      const res = await handleGetMerchFunnelMonitor(
        monitorRequest(search),
        database,
        TOKEN
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("INVALID_QUERY");
    }
  });

  it("accepts the inclusive 1 and 90 bounds", async () => {
    const database = new FakeMerchFunnelDb() as unknown as D1Database;

    const min = await handleGetMerchFunnelMonitor(
      monitorRequest("?window_days=1"),
      database,
      TOKEN
    );
    expect(min.status).toBe(200);
    expect(((await min.json()) as { window_days: number }).window_days).toBe(1);

    const max = await handleGetMerchFunnelMonitor(
      monitorRequest("?window_days=90"),
      database,
      TOKEN
    );
    expect(max.status).toBe(200);
    expect(((await max.json()) as { window_days: number }).window_days).toBe(90);
  });
});
