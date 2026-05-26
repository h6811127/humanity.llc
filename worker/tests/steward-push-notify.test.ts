import { afterEach, describe, expect, it } from "vitest";

import type { Env } from "../src/index";
import {
  clearStewardPushConnectionsForTests,
  formatLiveProofPendingSse,
  LIVE_PROOF_PENDING_TYPE,
  notifyLiveProofPending,
  registerStewardPushSink,
  STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
  stewardPushConnectionCount,
} from "../src/steward/push";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ACCOUNT = "acc_pushNotifyTest01";
const QR_ID = "qr_xBZTq7M27tueCzBY";
const CHALLENGE = "lc_pushNotifyTest1";

const HOSTED_ENTITLEMENTS = {
  "steward.hosted": true,
  "notify.push.live_proof": true,
  "poll.live_proof.auto_daily_cap": 4000,
};

function mockPushDb(opts: {
  linked?: boolean;
  status?: string;
  entitlements?: Record<string, boolean | number>;
  incrementSpy?: (args: unknown[]) => void;
}) {
  const entitlements = opts.entitlements ?? HOSTED_ENTITLEMENTS;
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("sqlite_master")) return { 1: 1 };
          if (sql.includes("FROM steward_account_profiles")) {
            return opts.linked === false ? null : { account_id: ACCOUNT };
          }
          if (sql.includes("FROM steward_accounts")) {
            return {
              account_id: ACCOUNT,
              plan_id: "hosted_steward_v1",
              plan_version: 1,
              status: opts.status ?? "active",
              effective_from: "2026-05-01T00:00:00.000Z",
              effective_until: null,
              overrides_json: null,
            };
          }
          if (sql.includes("FROM steward_plan_definitions")) {
            return { entitlements_json: JSON.stringify(entitlements) };
          }
          return null;
        },
        run: async () => {
          opts.incrementSpy?.(params);
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

afterEach(() => {
  clearStewardPushConnectionsForTests();
});

describe("formatLiveProofPendingSse", () => {
  it("frames SSE with live_proof event and challenge id", () => {
    const frame = formatLiveProofPendingSse({
      type: LIVE_PROOF_PENDING_TYPE,
      version: 1,
      operator_id: "humanity.llc",
      account_id: ACCOUNT,
      profile_id: PROFILE,
      qr_id: QR_ID,
      challenge_id: CHALLENGE,
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    expect(frame).toContain("event: live_proof\n");
    expect(frame).toContain(`id: ${CHALLENGE}\n`);
    expect(frame).toContain('"type":"live_proof.pending"');
    expect(frame).toContain(PROFILE);
  });
});

describe("registerStewardPushSink", () => {
  it("enforces per-account connection limit", () => {
    for (let i = 0; i < STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT; i += 1) {
      registerStewardPushSink({
        accountId: ACCOUNT,
        connectionId: `conn_${i}`,
        deviceId: `dev_${i}`,
        write: () => {},
      });
    }
    expect(stewardPushConnectionCount(ACCOUNT)).toBe(
      STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT
    );
    expect(() =>
      registerStewardPushSink({
        accountId: ACCOUNT,
        connectionId: "conn_overflow",
        deviceId: "dev_overflow",
        write: () => {},
      })
    ).toThrow(/steward_push_connection_limit/);
  });
});

describe("notifyLiveProofPending", () => {
  it("delivers SSE chunk to registered sinks when entitled", async () => {
    const writes: string[] = [];
    registerStewardPushSink({
      accountId: ACCOUNT,
      connectionId: "conn_1",
      deviceId: "dev_1",
      write: (chunk) => writes.push(chunk),
    });

    const incrementCalls: unknown[][] = [];
    const db = mockPushDb({
      incrementSpy: (params) => incrementCalls.push(params),
    });
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };

    const result = await notifyLiveProofPending(env, db, {
      profile_id: PROFILE,
      qr_id: QR_ID,
      challenge_id: CHALLENGE,
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });

    expect(result.account_id).toBe(ACCOUNT);
    expect(result.delivered).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain(CHALLENGE);
    expect(incrementCalls.length).toBe(1);
    expect(incrementCalls[0]?.[1]).toBe("dev_1");
  });

  it("skips when profile is not linked to an account", async () => {
    const db = mockPushDb({ linked: false });
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const result = await notifyLiveProofPending(env, db, {
      profile_id: PROFILE,
      qr_id: QR_ID,
      challenge_id: CHALLENGE,
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    expect(result.delivered).toBe(0);
    expect(result.account_id).toBeNull();
  });

  it("skips when push entitlement is false", async () => {
    const db = mockPushDb({
      entitlements: { ...HOSTED_ENTITLEMENTS, "notify.push.live_proof": false },
    });
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const result = await notifyLiveProofPending(env, db, {
      profile_id: PROFILE,
      qr_id: QR_ID,
      challenge_id: CHALLENGE,
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    expect(result.delivered).toBe(0);
  });

  it("no-ops when hosted steward flag is off", async () => {
    const db = mockPushDb({});
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "0" };
    const result = await notifyLiveProofPending(env, db, {
      profile_id: PROFILE,
      qr_id: QR_ID,
      challenge_id: CHALLENGE,
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    expect(result.delivered).toBe(0);
  });
});
