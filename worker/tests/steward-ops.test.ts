import { afterEach, describe, expect, it } from "vitest";

import worker from "../src";
import type { Env } from "../src";
import { handleGetHostedStewardOps } from "../src/resolver/steward-ops";
import {
  clearStewardPushConnectionsForTests,
  registerStewardPushSink,
} from "../src/steward/push";

const TOKEN = "test-operator-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/hosted-steward/ops";

const accounts = [
  {
    account_id: "acc_opsA",
    plan_id: "hosted_steward_v1",
    plan_version: 1,
    status: "active",
    effective_from: "2026-05-01T00:00:00.000Z",
    effective_until: null,
    billing_customer_id: "cus_opsA",
    billing_subscription_id: "sub_opsA",
  },
  {
    account_id: "acc_opsB",
    plan_id: "hosted_steward_v1",
    plan_version: 1,
    status: "past_due",
    effective_from: "2026-05-01T00:00:00.000Z",
    effective_until: "2026-05-28T00:00:00.000Z",
    billing_customer_id: "cus_opsB",
    billing_subscription_id: null,
  },
  {
    account_id: "acc_opsC",
    plan_id: "reference_free",
    plan_version: 1,
    status: "active",
    effective_from: "2026-05-01T00:00:00.000Z",
    effective_until: null,
    billing_customer_id: null,
    billing_subscription_id: null,
  },
];

const usage = [
  {
    account_id: "acc_opsA",
    device_id: "dev_a",
    event: "poll.live_proof.auto",
    window_key: "2026-05-27",
    count: 50_000,
  },
  {
    account_id: "acc_opsA",
    device_id: "dev_a",
    event: "notify.push.delivered",
    window_key: "2026-05-27",
    count: 2,
  },
  {
    account_id: "acc_opsB",
    device_id: "dev_b",
    event: "poll.live_proof.auto",
    window_key: "2026-05-27",
    count: 100_001,
  },
];

const sessions = [
  {
    account_id: "acc_opsA",
    expires_at: "2999-01-01T00:00:00.000Z",
  },
  {
    account_id: "acc_opsB",
    expires_at: "2999-01-01T00:00:00.000Z",
  },
  {
    account_id: "acc_opsB",
    expires_at: "2000-01-01T00:00:00.000Z",
  },
];

class FakeHostedOpsDb {
  prepare(sql: string) {
    return {
      bind: (...params: unknown[]) => this.query(sql, params),
      ...this.query(sql, []),
    };
  }

  private query(sql: string, params: unknown[]) {
    return {
      async first<T>() {
        if (sql.includes("sqlite_master")) return { 1: 1 } as T;
        return null as T | null;
      },
      async all<T>() {
        if (sql.includes("FROM steward_accounts") && sql.includes("GROUP BY status")) {
          return { results: groupCount(accounts, "status") as T[] };
        }
        if (sql.includes("FROM steward_accounts") && sql.includes("GROUP BY plan_id")) {
          return { results: groupCount(accounts, "plan_id") as T[] };
        }
        if (sql.includes("FROM steward_sessions")) {
          const nowIso = String(params[0]);
          const grouped = new Map<string, number>();
          for (const row of sessions) {
            if (row.expires_at <= nowIso) continue;
            grouped.set(row.account_id, (grouped.get(row.account_id) ?? 0) + 1);
          }
          return {
            results: [...grouped.entries()].map(([account_id, n]) => ({
              account_id,
              n,
            })) as T[],
          };
        }
        if (sql.includes("FROM steward_usage_counters")) {
          const windowKey = String(params[0]);
          const grouped = new Map<string, { account_id: string; event: string; count: number }>();
          for (const row of usage) {
            if (row.window_key !== windowKey) continue;
            const key = `${row.account_id}:${row.event}`;
            const current = grouped.get(key) ?? {
              account_id: row.account_id,
              event: row.event,
              count: 0,
            };
            current.count += row.count;
            grouped.set(key, current);
          }
          return { results: [...grouped.values()] as T[] };
        }
        if (sql.includes("SELECT account_id, plan_id, status")) {
          return { results: accounts as T[] };
        }
        return { results: [] as T[] };
      },
      async run() {
        return { success: true };
      },
    };
  }
}

