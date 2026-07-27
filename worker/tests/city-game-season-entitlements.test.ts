import { describe, expect, it, vi } from "vitest";
import { CR_SEASON_01 } from "../src/city-game/season-config";
import {
  gameSeasonLimitsFromEntitlements,
  GAME_METER_EVENT_CONTRIBUTE,
  GAME_METER_EVENT_SNAPSHOT,
  GAME_METER_EVENT_UPDATE,
  HOSTED_GAME_SEASON_ENTITLEMENTS,
  HOSTED_GAME_SEASON_PLAN_ID,
  REFERENCE_FREE_GAME_ENTITLEMENTS,
  REFERENCE_FREE_GAME_NODE_CAP,
} from "../src/city-game/season-entitlements";
import { resolveGameSeasonLimits } from "../src/city-game/season-entitlements-resolve";
import {
  enforceGameContributeSeasonQuota,
  enforceGameNodeCap,
  enforceGameSnapshotSeasonQuota,
  enforceGameUpdateSeasonQuota,
  gameSeasonSchemaReady,
  getGameSeasonUsageCount,
  incrementGameSeasonUsage,
  recordGameContributeSeasonUsage,
  recordGameSnapshotSeasonUsage,
  recordGameUpdateSeasonUsage,
} from "../src/city-game/season-quota";

const ENABLED_LIMITS = {
  enabled: true,
  nodeCap: 15,
  contributeDailyCap: 2,
  snapshotDailyCap: 3,
  gameUpdateDailyCap: 4,
} as const;

const DISABLED_LIMITS = {
  ...ENABLED_LIMITS,
  enabled: false,
} as const;

describe("gameSeasonLimitsFromEntitlements", () => {
  it("uses reference_free defaults when plan omits game keys", () => {
    const limits = gameSeasonLimitsFromEntitlements({
      "steward.hosted": true,
      "poll.live_proof.auto_daily_cap": 4000,
    });
    expect(limits.enabled).toBe(true);
    expect(limits.nodeCap).toBe(REFERENCE_FREE_GAME_NODE_CAP);
    expect(limits.contributeDailyCap).toBe(25_000);
  });

  it("applies hosted_game_season_v1 caps", () => {
    const limits = gameSeasonLimitsFromEntitlements(HOSTED_GAME_SEASON_ENTITLEMENTS);
    expect(limits.nodeCap).toBe(50);
    expect(limits.contributeDailyCap).toBe(250_000);
    expect(limits.snapshotDailyCap).toBe(1_000_000);
  });

  it("disables season when game.season.enabled is false", () => {
    const limits = gameSeasonLimitsFromEntitlements({
      ...REFERENCE_FREE_GAME_ENTITLEMENTS,
      "game.season.enabled": false,
    });
    expect(limits.enabled).toBe(false);
  });
});

describe("resolveGameSeasonLimits", () => {
  it("falls back to reference_free when season root is not linked", async () => {
    const db = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => null),
        })),
      })),
    } as unknown as D1Database;

    const limits = await resolveGameSeasonLimits(db, CR_SEASON_01);
    expect(limits.nodeCap).toBe(REFERENCE_FREE_GAME_NODE_CAP);
  });

  it("uses linked account plan entitlements", async () => {
    const entitlements = JSON.stringify(HOSTED_GAME_SEASON_ENTITLEMENTS);
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((..._args: unknown[]) => ({
          first: vi.fn(async () => {
            if (sql.includes("steward_account_profiles")) {
              return { account_id: "acc_game" };
            }
            if (sql.includes("FROM steward_accounts")) {
              return {
                account_id: "acc_game",
                plan_id: HOSTED_GAME_SEASON_PLAN_ID,
                plan_version: 1,
                status: "active",
                effective_from: "2026-01-01T00:00:00.000Z",
                effective_until: null,
                overrides_json: null,
              };
            }
            if (sql.includes("steward_plan_definitions")) {
              return { entitlements_json: entitlements };
            }
            return null;
          }),
        })),
      })),
    } as unknown as D1Database;

    const limits = await resolveGameSeasonLimits(db, CR_SEASON_01);
    expect(limits.nodeCap).toBe(50);
  });
});

