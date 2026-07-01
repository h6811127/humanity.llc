import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  handleGetSeasonSnapshot,
  resetSeasonSnapshotCacheForTests,
} from "../src/resolver/season-snapshot";
import * as seasonWindow from "../src/city-game/season-window";
import { CR_SEASON_01 } from "../src/city-game/season-config";
import type { ChildObjectRow } from "../src/db/types";

const SEASON_ID = "cr_season_01_wake";

class SnapshotDb {
  rateBuckets = new Map<string, { count: number; window_start: string }>();
  usageCount = 0;
  schemaReady = false;
  childRows: ChildObjectRow[] = [];
  activeQrs: Array<{ qr_id: string; object_id: string }> = [];
  childUpdates: unknown[][] = [];

  constructor(opts: Partial<SnapshotDb> = {}) {
    Object.assign(this, opts);
  }

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("sqlite_master") && sql.includes("name = ?")) {
              if (args[0] === "game_season_usage_counters") {
                return (db.schemaReady ? { 1: 1 } : null) as T | null;
              }
              return null as T | null;
            }
            if (sql.includes("FROM rate_limit_buckets WHERE bucket_key")) {
              const key = String(args[0]);
              const row = db.rateBuckets.get(key);
              return row ? ({ count: row.count } as T) : null;
            }
            if (sql.includes("FROM game_season_usage_counters")) {
              return { count: db.usageCount } as T;
            }
            if (sql.includes("FROM child_objects WHERE object_id = ?")) {
              return (db.childRows.find((row) => row.object_id === args[0]) ?? null) as
                | T
                | null;
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
            if (sql.startsWith("INSERT INTO game_season_usage_counters")) {
              db.usageCount += 1;
            }
            if (sql.startsWith("UPDATE child_objects")) {
              db.childUpdates.push(args);
            }
            return { success: true, meta: { changes: 1 } };
          },
          async all<T>() {
            if (sql.includes("FROM child_objects")) {
              return { results: db.childRows as T[] };
            }
            if (sql.includes("FROM qr_credentials")) {
              return { results: db.activeQrs as T[] };
            }
            return { results: [] as T[] };
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

  it("does not persist relay decay from the public snapshot GET", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));

    const relay = CR_SEASON_01.nodes.find((node) => node.role === "relay_gate")!;
    const root = CR_SEASON_01.season_root_profile_id!;
    const db = new SnapshotDb({
      childRows: [
        {
          object_id: relay.object_id,
          parent_profile_id: root,
          object_type: "game_node",
          public_label: relay.label,
          public_state: "Blue holds the relay",
          status: "active",
          child_object_document_json: JSON.stringify({
            object_id: relay.object_id,
            object_type: "game_node",
            season_id: CR_SEASON_01.season_id,
            node_role: relay.role,
            district: relay.district,
            game_meta: {
              visible_until: null,
              compromised: false,
              collective_progress: null,
              collective_target: null,
              unlocked_by: [],
              vouch_requires: [],
              vouch_active_for: [],
              scarcity_remaining: null,
              fragment_id: null,
              held_by_faction: "blue",
              held_until: "2026-06-07T12:00:00.000Z",
            },
            object_streams: [],
          }),
          created_at: "2026-06-07T10:00:00.000Z",
          updated_at: "2026-06-07T11:00:00.000Z",
        },
      ],
      activeQrs: [{ qr_id: "qr_relay", object_id: relay.object_id }],
    });

    const res = await handleGetSeasonSnapshot(
      new Request(`http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`),
      { CITY_GAME_ENABLED: "1", DB: db as never },
      SEASON_ID
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      nodes: Array<{ node_id: string; public_state: string; chips: Array<{ label: string }> }>;
      signal_war: { faction_network_points: Record<string, number> };
    };
    const node = body.nodes.find((row) => row.node_id === relay.node_id);
    expect(node?.public_state).toContain("decayed to neutral");
    expect(node?.chips.some((chip) => chip.label === "Hold")).toBe(false);
    expect(body.signal_war.faction_network_points.blue).toBe(0);
    expect(db.childUpdates).toEqual([]);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("checks season snapshot quota before serving a cached body", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));

    const url = `http://127.0.0.1:8787/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`;
    const db = new SnapshotDb({ schemaReady: true });
    const env = { CITY_GAME_ENABLED: "1", DB: db as never };

    const first = await handleGetSeasonSnapshot(new Request(url), env, SEASON_ID);
    expect(first.status).toBe(200);
    db.usageCount = 100_000;

    const second = await handleGetSeasonSnapshot(new Request(url), env, SEASON_ID);
    expect(second.status).toBe(429);
    const body = (await second.json()) as { error: string };
    expect(body.error).toBe("game_season_quota_exceeded");

    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