function groupCount(rows: typeof accounts, key: "status" | "plan_id") {
  const grouped = new Map<string, number>();
  for (const row of rows) grouped.set(row[key], (grouped.get(row[key]) ?? 0) + 1);
  return [...grouped.entries()].map(([value, n]) => ({ key: value, n }));
}

function db(): D1Database {
  return new FakeHostedOpsDb() as unknown as D1Database;
}

afterEach(() => {
  clearStewardPushConnectionsForTests();
});

describe("hosted steward ops API (E6)", () => {
  it("requires operator audit token configuration", async () => {
    const res = await handleGetHostedStewardOps(
      new Request(URL),
      { DB: db(), HOSTED_STEWARD_ENABLED: "1" } as Env,
      db()
    );
    expect(res.status).toBe(503);
  });

  it("requires bearer authorization", async () => {
    const res = await handleGetHostedStewardOps(
      new Request(URL),
      { DB: db(), HOSTED_STEWARD_ENABLED: "1", OPERATOR_AUDIT_TOKEN: TOKEN } as Env,
      db()
    );
    expect(res.status).toBe(401);
  });

  it("is hidden when hosted steward is disabled", async () => {
    const res = await handleGetHostedStewardOps(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      { DB: db(), HOSTED_STEWARD_ENABLED: "0", OPERATOR_AUDIT_TOKEN: TOKEN } as Env,
      db()
    );
    expect(res.status).toBe(404);
  });

  it("returns quota, push, and billing summary when authorized", async () => {
    registerStewardPushSink({
      accountId: "acc_opsA",
      connectionId: "conn_opsA",
      deviceId: "dev_a",
      write: () => {},
    });
    const res = await handleGetHostedStewardOps(
      new Request(`${URL}?window_key=2026-05-27`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      { DB: db(), HOSTED_STEWARD_ENABLED: "1", OPERATOR_AUDIT_TOKEN: TOKEN } as Env,
      db()
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      accounts: {
        total: number;
        by_status: Record<string, number>;
        over_soft_cap: number;
        over_hard_cap: number;
        billing_attention: number;
      };
      usage: {
        event_totals: Record<string, number>;
        top_accounts: Array<{
          account_id: string;
          usage_total: number;
          active_sessions: number;
          current_push_connections: number;
        }>;
      };
      push: { current_connections_total: number };
      alerts: Array<{ code: string; account_id: string }>;
      runbook: string;
    };

    expect(body.accounts.total).toBe(3);
    expect(body.accounts.by_status.active).toBe(2);
    expect(body.accounts.over_soft_cap).toBe(2);
    expect(body.accounts.over_hard_cap).toBe(1);
    expect(body.accounts.billing_attention).toBe(1);
    expect(body.usage.event_totals["poll.live_proof.auto"]).toBe(150_001);
    expect(body.push.current_connections_total).toBe(1);
    expect(body.usage.top_accounts[0].account_id).toBe("acc_opsB");
    expect(body.usage.top_accounts[1].current_push_connections).toBe(1);
    expect(body.alerts.map((a) => a.code)).toContain("account_over_hard_cap");
    expect(body.alerts.map((a) => a.code)).toContain("billing_attention");
    expect(body.runbook).toContain("HOSTED_TIER_OPS_RUNBOOK");
  });

  it("routes through worker.fetch", async () => {
    const res = await worker.fetch(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      {
        DB: db(),
        HOSTED_STEWARD_ENABLED: "1",
        OPERATOR_AUDIT_TOKEN: TOKEN,
      } as Env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
  });
});
