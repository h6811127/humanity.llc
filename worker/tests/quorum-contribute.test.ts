import { describe, expect, it } from "vitest";

import {
  QUORUM_CONTRIBUTE_MAX_RETRIES,
  bumpQuorumProgressWithRetry,
} from "../src/city-game/quorum-contribute";

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const RIVER_OBJECT = "obj_cr_node_04_river";
const CABINET_OBJECT = "obj_cr_node_07_cabinet";
const CREATED = "2026-06-01T12:00:00.000Z";

function riverDocument(progress: number) {
  return JSON.stringify({
    object_id: RIVER_OBJECT,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Seed clue live",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "temp_drop",
    district: "river_spine",
    object_streams: [
      { id: "relay", class: "route", label: "Collective", value: `${progress} / 20` },
    ],
    game_meta: {
      visible_until: null,
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
    object_streams: [],
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

class QuorumDb {
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

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM child_objects WHERE object_id")) {
              const id = String(args[0]);
              return (db.objects.get(id) as T) ?? null;
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

describe("quorum-contribute (R-07)", () => {
  it("retries optimistic writes until concurrent bumps land", async () => {
    const db = new QuorumDb();
    const now = new Date("2026-06-01T18:00:00.000Z");

    const tasks = Array.from({ length: 20 }, (_, index) =>
      bumpQuorumProgressWithRetry(db as unknown as D1Database, {
        objectId: RIVER_OBJECT,
        parentProfileId: PROFILE,
        nodeId: "node_04",
        now: new Date(now.getTime() + index),
      })
    );

    const results = await Promise.all(tasks);
    expect(results.every((row) => row != null)).toBe(true);
    expect(Math.max(...results.map((row) => row!.collectiveProgress))).toBe(20);
    expect(results.some((row) => row?.quorumComplete)).toBe(true);

    const river = db.objects.get(RIVER_OBJECT)!;
    const riverDoc = JSON.parse(river.child_object_document_json);
    expect(riverDoc.game_meta.collective_progress).toBe(20);

    const cabinet = db.objects.get(CABINET_OBJECT)!;
    const cabinetDoc = JSON.parse(cabinet.child_object_document_json);
    expect(cabinetDoc.game_meta.unlocked_by).toContain("node_04");
  });

  it("throws after retry budget is exhausted", async () => {
    class StuckQuorumDb extends QuorumDb {
      prepare(sql: string) {
        const base = super.prepare(sql);
        return {
          bind: (...args: unknown[]) => {
            const inner = base.bind(...args);
            return {
              ...inner,
              async run() {
                if (sql.includes("AND updated_at = ?")) {
                  return { success: true, meta: { changes: 0 } };
                }
                return inner.run();
              },
            };
          },
        };
      }
    }

    const db = new StuckQuorumDb();

    await expect(
      bumpQuorumProgressWithRetry(db as unknown as D1Database, {
        objectId: RIVER_OBJECT,
        parentProfileId: PROFILE,
        nodeId: "node_04",
        now: new Date("2026-06-01T18:00:00.000Z"),
        maxRetries: 2,
      })
    ).rejects.toThrow("QUORUM_WRITE_CONFLICT");

    expect(QUORUM_CONTRIBUTE_MAX_RETRIES).toBeGreaterThanOrEqual(5);
  });
});
