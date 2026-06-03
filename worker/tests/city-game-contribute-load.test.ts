import { describe, expect, it, vi } from "vitest";

import { handlePostGameContribute } from "../src/resolver/game-contribute";
import * as seasonWindow from "../src/city-game/season-window";
import {
  CONTRIBUTE_LOAD_CONCURRENCY,
  assessContributeLoadResults,
  assessQuorumLoadOutcome,
} from "../scripts/city-game-contribute-load-core.mjs";

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const RIVER_OBJECT = "obj_cr_node_04_river";
const CABINET_OBJECT = "obj_cr_node_07_cabinet";
const QR = "qr_cr_node_04_river01";
const CREATED = "2026-06-01T12:00:00.000Z";

function riverDocument(progress: number) {
  return JSON.stringify({
    object_id: RIVER_OBJECT,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Seed clue live — share outward to evolve",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "temp_drop",
    district: "river_spine",
    object_streams: [
      { id: "relay", class: "route", label: "Collective", value: `${progress} / 20` },
      { id: "care", class: "care", label: "Trail", value: "Open" },
    ],
    game_meta: {
      visible_until: "2026-06-14T22:00:00-05:00",
      compromised: false,
      collective_progress: progress,
      collective_target: 20,
      unlocked_by: [],
      vouch_requires: [],
      scarcity_remaining: null,
      fragment_id: null,
    },
    created_at: CREATED,
    updated_at: CREATED,
  });
}

