import { afterEach, describe, expect, it } from "vitest";

import worker from "../src";
import { handleGetStewardOpsSnapshot } from "../src/resolver/steward-ops";
import {
  clearStewardPushConnectionsForTests,
  registerStewardPushIp,
  registerStewardPushSink,
} from "../src/steward/push";
import type { Env } from "../src";

const TOKEN = "test-operator-audit-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/steward-ops";

class FakeStewardOpsDb {
  schemaReady = true;
  accounts: Array<{ plan_id: string; status: string }> = [];
  sessions: Array<{ expires_at: string }> = [];
  usage: Array<{
    account_id: string;
    device_id: string;
    event: string;
    window_key: string;
    count: number;
  }> = [];

  prepare(sql: string) {
    const fake = this;
    const bound = (...args: unknown[]) => ({
      async first<T>() {
        if (sql.includes("sqlite_master")) {
          return (fake.schemaReady ? { 1: 1 } : null) as T | null;
        }
        if (sql.includes("FROM steward_sessions") && sql.includes("expires_at >")) {
          const nowIso = args[0] as string;
          const sessions = fake.sessions.filter(
            (session) => session.expires_at > nowIso
          ).length;
          return { sessions } as T;
        }
        return null as T | null;
      },
      async all<T>() {
        if (sql.includes("FROM steward_accounts") && sql.includes("GROUP BY")) {
          const map = new Map<string, { plan_id: string; status: string; accounts: number }>();
          for (const account of fake.accounts) {
            const key = `${account.plan_id}:${account.status}`;
            const row =
              map.get(key) ?? {
                plan_id: account.plan_id,
                status: account.status,
                accounts: 0,
              };
            row.accounts += 1;
            map.set(key, row);
          }
          return { results: [...map.values()] } as T;
        }
        if (sql.includes("FROM steward_usage_counters") && sql.includes("window_key = ?")) {
          const dayKey = args[0] as string;
          const map = new Map<
            string,
            {
              event: string;
              count: number;
              accountIds: Set<string>;
              deviceIds: Set<string>;
            }
          >();
          for (const row of fake.usage) {
            if (row.window_key !== dayKey) continue;
            const current =
              map.get(row.event) ??
              {
                event: row.event,
                count: 0,
                accountIds: new Set<string>(),
                deviceIds: new Set<string>(),
              };
            current.count += row.count;
            current.accountIds.add(row.account_id);
            current.deviceIds.add(row.device_id);
            map.set(row.event, current);
          }
          return {
            results: [...map.values()].map((row) => ({
              event: row.event,
              count: row.count,
              accounts: row.accountIds.size,
              devices: row.deviceIds.size,
            })),
          } as T;
        }
        return { results: [] } as T;
      },
    });
    return {
      bind(...args: unknown[]) {
        return bound(...args);
      },
      all<T>() {
        return bound().all<T>();
      },
    };
  }
}

function db(): D1Database {
  return new FakeStewardOpsDb() as unknown as D1Database;
}

afterEach(() => {
  clearStewardPushConnectionsForTests();
});

describe("operator steward ops snapshot", () => {
  it("returns 503 when token is not configured", async () => {
    const res = await handleGetStewardOpsSnapshot(
      new Request(URL),
      { HOSTED_STEWARD_ENABLED: "1" } as Env,
      db(),
      undefined
    );
    expect(res.status).toBe(503);
  });

  it("returns 401 without operator audit token", async () => {
    const res = await handleGetStewardOpsSnapshot(
      new Request(URL),
      { HOSTED_STEWARD_ENABLED: "1" } as Env,
      db(),
      TOKEN
    );
    expect(res.status).toBe(401);
  });

  it("returns schema status without querying hosted tables before migration", async () => {
    const fake = new FakeStewardOpsDb();
    fake.schemaReady = false;

    const res = await handleGetStewardOpsSnapshot(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      { HOSTED_STEWARD_ENABLED: "0" } as Env,
      fake as unknown as D1Database,
      TOKEN
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      hosted_steward_enabled: boolean;
      schema: string;
      runbook: string;
    };
    expect(body.hosted_steward_enabled).toBe(false);
    expect(body.schema).toBe("missing");
    expect(body.runbook).toContain("HOSTED_STEWARD_OPS_RUNBOOK");
  });

  it("returns hosted account, session, usage, and push metrics", async () => {
    const fake = new FakeStewardOpsDb();
    fake.accounts = [
      { plan_id: "hosted_steward_v1", status: "active" },
      { plan_id: "hosted_steward_v1", status: "past_due" },
      { plan_id: "reference_free", status: "active" },
    ];
    fake.sessions = [
      { expires_at: "2099-01-01T00:00:00.000Z" },
      { expires_at: "2026-05-26T00:00:00.000Z" },
    ];
    fake.usage = [
      {
        account_id: "acc_1",
        device_id: "dev_1",
        event: "poll.live_proof.auto",
        window_key: "2026-05-27",
        count: 25,
      },
      {
        account_id: "acc_1",
        device_id: "dev_2",
        event: "poll.live_proof.auto",
        window_key: "2026-05-27",
        count: 5,
      },
      {
        account_id: "acc_2",
        device_id: "dev_3",
        event: "notify.push.delivered",
        window_key: "2026-05-27",
        count: 2,
      },
    ];
    const unregisterSink = registerStewardPushSink({
      accountId: "acc_1",
      connectionId: "conn_1",
      deviceId: "dev_1",
      write() {},
    });
    const unregisterIp = registerStewardPushIp("203.0.113.10");

    const res = await handleGetStewardOpsSnapshot(
      new Request(`${URL}?day=2026-05-27`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      { HOSTED_STEWARD_ENABLED: "1" } as Env,
      fake as unknown as D1Database,
      TOKEN
    );

    unregisterSink();
    unregisterIp();

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      hosted_steward_enabled: boolean;
      accounts: Array<{ plan_id: string; status: string; accounts: number }>;
      sessions: { active: number };
      usage: Array<{ event: string; count: number; accounts: number; devices: number }>;
      push: {
        active_connections: number;
        active_client_ips: number;
        max_connections_per_account: number;
      };
      controls: { sla: { live_proof_push_p95_target_seconds: number } };
    };
    expect(body.hosted_steward_enabled).toBe(true);
    expect(body.accounts).toContainEqual({
      plan_id: "hosted_steward_v1",
      status: "active",
      accounts: 1,
    });
    expect(body.sessions.active).toBe(1);
    expect(body.usage).toContainEqual({
      event: "poll.live_proof.auto",
      count: 30,
      accounts: 1,
      devices: 2,
    });
    expect(body.push.active_connections).toBe(1);
    expect(body.push.active_client_ips).toBe(1);
    expect(body.push.max_connections_per_account).toBe(5);
    expect(body.controls.sla.live_proof_push_p95_target_seconds).toBe(5);
  });

  it("rejects invalid day", async () => {
    const res = await handleGetStewardOpsSnapshot(
      new Request(`${URL}?day=today`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      { HOSTED_STEWARD_ENABLED: "1" } as Env,
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
      { DB: undefined, OPERATOR_AUDIT_TOKEN: TOKEN } as unknown as Env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(503);
  });
});
