import { describe, expect, it, vi } from "vitest";

import { CR_SEASON_01 } from "../src/city-game/season-config";
import {
  GAME_METER_EVENT_CONTRIBUTE,
  GAME_METER_EVENT_SNAPSHOT,
  GAME_METER_EVENT_UPDATE,
} from "../src/city-game/season-entitlements";
import {
  enforceGameNodeCap,
  enforceGameSnapshotSeasonQuota,
  enforceGameUpdateSeasonQuota,
  getGameSeasonUsageCount,
  recordGameSnapshotSeasonUsage,
  recordGameUpdateSeasonUsage,
} from "../src/city-game/season-quota";

const LIMITS = {
  enabled: true,
  nodeCap: 15,
  contributeDailyCap: 25,
  snapshotDailyCap: 3,
  gameUpdateDailyCap: 2,
} as const;

function mockGameSeasonDb(handlers: {
  schemaReady: boolean;
  counters?: Map<string, number>;
}) {
  const counters = handlers.counters ?? new Map<string, number>();
  return {
    prepare: vi.fn((sql: string) => {
      return {
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
    }),
  } as unknown as D1Database;
}

async function expectQuotaExceeded(
  res: Response | null,
  event: string
): Promise<void> {
  expect(res?.status).toBe(429);
  const body = (await res!.json()) as {
    error: string;
    retry_after: number;
    usage: Record<string, number>;
  };
  expect(body.error).toBe("game_season_quota_exceeded");
  expect(body.retry_after).toBe(3600);
  expect(body.usage[event]).toBeDefined();
}

describe("enforceGameSnapshotSeasonQuota", () => {
  it("returns null when metering schema is missing", async () => {
    const db = mockGameSeasonDb({ schemaReady: false });
    const res = await enforceGameSnapshotSeasonQuota(db, CR_SEASON_01, LIMITS);
    expect(res).toBeNull();
  });

  it("returns 429 when the season is disabled", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameSnapshotSeasonQuota(db, CR_SEASON_01, {
      ...LIMITS,
      enabled: false,
    });
    await expectQuotaExceeded(res, GAME_METER_EVENT_SNAPSHOT);
  });

  it("returns 429 at the daily snapshot cap and ignores contribute usage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));
    try {
      const dayKey = "2026-08-20";
      const season = { ...CR_SEASON_01, season_id: "season_snap_a" };
      const counters = new Map<string, number>([
        [`${season.season_id}:${GAME_METER_EVENT_SNAPSHOT}:${dayKey}`, 3],
        [`${season.season_id}:${GAME_METER_EVENT_CONTRIBUTE}:${dayKey}`, 0],
        [`season_snap_b:${GAME_METER_EVENT_SNAPSHOT}:${dayKey}`, 99],
      ]);
      const db = mockGameSeasonDb({ schemaReady: true, counters });

      const blocked = await enforceGameSnapshotSeasonQuota(db, season, LIMITS);
      await expectQuotaExceeded(blocked, GAME_METER_EVENT_SNAPSHOT);

      const peer = await enforceGameSnapshotSeasonQuota(
        db,
        { ...CR_SEASON_01, season_id: "season_snap_peer" },
        LIMITS
      );
      expect(peer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("recordGameSnapshotSeasonUsage increments only game.snapshot.get", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T15:00:00.000Z"));
    try {
      const counters = new Map<string, number>();
      const db = mockGameSeasonDb({ schemaReady: true, counters });
      await recordGameSnapshotSeasonUsage(db, "season_record");
      expect(
        await getGameSeasonUsageCount(
          db,
          "season_record",
          GAME_METER_EVENT_SNAPSHOT,
          "2026-08-20"
        )
      ).toBe(1);
      expect(
        await getGameSeasonUsageCount(
          db,
          "season_record",
          GAME_METER_EVENT_CONTRIBUTE,
          "2026-08-20"
        )
      ).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("recordGameSnapshotSeasonUsage is a no-op when the schema is missing", async () => {
    const counters = new Map<string, number>();
    const db = mockGameSeasonDb({ schemaReady: false, counters });
    await recordGameSnapshotSeasonUsage(db, "season_record");
    expect(counters.size).toBe(0);
  });
});

describe("enforceGameUpdateSeasonQuota", () => {
  it("returns 429 at the daily game-update cap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));
    try {
      const dayKey = "2026-08-20";
      const season = { ...CR_SEASON_01, season_id: "season_update_a" };
      const counters = new Map<string, number>([
        [`${season.season_id}:${GAME_METER_EVENT_UPDATE}:${dayKey}`, 2],
      ]);
      const db = mockGameSeasonDb({ schemaReady: true, counters });
      const res = await enforceGameUpdateSeasonQuota(db, season, LIMITS);
      await expectQuotaExceeded(res, GAME_METER_EVENT_UPDATE);
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows an update under the daily cap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));
    try {
      const db = mockGameSeasonDb({
        schemaReady: true,
        counters: new Map([
          [`season_update_ok:${GAME_METER_EVENT_UPDATE}:2026-08-20`, 1],
        ]),
      });
      const res = await enforceGameUpdateSeasonQuota(
        db,
        { ...CR_SEASON_01, season_id: "season_update_ok" },
        LIMITS
      );
      expect(res).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("recordGameUpdateSeasonUsage increments only game.game_update", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T15:00:00.000Z"));
    try {
      const db = mockGameSeasonDb({ schemaReady: true });
      await recordGameUpdateSeasonUsage(db, "season_update_record");
      expect(
        await getGameSeasonUsageCount(
          db,
          "season_update_record",
          GAME_METER_EVENT_UPDATE,
          "2026-08-20"
        )
      ).toBe(1);
      expect(
        await getGameSeasonUsageCount(
          db,
          "season_update_record",
          GAME_METER_EVENT_SNAPSHOT,
          "2026-08-20"
        )
      ).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("enforceGameNodeCap", () => {
  it("returns null when metering schema is missing", async () => {
    const db = mockGameSeasonDb({ schemaReady: false });
    const res = await enforceGameNodeCap(db, CR_SEASON_01, 99, LIMITS);
    expect(res).toBeNull();
  });

  it("returns 429 when the season is disabled", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const res = await enforceGameNodeCap(db, CR_SEASON_01, 1, {
      ...LIMITS,
      enabled: false,
    });
    await expectQuotaExceeded(res, "game.season.node_cap");
  });

  it("returns 429 when active game nodes are at the plan cap", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const blocked = await enforceGameNodeCap(db, CR_SEASON_01, 15, LIMITS);
    await expectQuotaExceeded(blocked, "game.season.node_cap");

    const allowed = await enforceGameNodeCap(db, CR_SEASON_01, 14, LIMITS);
    expect(allowed).toBeNull();
  });

  it("raises the cap with CITY_GAME_LOCAL_NODE_CAP but never lowers it", async () => {
    const db = mockGameSeasonDb({ schemaReady: true });
    const raised = await enforceGameNodeCap(db, CR_SEASON_01, 20, LIMITS, {
      CITY_GAME_LOCAL_NODE_CAP: "40",
    });
    expect(raised).toBeNull();

    const notLowered = await enforceGameNodeCap(db, CR_SEASON_01, 15, LIMITS, {
      CITY_GAME_LOCAL_NODE_CAP: "5",
    });
    await expectQuotaExceeded(notLowered, "game.season.node_cap");
  });
});
