import { describe, expect, it } from "vitest";

import { foreignKeyIntegrityOk, schemaReady } from "../src/db/schema";
import { handleGetResolverHealth } from "../src/resolver/resolver-health";
import type { Env } from "../src";
import { describe, expect, it } from "vitest";

import { foreignKeyIntegrityOk, schemaReady } from "../src/db/schema";
import { handleGetResolverHealth } from "../src/resolver/resolver-health";
import type { Env } from "../src";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function mockHealthDb(opts: { schemaReady?: boolean; fkViolations?: number }) {
  const ready = opts.schemaReady ?? true;
  const fkViolations = opts.fkViolations ?? 0;
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

      return {
        bind: (..._args: unknown[]) => ({
          async first<T>() {
            if (sql.includes("sqlite_master")) {
              return ready ? ({ n: 7 } as T) : ({ n: 0 } as T);
            }
            return null as T | null;
          },
          all: allImpl,
          async run() {
            return { meta: { changes: 0 } };
          },
        }),
        all: allImpl,
      };
    },
  } as unknown as D1Database;
}

describe("foreignKeyIntegrityOk", () => {
  it("returns true when PRAGMA foreign_key_check is empty", async () => {
    const db = mockHealthDb({ fkViolations: 0 });
    await expect(foreignKeyIntegrityOk(db)).resolves.toBe(true);
  });

  it("returns false when PRAGMA foreign_key_check reports rows", async () => {
    const db = mockHealthDb({ fkViolations: 2 });
    await expect(foreignKeyIntegrityOk(db)).resolves.toBe(false);
  });

  it("schemaReady passes on the health mock", async () => {
    await expect(schemaReady(mockHealthDb({ fkViolations: 0 }))).resolves.toBe(true);
  });
});

describe("resolver health foreign_keys field (H-15)", () => {
  it("returns foreign_keys ok when schema and FK checks pass", async () => {
    const res = await handleGetResolverHealth(
      new Request("https://humanity.llc/.well-known/hc/v1/health"),
      { DB: mockHealthDb({ fkViolations: 0 }) } as Env
    );
    const body = (await res.json()) as { foreign_keys?: string; database: string };
    expect(res.status).toBe(200);
    expect(body.database).toBe("ok");
    expect(body.foreign_keys).toBe("ok");
  });

  it("returns 503 degraded when foreign key violations exist", async () => {
    const res = await handleGetResolverHealth(
      new Request("https://humanity.llc/.well-known/hc/v1/health"),
      { DB: mockHealthDb({ fkViolations: 1 }) } as Env
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      status: string;
      database: string;
      foreign_keys?: string;
    };
    expect(body.status).toBe("degraded");
    expect(body.database).toBe("ok");
    expect(body.foreign_keys).toBe("violation");
  });
});
