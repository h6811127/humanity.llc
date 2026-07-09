import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  handleGetSeasonSnapshot,
  resetSeasonSnapshotCacheForTests,
} from "../src/resolver/season-snapshot";
import * as seasonWindow from "../src/city-game/season-window";
import { normalizeGameMeta } from "../src/city-game/game-meta";
import { CR_SEASON_01 } from "../src/city-game/season-config";

const SEASON_ID = "cr_season_01_wake";

class SnapshotDb {
  rateBuckets = new Map<string, { count: number; window_start: string }>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("sqlite_master") && sql.includes("name = ?")) {
              return null as T | null;
            }
            if (sql.includes("FROM rate_limit_buckets WHERE bucket_key")) {
              const key = String(args[0]);
              const row = db.rateBuckets.get(key);
              return row ? ({ count: row.count } as T) : null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.startsWith("INSERT INTO rate_limit_buckets")) {
              db.rateBuckets.set(String(args[0]), {
                count: Number(args[1]),
                window_start: String(args[2]),
              });
            }
            if (sql.startsWith("UPDATE rate_limit_buckets SET count")) {
              const key = String(args[0]);
              const row = db.rateBuckets.get(key);
              if (row) row.count += 1;
            }
            return { success: true, meta: { changes: 1 } };
          },
          async all<T>() {
            return { results: [] as T[] };
          },
        };
      },
    };
  }
}

class SnapshotRelayConflictDb extends SnapshotDb {
  objectId = "obj_cr_node_05_bridge";
  rootProfile = CR_SEASON_01.season_root_profile_id!;

  relayRow() {
    return {
      object_id: this.objectId,
      parent_profile_id: this.rootProfile,
      object_type: "game_node",
      public_label: "16th Avenue bridge",
      public_state: "Red team holds the relay",
      status: "active",
      child_object_document_json: JSON.stringify({
        object_id: this.objectId,
        parent_profile_id: this.rootProfile,
        object_type: "game_node",
        season_id: SEASON_ID,
        node_role: "relay_gate",
        district: "czech_village",
        game_meta: normalizeGameMeta({
          held_by_faction: "red",
          held_until: "2026-06-07T12:00:00.000Z",
        }),
      }),
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
    };
  }

  prepare(sql: string) {
    const base = super.prepare(sql);
    const db = this;
    return {
      bind(...args: unknown[]) {
        const bound = base.bind(...args);
        return {
          async first<T>() {
            if (sql.includes("FROM child_objects WHERE object_id = ?")) {
              return db.relayRow() as T;
            }
            return bound.first<T>();
          },
          async all<T>() {
            if (sql.includes("FROM child_objects") && sql.includes("WHERE parent_profile_id")) {
              return { results: [db.relayRow()] as T[] };
            }
            return bound.all<T>();
          },
          async run() {
            if (sql.includes("UPDATE child_objects") && sql.includes("updated_at = ?")) {
              return { success: true, meta: { changes: 0 } };
            }
            return bound.run();
          },
        };
      },
    };
  }
}

describe("season snapshot API", () => {
  beforeEach(() => {
    resetSeasonSnapshotCacheForTests();
  });

  it("returns 404 when city game is disabled", async () => {
    const res = await handleGetSeasonSnapshot(
      new Request(`http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`),
      { CITY_GAME_ENABLED: "0", DB: {} as never },
      SEASON_ID
    );
    expect(res.status).toBe(404);
  });

  it("returns bulletin headlines from schedule when season root is unset", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));

    const res = await handleGetSeasonSnapshot(
      new Request(`http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`),
      { CITY_GAME_ENABLED: "1", DB: new SnapshotDb() as never },
      SEASON_ID
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      season_id: string;
      headlines: string[];
      nodes: unknown[];
      signal_war?: {
        faction_network_points: Record<string, number>;
      };
    };
    expect(body.season_id).toBe(SEASON_ID);
    expect(body.nodes).toEqual([]);
    expect(body.window_phase).toBe("open");
    expect(body.headlines.some((line) => line.includes("NewBo relay arch"))).toBe(true);
    expect(body.signal_war).toBeDefined();
    expect(body.signal_war.faction_network_points).toEqual({
      red: 0,
      blue: 0,
      green: 0,
      yellow: 0,
    });
    expect(body.map_visibility).toBe("signal_war");
    expect(body.signal_war.dual_victory).toBeDefined();
    expect(res.headers.get("Cache-Control")).toContain("max-age=15");
    expect(res.headers.get("ETag")).toMatch(/^W\/"/);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns 304 when If-None-Match matches cached snapshot (R-19)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));

    const url = `http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`;
    const env = { CITY_GAME_ENABLED: "1", DB: new SnapshotDb() as never };

    const first = await handleGetSeasonSnapshot(new Request(url), env, SEASON_ID);
    expect(first.status).toBe(200);
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();

    const second = await handleGetSeasonSnapshot(
      new Request(url, { headers: { "If-None-Match": etag! } }),
      env,
      SEASON_ID
    );
    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("omits per-player fields from snapshot shape", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));

    const res = await handleGetSeasonSnapshot(
      new Request(`http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`),
      { CITY_GAME_ENABLED: "1", DB: new SnapshotDb() as never },
      SEASON_ID
    );
    const body = (await res.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/profile_id|scan count|leaderboard|heatmap/i);
    expect(Array.isArray(body.headlines)).toBe(true);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns a snapshot when best-effort relay decay hits write conflicts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));
    vi.spyOn(seasonWindow, "resolveSeasonWindowPhase").mockReturnValue("open");

    const res = await handleGetSeasonSnapshot(
      new Request(`http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`),
      { CITY_GAME_ENABLED: "1", DB: new SnapshotRelayConflictDb() as never },
      SEASON_ID
    );

    expect(res.status).toBe(200);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
