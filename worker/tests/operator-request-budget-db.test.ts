import { describe, expect, it, vi } from "vitest";

import type { Env } from "../src/env";
import {
  DEFAULT_OPERATOR_REQUEST_HARD_CAP,
  DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
  OPERATOR_REQUEST_EVENT,
} from "../src/operator/request-budget-core";
import {
  getOperatorRequestCount,
  incrementOperatorRequestCount,
  readOperatorRequestBudget,
  recordOperatorRequestIfEnabled,
} from "../src/operator/request-budget";

function mockOperatorUsageDb(opts: {
  tableReady: boolean;
  counters?: Map<string, number>;
}) {
  const counters = opts.counters ?? new Map<string, number>();
  return {
    counters,
    db: {
      prepare(sql: string) {
        const firstUnbound = async () => {
          if (sql.includes("sqlite_master") && sql.includes("operator_usage_counters")) {
            return opts.tableReady ? { ok: 1 } : null;
          }
          return null;
        };
        return {
          first: firstUnbound,
          bind(...args: unknown[]) {
            return {
              async first() {
                if (sql.includes("SELECT count FROM operator_usage_counters")) {
                  const key = `${args[0]}:${args[1]}`;
                  const count = counters.get(key);
                  return count != null ? { count } : null;
                }
                return null;
              },
              async run() {
                if (sql.includes("INSERT INTO operator_usage_counters")) {
                  const key = `${args[0]}:${args[1]}`;
                  counters.set(key, (counters.get(key) ?? 0) + 1);
                }
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    } as unknown as D1Database,
  };
}

describe("operator request budget D1 counters", () => {
  it("returns 0 and does not write when the usage table is missing", async () => {
    const { db, counters } = mockOperatorUsageDb({ tableReady: false });
    expect(await getOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-20")).toBe(
      0
    );
    expect(
      await incrementOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-20")
    ).toBe(0);
    expect(counters.size).toBe(0);
  });

  it("increments the matching event+window and isolates peers", async () => {
    const { db, counters } = mockOperatorUsageDb({ tableReady: true });

    expect(await incrementOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-20")).toBe(
      1
    );
    expect(await incrementOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-20")).toBe(
      2
    );
    expect(await incrementOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-21")).toBe(
      1
    );
    expect(await incrementOperatorRequestCount(db, "other_event", "2026-08-20")).toBe(1);

    expect(
      await getOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-20")
    ).toBe(2);
    expect(
      await getOperatorRequestCount(db, OPERATOR_REQUEST_EVENT, "2026-08-21")
    ).toBe(1);
    expect(await getOperatorRequestCount(db, "other_event", "2026-08-20")).toBe(1);
    expect(counters.get(`${OPERATOR_REQUEST_EVENT}:2026-08-20`)).toBe(2);
  });

  it("readOperatorRequestBudget skips D1 when disabled", async () => {
    const { db } = mockOperatorUsageDb({
      tableReady: true,
      counters: new Map([[`${OPERATOR_REQUEST_EVENT}:2026-08-20`, 99_000]]),
    });
    const snapshot = await readOperatorRequestBudget(
      {
        DB: db,
        OPERATOR_REQUEST_BUDGET_ENABLED: "0",
      } as Env,
      db,
      new Date("2026-08-20T23:59:59.000Z")
    );
    expect(snapshot).toEqual({
      enabled: false,
      count: 0,
      softCap: DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
      hardCap: DEFAULT_OPERATOR_REQUEST_HARD_CAP,
      windowKey: "2026-08-20",
      state: "ok",
    });
  });

  it("readOperatorRequestBudget reports hard_cap from the UTC-day window", async () => {
    const { db } = mockOperatorUsageDb({
      tableReady: true,
      counters: new Map([
        [`${OPERATOR_REQUEST_EVENT}:2026-08-20`, DEFAULT_OPERATOR_REQUEST_HARD_CAP],
        [`${OPERATOR_REQUEST_EVENT}:2026-08-19`, 1],
      ]),
    });
    const snapshot = await readOperatorRequestBudget(
      { DB: db } as Env,
      db,
      new Date("2026-08-20T00:00:00.000Z")
    );
    expect(snapshot.enabled).toBe(true);
    expect(snapshot.windowKey).toBe("2026-08-20");
    expect(snapshot.count).toBe(DEFAULT_OPERATOR_REQUEST_HARD_CAP);
    expect(snapshot.state).toBe("hard_cap");
  });

  it("recordOperatorRequestIfEnabled waitUntil increments the current UTC day", async () => {
    const { db, counters } = mockOperatorUsageDb({ tableReady: true });
    const waitUntil = vi.fn((p: Promise<unknown>) => p);
    recordOperatorRequestIfEnabled(
      { DB: db } as Env,
      { waitUntil } as unknown as ExecutionContext,
      new Date("2026-08-20T10:00:00.000Z")
    );
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0]![0];
    expect(counters.get(`${OPERATOR_REQUEST_EVENT}:2026-08-20`)).toBe(1);
  });

  it("recordOperatorRequestIfEnabled is a no-op when disabled", () => {
    const { db, counters } = mockOperatorUsageDb({ tableReady: true });
    const waitUntil = vi.fn();
    recordOperatorRequestIfEnabled(
      { DB: db, OPERATOR_REQUEST_BUDGET_ENABLED: "0" } as Env,
      { waitUntil } as unknown as ExecutionContext,
      new Date("2026-08-20T10:00:00.000Z")
    );
    expect(waitUntil).not.toHaveBeenCalled();
    expect(counters.size).toBe(0);
  });
});