function cabinetDocument() {
  return JSON.stringify({
    object_id: CABINET_OBJECT,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Czech Village cabinet",
    public_state: "Locked until River Lantern quorum",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "lore_archive",
    district: "czech_village",
    object_streams: [
      { id: "territory", class: "place", label: "Gate", value: "Vouch required" },
      { id: "relay", class: "route", label: "Path", value: "Hidden landmark" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: null,
      unlocked_by: [],
      vouch_requires: ["node_10"],
      scarcity_remaining: null,
      fragment_id: "czech_1",
    },
    created_at: CREATED,
    updated_at: CREATED,
  });
}

type ObjectRow = {
  object_id: string;
  parent_profile_id: string;
  object_type: string;
  public_label: string;
  public_state: string;
  status: string;
  child_object_document_json: string;
  created_at: string;
  updated_at: string;
};

class ContributeDb {
  qr = {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null as string | null,
    object_id: RIVER_OBJECT,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: CREATED,
    expires_at: null as string | null,
    credential_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  };

  objects = new Map<string, ObjectRow>([
    [
      RIVER_OBJECT,
      {
        object_id: RIVER_OBJECT,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "Riverwalk River Lantern",
        public_state: "Seed clue live",
        status: "active",
        child_object_document_json: riverDocument(0),
        created_at: CREATED,
        updated_at: CREATED,
      },
    ],
    [
      CABINET_OBJECT,
      {
        object_id: CABINET_OBJECT,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "Czech Village cabinet",
        public_state: "Locked until River Lantern quorum",
        status: "active",
        child_object_document_json: cabinetDocument(),
        created_at: CREATED,
        updated_at: CREATED,
      },
    ],
  ]);

  rateBuckets = new Map<string, { count: number; window_start: string }>();
  contributeBuckets = new Map<string, number>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM qr_credentials WHERE qr_id")) {
              return db.qr as T;
            }
            if (sql.includes("FROM child_objects WHERE object_id")) {
              const id = String(args[0]);
              return (db.objects.get(id) as T) ?? null;
            }
            if (sql.includes("FROM rate_limit_buckets WHERE bucket_key")) {
              const key = String(args[0]);
              const row = db.rateBuckets.get(key);
              return row ? ({ count: row.count } as T) : null;
            }
            if (sql.includes("FROM game_contribute_buckets")) {
              const [objectId, seasonId, bucketDate] = args.map(String);
              const key = `${objectId}:${seasonId}:${bucketDate}`;
              const count = db.contributeBuckets.get(key);
              return count != null ? ({ contribution_count: count } as T) : null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.startsWith("UPDATE child_objects")) {
              const objectId = String(args[6]);
              const parentProfileId = String(args[7]);
              const row = db.objects.get(objectId);
              if (!row || row.parent_profile_id !== parentProfileId) {
                return { success: true, meta: { changes: 0 } };
              }
              if (sql.includes("AND updated_at = ?")) {
                const expectedUpdatedAt = String(args[8]);
                if (row.updated_at !== expectedUpdatedAt) {
                  return { success: true, meta: { changes: 0 } };
                }
              }
              row.object_type = String(args[0]);
              row.public_label = String(args[1]);
              row.public_state = String(args[2]);
              row.status = String(args[3]);
              row.child_object_document_json = String(args[4]);
              row.updated_at = String(args[5]);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("INSERT INTO rate_limit_buckets")) {
              const key = String(args[0]);
              db.rateBuckets.set(key, {
                count: Number(args[1]),
                window_start: String(args[2]),
              });
            }
            if (sql.startsWith("UPDATE rate_limit_buckets SET count")) {
              const key = String(args[0]);
              const row = db.rateBuckets.get(key);
              if (row) row.count += 1;
            }
            if (sql.startsWith("INSERT INTO game_contribute_buckets")) {
              const key = `${args[0]}:${args[1]}:${args[2]}`;
              db.contributeBuckets.set(key, 1);
            }
            if (sql.startsWith("UPDATE game_contribute_buckets")) {
              const key = `${args[0]}:${args[1]}:${args[2]}`;
              const current = db.contributeBuckets.get(key) ?? 0;
              db.contributeBuckets.set(key, current + 1);
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

describe("city-game-contribute-load-core", () => {
  it("passes when all concurrent responses are HTTP 200", () => {
    const results = Array.from({ length: CONTRIBUTE_LOAD_CONCURRENCY }, () => ({
      status: 200,
      body: { collective_progress: 1 },
    }));
    const { ok, issues } = assessContributeLoadResults(results);
    expect(ok).toBe(true);
    expect(issues).toEqual([]);
  });

  it("fails on server errors or short response count", () => {
    const results = Array.from({ length: CONTRIBUTE_LOAD_CONCURRENCY }, (_, index) => ({
      status: index === 0 ? 500 : 200,
    }));
    const { ok, issues } = assessContributeLoadResults(results);
    expect(ok).toBe(false);
    expect(issues.some((issue) => issue.includes("server error"))).toBe(true);
  });

  it("assessQuorumLoadOutcome requires peak progress to reach target", () => {
    const results = Array.from({ length: CONTRIBUTE_LOAD_CONCURRENCY }, () => ({
      status: 200,
      body: { collective_progress: 20, collective_target: 20 },
    }));
    const { ok, issues } = assessQuorumLoadOutcome({
      results,
      finalProgress: 20,
      expectedTarget: 20,
    });
    expect(ok).toBe(true);
    expect(issues).toEqual([]);

    const bad = assessQuorumLoadOutcome({
      results,
      finalProgress: 3,
      expectedTarget: 20,
    });
    expect(bad.ok).toBe(false);
    expect(bad.issues.some((issue) => issue.includes("Final quorum progress"))).toBe(true);
  });
});

describe("game-contribute load (B5)", () => {
  it("handles 20 concurrent POSTs without server errors", async () => {
    vi.spyOn(seasonWindow, "resolveSeasonWindowPhase").mockReturnValue("open");

    const db = new ContributeDb();
    const tasks = Array.from({ length: CONTRIBUTE_LOAD_CONCURRENCY }, (_, index) =>
      handlePostGameContribute(
        new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": `203.0.113.${index + 1}`,
          },
          body: JSON.stringify({ qr_id: QR, site_code: "CR-LANTERN-7K" }),
        }),
        db as unknown as D1Database,
        { CITY_GAME_ENABLED: "1" },
        PROFILE,
        RIVER_OBJECT
      )
    );

    const responses = await Promise.all(tasks);
    const results = responses.map((res) => ({ status: res.status }));
    const { ok, issues } = assessContributeLoadResults(results);
    expect(ok).toBe(true);
    expect(issues).toEqual([]);
    expect(responses.every((res) => res.status < 500)).toBe(true);

    const river = db.objects.get(RIVER_OBJECT)!;
    const riverDoc = JSON.parse(river.child_object_document_json);
    expect(riverDoc.game_meta.collective_progress).toBe(20);

    const cabinet = db.objects.get(CABINET_OBJECT)!;
    const cabinetDoc = JSON.parse(cabinet.child_object_document_json);
    expect(cabinetDoc.game_meta.unlocked_by).toContain("node_04");

    vi.restoreAllMocks();
  });

  it("sequential contributions reach quorum target from zero", async () => {
    vi.spyOn(seasonWindow, "resolveSeasonWindowPhase").mockReturnValue("open");

    const db = new ContributeDb();
    let lastStatus = 0;
    for (let i = 1; i <= CONTRIBUTE_LOAD_CONCURRENCY; i += 1) {
      const res = await handlePostGameContribute(
        new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": `203.0.113.${i}`,
          },
          body: JSON.stringify({ qr_id: QR, site_code: "CR-LANTERN-7K" }),
        }),
        db as unknown as D1Database,
        { CITY_GAME_ENABLED: "1" },
        PROFILE,
        RIVER_OBJECT
      );
      lastStatus = res.status;
      expect(res.status).toBe(200);
    }
    expect(lastStatus).toBe(200);

    const river = db.objects.get(RIVER_OBJECT)!;
    const riverDoc = JSON.parse(river.child_object_document_json);
    expect(riverDoc.game_meta.collective_progress).toBe(20);

    const cabinet = db.objects.get(CABINET_OBJECT)!;
    const cabinetDoc = JSON.parse(cabinet.child_object_document_json);
    expect(cabinetDoc.game_meta.unlocked_by).toContain("node_04");

    vi.restoreAllMocks();
  });
});
