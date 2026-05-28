import { afterEach, describe, expect, it } from "vitest";

import type { Env } from "../src/index";
import { handleGetStewardPush } from "../src/resolver/steward-hosted";
import {
  clearStewardPushConnectionsForTests,
  CONNECTION_ACK_TYPE,
  formatConnectionAckSse,
  formatSsePingComment,
  registerStewardPushSink,
  STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
  stewardPushConnectionCount,
} from "../src/steward/push";

const ACCOUNT = "acc_pushSseTestAccount1";
const DEVICE = "dev_push_sse_device01";

const HOSTED_ENTITLEMENTS = {
  "steward.hosted": true,
  "notify.push.live_proof": true,
};

function mockSseDb() {
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("sqlite_master")) return { 1: 1 };
          if (sql.includes("FROM steward_sessions")) {
            return {
              token_hash: params[0],
              account_id: ACCOUNT,
              device_id: DEVICE,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            };
          }
          if (sql.includes("FROM steward_accounts")) {
            return {
              account_id: ACCOUNT,
              plan_id: "hosted_steward_v1",
              plan_version: 1,
              status: "active",
              effective_from: "2026-05-01T00:00:00.000Z",
              effective_until: null,
              overrides_json: null,
            };
          }
          if (sql.includes("FROM steward_plan_definitions")) {
            return { entitlements_json: JSON.stringify(HOSTED_ENTITLEMENTS) };
          }
          if (sql.includes("FROM steward_account_profiles")) {
            if (sql.includes("LIMIT 1")) return { ok: 1 };
            return { account_id: ACCOUNT };
          }
          return null;
        },
        run: async () => ({ success: true }),
      }),
    }),
  } as unknown as D1Database;
}

afterEach(() => {
  clearStewardPushConnectionsForTests();
});

describe("formatConnectionAckSse", () => {
  it("emits connection.ack event", () => {
    const frame = formatConnectionAckSse({
      accountId: ACCOUNT,
      connectionId: "conn_test123",
      deviceId: DEVICE,
    });
    expect(frame).toContain("event: connection\n");
    expect(frame).toContain(CONNECTION_ACK_TYPE);
    expect(frame).toContain(ACCOUNT);
  });
});

describe("formatSsePingComment", () => {
  it("uses SSE comment heartbeat", () => {
    expect(formatSsePingComment()).toBe(": ping\n\n");
  });
});

describe("handleGetStewardPush", () => {
  it("returns 406 without text/event-stream Accept", async () => {
    const db = mockSseDb();
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await handleGetStewardPush(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/push", {
        headers: { Authorization: "Bearer tok", Accept: "application/json" },
      }),
      env,
      db
    );
    expect(res.status).toBe(406);
  });

  it("returns SSE stream with connection ack", async () => {
    const db = mockSseDb();
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await handleGetStewardPush(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/push", {
        headers: {
          Authorization: "Bearer tok",
          Accept: "text/event-stream",
          "X-HC-Device-Id": DEVICE,
        },
      }),
      env,
      db
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const reader = res.body?.getReader();
    expect(reader).toBeTruthy();
    const first = await reader!.read();
    const text = new TextDecoder().decode(first.value);
    expect(text).toContain(CONNECTION_ACK_TYPE);
    expect(stewardPushConnectionCount(ACCOUNT)).toBe(1);
    await reader!.cancel();
    expect(stewardPushConnectionCount(ACCOUNT)).toBe(0);
  });

  it("returns 429 when account connection limit reached", async () => {
    for (let i = 0; i < STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT; i += 1) {
      registerStewardPushSink({
        accountId: ACCOUNT,
        connectionId: `conn_${i}`,
        deviceId: `dev_${i}`,
        write: () => {},
      });
    }
    const db = mockSseDb();
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await handleGetStewardPush(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/push", {
        headers: {
          Authorization: "Bearer tok",
          Accept: "text/event-stream",
        },
      }),
      env,
      db
    );
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("steward_push_connection_limit");
  });
});
