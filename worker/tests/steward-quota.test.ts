import { describe, expect, it } from "vitest";

import type { Env } from "../src/index";
import {
  STEWARD_ACCOUNT_HARD_CAP,
  STEWARD_ACCOUNT_USAGE_DEVICE,
  STEWARD_MANUAL_POLL_HEADER,
  enforceStewardAutoPollQuota,
} from "../src/steward/quota";

describe("steward auto-poll quota (E1.6/E1.7)", () => {
  it("returns 429 steward_quota_exceeded when at daily cap", async () => {
    const usageCounters = new Map<string, number>();
    const dayKey = new Date().toISOString().slice(0, 10);
    const accountId = "acc_quotaTestAccount01";
    const deviceId = "dev_quota_device01";
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const event = "poll.live_proof.auto";
    const cap = 2;
    usageCounters.set(`${accountId}:${deviceId}:${event}:${dayKey}`, cap);

    const db = {
      prepare: (sql: string) => ({
        bind: (...params: unknown[]) => ({
          first: async () => {
            if (sql.includes("sqlite_master")) return { 1: 1 };
            if (sql.includes("FROM steward_account_profiles")) {
              return { account_id: accountId };
            }
            if (sql.includes("FROM steward_sessions")) {
              return {
                token_hash: params[0],
                account_id: accountId,
                device_id: deviceId,
                expires_at: new Date(Date.now() + 60_000).toISOString(),
              };
            }
            if (sql.includes("FROM steward_accounts")) {
              return {
                account_id: accountId,
                plan_id: "reference_free",
                plan_version: 1,
                status: "active",
                effective_from: "2026-05-01T00:00:00.000Z",
                effective_until: null,
                overrides_json: null,
              };
            }
            if (sql.includes("FROM steward_plan_definitions")) {
              return {
                entitlements_json: JSON.stringify({
                  "poll.live_proof.auto_daily_cap": cap,
                }),
              };
            }
            if (sql.includes("steward_usage_counters") && sql.includes("SELECT count")) {
              const key = `${params[0]}:${params[1]}:${params[2]}:${params[3]}`;
              return { count: usageCounters.get(key) ?? 0 };
            }
            return null;
          },
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await enforceStewardAutoPollQuota(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/live-control/challenges", {
        headers: { Authorization: "Bearer test-token-quota" },
      }),
      env,
      db,
      profileId
    );

    expect(res?.status).toBe(429);
    const body = (await res!.json()) as {
      error: string;
      usage: Record<string, number>;
    };
    expect(body.error).toBe("steward_quota_exceeded");
    expect(body.usage.limit).toBe(cap);
    expect(body.usage["poll.live_proof.auto"]).toBe(cap);
  });

  it("skips metering for manual live-proof header", async () => {
    let incremented = false;
    const accountId = "acc_manualSkipAccount1";
    const deviceId = "dev_manual_device01";
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

    const db = {
      prepare: (sql: string) => ({
        bind: (...params: unknown[]) => ({
          first: async () => {
            if (sql.includes("sqlite_master")) return { 1: 1 };
            if (sql.includes("FROM steward_account_profiles")) {
              return { account_id: accountId };
            }
            if (sql.includes("FROM steward_sessions")) {
              return {
                token_hash: params[0],
                account_id: accountId,
                device_id: deviceId,
                expires_at: new Date(Date.now() + 60_000).toISOString(),
              };
            }
            return null;
          },
          run: async () => {
            incremented = true;
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database;

    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await enforceStewardAutoPollQuota(
      new Request("https://humanity.llc/test", {
        headers: {
          Authorization: "Bearer test-token-manual",
          [STEWARD_MANUAL_POLL_HEADER]: "1",
        },
      }),
      env,
      db,
      profileId
    );
    expect(res).toBeNull();
    expect(incremented).toBe(false);
  });

  it("returns 429 at account hard cap", async () => {
    const dayKey = new Date().toISOString().slice(0, 10);
    const accountId = "acc_hardCapAccount001";
    const deviceId = "dev_hard_cap_device";
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const event = "poll.live_proof.auto";

    const db = {
      prepare: (sql: string) => ({
        bind: (...params: unknown[]) => ({
          first: async () => {
            if (sql.includes("sqlite_master")) return { 1: 1 };
            if (sql.includes("FROM steward_account_profiles")) {
              return { account_id: accountId };
            }
            if (sql.includes("FROM steward_sessions")) {
              return {
                token_hash: params[0],
                account_id: accountId,
                device_id: deviceId,
                expires_at: new Date(Date.now() + 60_000).toISOString(),
              };
            }
            if (sql.includes("FROM steward_accounts")) {
              return {
                account_id: accountId,
                plan_id: "hosted_steward_v1",
                plan_version: 1,
                status: "active",
                effective_from: "2026-05-01T00:00:00.000Z",
                effective_until: null,
                overrides_json: null,
              };
            }
            if (sql.includes("FROM steward_plan_definitions")) {
              return {
                entitlements_json: JSON.stringify({
                  "poll.live_proof.auto_daily_cap": 4000,
                }),
              };
            }
            if (sql.includes("steward_usage_counters") && sql.includes("SELECT count")) {
              const key = `${params[0]}:${params[1]}:${params[2]}:${params[3]}`;
              if (params[1] === STEWARD_ACCOUNT_USAGE_DEVICE) {
                return { count: STEWARD_ACCOUNT_HARD_CAP };
              }
              if (key.endsWith(`${event}:${dayKey}`) && params[1] === deviceId) {
                return { count: 0 };
              }
            }
            return null;
          },
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await enforceStewardAutoPollQuota(
      new Request("https://humanity.llc/test", {
        headers: { Authorization: "Bearer test-token-hard" },
      }),
      env,
      db,
      profileId
    );

    expect(res?.status).toBe(429);
    const body = (await res!.json()) as { error: string; usage: { limit: number } };
    expect(body.error).toBe("steward_quota_exceeded");
    expect(body.usage.limit).toBe(STEWARD_ACCOUNT_HARD_CAP);
  });

  it("skips metering without Authorization", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ 1: 1 }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await enforceStewardAutoPollQuota(
      new Request("https://humanity.llc/test"),
      env,
      db,
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD5"
    );
    expect(res).toBeNull();
  });
});
