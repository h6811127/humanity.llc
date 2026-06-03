import { describe, expect, it } from "vitest";

import { handleGetResolverHealth } from "../src/resolver/resolver-health";
import type { Env } from "../src/env";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function mockHealthDbWithBudget(opts: {
  schemaReady?: boolean;
  fkViolations?: number;
  requestCount?: number;
}) {
  const ready = opts.schemaReady ?? true;
  const fkViolations = opts.fkViolations ?? 0;
  const requestCount = opts.requestCount ?? 0;
  const rateStore = new RateLimitBucketStore();

  return {
    prepare(sql: string) {
      if (sql.includes("rate_limit_buckets")) {
        return rateStore.prepare(sql);
      }

      const allImpl = async <T>() => {
        if (sql.includes("PRAGMA table_info(qr_credentials)")) {
          return {
            results: ready
              ? [{ name: "qr_id" }, { name: "object_id" }]
              : [{ name: "qr_id" }],
          } as T;
        }
        if (sql === "PRAGMA foreign_key_check") {
          const results = Array.from({ length: fkViolations }, (_, i) => ({
            table: "live_control_challenges",
            rowid: i + 1,
          }));
          return { results } as T;
        }
        return { results: [] } as T;
      };

      const firstImpl = async <T>() => {
        if (sql.includes("sqlite_master") && sql.includes("operator_usage_counters")) {
          return { ok: 1 } as T;
        }
        if (sql.includes("sqlite_master")) {
          return ready ? ({ n: 7 } as T) : ({ n: 0 } as T);
        }
        if (sql.includes("operator_usage_counters") && sql.includes("SELECT count")) {
          return { count: requestCount } as T;
        }
        return null as T | null;
      };

      return {
        bind: (..._args: unknown[]) => ({
          first: firstImpl,
          all: allImpl,
          async run() {
            return { meta: { changes: 0 } };
          },
        }),
        first: firstImpl,
        all: allImpl,
      };
    },
  } as unknown as D1Database;
}

describe("resolver health operator request budget", () => {
  it("returns ok when count is below soft cap", async () => {
    const res = await handleGetResolverHealth(
      new Request("https://humanity.llc/.well-known/hc/v1/health"),
      {
        DB: mockHealthDbWithBudget({ requestCount: 79_999 }),
      } as Env
    );
    const body = (await res.json()) as {
      status: string;
      budget?: { state: string; count: number };
    };
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.budget?.state).toBe("ok");
    expect(body.budget?.count).toBe(79_999);
  });

  it("returns degraded with budget telemetry at soft cap", async () => {
    const res = await handleGetResolverHealth(
      new Request("https://humanity.llc/.well-known/hc/v1/health"),
      {
        DB: mockHealthDbWithBudget({ requestCount: 80_000 }),
      } as Env
    );
    const body = (await res.json()) as {
      status: string;
      budget?: { state: string; count: number; soft_cap: number };
    };
    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.budget?.state).toBe("soft_cap");
    expect(body.budget?.count).toBe(80_000);
    expect(body.budget?.soft_cap).toBe(80_000);
  });

  it("skips budget when disabled via env", async () => {
    const res = await handleGetResolverHealth(
      new Request("https://humanity.llc/.well-known/hc/v1/health"),
      {
        DB: mockHealthDbWithBudget({ requestCount: 99_999 }),
        OPERATOR_REQUEST_BUDGET_ENABLED: "0",
      } as Env
    );
    const body = (await res.json()) as { status: string; budget?: unknown };
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.budget).toBeUndefined();
  });
});