function mockGameSeasonDb(handlers: {
  schemaReady: boolean;
  counters?: Map<string, number>;
}) {
  const counters = handlers.counters ?? new Map<string, number>();
  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        bind: vi.fn((...args: unknown[]) => ({
          first: vi.fn(async () => {
            if (sql.includes("sqlite_master") && sql.includes("name = ?")) {
              return handlers.schemaReady ? { 1: 1 } : null;
            }
            if (sql.includes("game_season_usage_counters") && sql.includes("SELECT count")) {
              const key = `${args[0]}:${args[1]}:${args[2]}`;
              const count = counters.get(key) ?? 0;
              return count > 0 ? { count } : null;
            }
            return null;
          }),
          run: vi.fn(async () => {
            if (sql.includes("INSERT INTO game_season_usage_counters")) {
              const key = `${args[0]}:${args[1]}:${args[2]}`;
              counters.set(key, (counters.get(key) ?? 0) + 1);
            }
          }),
        })),
        first: vi.fn(async () => null),
      };
      return stmt;
    }),
  } as unknown as D1Database;
}

describe("enforceGameContributeSeasonQuota", () => {
  it("returns null when metering schema is missing", async () => {
    const db = mockGameSeasonDb({ schemaReady: false });

    const res = await enforceGameContributeSeasonQuota(
      db,
      CR_SEASON_01,
      ENABLED_LIMITS
    );
    expect(res).toBeNull();
  });

  it("returns 429 when season contribute cap is reached", async () => {
    const seasonId = "test_season_quota";
    const dayKey = new Date().toISOString().slice(0, 10);
    const counters = new Map<string, number>([
      [`${seasonId}:${GAME_METER_EVENT_CONTRIBUTE}:${dayKey}`, 2],
    ]);

    const db = mockGameSeasonDb({ schemaReady: true, counters });

    expect(await gameSeasonSchemaReady(db)).toBe(true);

    const season = { ...CR_SEASON_01, season_id: seasonId };

    const res = await enforceGameContributeSeasonQuota(db, season, ENABLED_LIMITS);
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as {
      error: string;
      usage: Record<string, number>;
    };
    expect(body.error).toBe("game_season_quota_exceeded");
    expect(body.usage).toMatchObject({
      [GAME_METER_EVENT_CONTRIBUTE]: 2,
      limit: 2,
    });

    await incrementGameSeasonUsage(db, seasonId, GAME_METER_EVENT_CONTRIBUTE, dayKey);
    expect(
      await getGameSeasonUsageCount(db, seasonId, GAME_METER_EVENT_CONTRIBUTE, dayKey)
    ).toBe(3);
  });

  it("returns 429 when the season plan is disabled", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameContributeSeasonQuota(
      db,
      CR_SEASON_01,
      DISABLED_LIMITS
    );
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as { message: string; usage: Record<string, number> };
    expect(body.message).toMatch(/not enabled/i);
    expect(body.usage).toMatchObject({
      [GAME_METER_EVENT_CONTRIBUTE]: 0,
      limit: 0,
    });
  });
});

describe("enforceGameSnapshotSeasonQuota", () => {
  it("returns null under the daily snapshot cap", async () => {
    const seasonId = "test_season_snapshot_ok";
    const dayKey = new Date().toISOString().slice(0, 10);
    const counters = new Map<string, number>([
      [`${seasonId}:${GAME_METER_EVENT_SNAPSHOT}:${dayKey}`, 2],
    ]);
    const db = mockGameSeasonDb({ schemaReady: true, counters });
    const season = { ...CR_SEASON_01, season_id: seasonId };

    const res = await enforceGameSnapshotSeasonQuota(db, season, ENABLED_LIMITS);
    expect(res).toBeNull();
  });

  it("returns 429 when the daily snapshot cap is reached", async () => {
    const seasonId = "test_season_snapshot_cap";
    const dayKey = new Date().toISOString().slice(0, 10);
    const counters = new Map<string, number>([
      [`${seasonId}:${GAME_METER_EVENT_SNAPSHOT}:${dayKey}`, 3],
    ]);
    const db = mockGameSeasonDb({ schemaReady: true, counters });
    const season = { ...CR_SEASON_01, season_id: seasonId };

    const res = await enforceGameSnapshotSeasonQuota(db, season, ENABLED_LIMITS);
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as {
      error: string;
      message: string;
      usage: Record<string, number>;
    };
    expect(body.error).toBe("game_season_quota_exceeded");
    expect(body.message).toMatch(/snapshot/i);
    expect(body.usage).toMatchObject({
      [GAME_METER_EVENT_SNAPSHOT]: 3,
      limit: 3,
    });
  });

  it("returns 429 when the season plan is disabled", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameSnapshotSeasonQuota(
      db,
      CR_SEASON_01,
      DISABLED_LIMITS
    );
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as { usage: Record<string, number> };
    expect(body.usage).toMatchObject({
      [GAME_METER_EVENT_SNAPSHOT]: 0,
      limit: 0,
    });
  });
});

