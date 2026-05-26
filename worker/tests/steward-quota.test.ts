import { describe, expect, it } from "vitest";

import type { Env } from "../src/index";
import { enforceStewardAutoPollQuota } from "../src/steward/quota";

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