describe("enforceGameUpdateSeasonQuota", () => {
  it("returns 429 when the daily game-update cap is reached", async () => {
    const seasonId = "test_season_update_cap";
    const dayKey = new Date().toISOString().slice(0, 10);
    const counters = new Map<string, number>([
      [`${seasonId}:${GAME_METER_EVENT_UPDATE}:${dayKey}`, 4],
    ]);
    const db = mockGameSeasonDb({ schemaReady: true, counters });
    const season = { ...CR_SEASON_01, season_id: seasonId };

    const res = await enforceGameUpdateSeasonQuota(db, season, ENABLED_LIMITS);
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as {
      error: string;
      message: string;
      usage: Record<string, number>;
    };
    expect(body.error).toBe("game_season_quota_exceeded");
    expect(body.message).toMatch(/game-update/i);
    expect(body.usage).toMatchObject({
      [GAME_METER_EVENT_UPDATE]: 4,
      limit: 4,
    });
  });

  it("returns null when metering schema is missing", async () => {
    const db = mockGameSeasonDb({ schemaReady: false });
    const res = await enforceGameUpdateSeasonQuota(
      db,
      CR_SEASON_01,
      ENABLED_LIMITS
    );
    expect(res).toBeNull();
  });
});

describe("enforceGameNodeCap", () => {
  it("returns null when active nodes are under the plan cap", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameNodeCap(
      db,
      CR_SEASON_01,
      ENABLED_LIMITS.nodeCap - 1,
      ENABLED_LIMITS
    );
    expect(res).toBeNull();
  });

  it("returns 429 when active nodes reach the plan cap", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameNodeCap(
      db,
      CR_SEASON_01,
      ENABLED_LIMITS.nodeCap,
      ENABLED_LIMITS
    );
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as {
      error: string;
      message: string;
      usage: Record<string, number>;
    };
    expect(body.error).toBe("game_season_quota_exceeded");
    expect(body.message).toMatch(/node limit/i);
    expect(body.usage).toMatchObject({
      "game.season.node_cap": ENABLED_LIMITS.nodeCap,
      limit: ENABLED_LIMITS.nodeCap,
    });
  });

  it("returns 429 when the season plan is disabled even with zero nodes", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameNodeCap(db, CR_SEASON_01, 0, DISABLED_LIMITS);
    expect(res?.status).toBe(429);
    const body = (await res?.json()) as { usage: Record<string, number> };
    expect(body.usage).toMatchObject({
      "game.season.node_cap": 0,
      limit: 0,
    });
  });

  it("applies CITY_GAME_LOCAL_NODE_CAP when higher than the plan cap", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const atPlanCap = await enforceGameNodeCap(
      db,
      CR_SEASON_01,
      ENABLED_LIMITS.nodeCap,
      ENABLED_LIMITS,
      { CITY_GAME_LOCAL_NODE_CAP: "60" }
    );
    expect(atPlanCap).toBeNull();

    const overLocalCap = await enforceGameNodeCap(
      db,
      CR_SEASON_01,
      60,
      ENABLED_LIMITS,
      { CITY_GAME_LOCAL_NODE_CAP: "60" }
    );
    expect(overLocalCap?.status).toBe(429);
    const body = (await overLocalCap?.json()) as { usage: Record<string, number> };
    expect(body.usage).toMatchObject({
      "game.season.node_cap": 60,
      limit: 60,
    });
  });
});

describe("recordGame*SeasonUsage", () => {
  it("increments contribute/snapshot/update meters when schema is ready", async () => {
    const seasonId = "test_season_record";
    const dayKey = new Date().toISOString().slice(0, 10);
    const counters = new Map<string, number>();
    const db = mockGameSeasonDb({ schemaReady: true, counters });

    await recordGameContributeSeasonUsage(db, seasonId);
    await recordGameSnapshotSeasonUsage(db, seasonId);
    await recordGameUpdateSeasonUsage(db, seasonId);

    expect(counters.get(`${seasonId}:${GAME_METER_EVENT_CONTRIBUTE}:${dayKey}`)).toBe(1);
    expect(counters.get(`${seasonId}:${GAME_METER_EVENT_SNAPSHOT}:${dayKey}`)).toBe(1);
    expect(counters.get(`${seasonId}:${GAME_METER_EVENT_UPDATE}:${dayKey}`)).toBe(1);
  });

  it("no-ops when metering schema is missing", async () => {
    const seasonId = "test_season_record_missing";
    const counters = new Map<string, number>();
    const db = mockGameSeasonDb({ schemaReady: false, counters });

    await recordGameContributeSeasonUsage(db, seasonId);
    await recordGameSnapshotSeasonUsage(db, seasonId);
    await recordGameUpdateSeasonUsage(db, seasonId);

    expect(counters.size).toBe(0);
  });
});
