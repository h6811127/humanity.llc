import { describe, expect, it } from "vitest";

import {
  applyUnlockSideEffects,
  reconcileSeasonUnlockDrift,
} from "../src/city-game/unlock-evaluator";

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const RIVER_OBJECT = "obj_cr_node_04_river";
const CABINET_OBJECT = "obj_cr_node_07_cabinet";
const MURAL_OBJECT = "obj_cr_node_09_mural";
const FINALE_OBJECT = "obj_cr_node_13_finale";
const CREATED = "2026-06-01T12:00:00.000Z";

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

class UnlockDb {
  objects = new Map<string, ObjectRow>();

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
              const row = db.objects.get(objectId);
              if (row) {
                row.object_type = String(args[0]);
                row.public_label = String(args[1]);
                row.public_state = String(args[2]);
                row.status = String(args[3]);
                row.child_object_document_json = String(args[4]);
                row.updated_at = String(args[5]);
              }
            }
            return { success: true, meta: { changes: 1 } };
          },
        };
      },
    };
  }
}

describe("unlock-evaluator", () => {
  it("unlocks cabinet when operator game-update sets River quorum complete", async () => {
    const db = new UnlockDb();
    db.objects.set(RIVER_OBJECT, {
      object_id: RIVER_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Riverwalk River Lantern",
      public_state: "Seed clue live",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { collective_progress: 20, collective_target: 20, unlocked_by: [] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(CABINET_OBJECT, {
      object_id: CABINET_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village cabinet",
      public_state: "Locked until River Lantern quorum",
      status: "active",
      child_object_document_json: JSON.stringify({
        public_state: "Locked until River Lantern quorum",
        game_meta: { unlocked_by: [], vouch_requires: ["node_10"] },
        object_streams: [
          { id: "relay", label: "Path", value: "Hidden landmark" },
          { id: "territory", label: "Gate", value: "Vouch required" },
        ],
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    const riverDoc = {
      public_state: "Unlocked together — Czech Village cabinet path opening",
      game_meta: { collective_progress: 20, collective_target: 20, unlocked_by: [] },
      object_streams: [{ id: "relay", label: "Collective", value: "20 / 20" }],
    };

    const result = await applyUnlockSideEffects(
      db as unknown as D1Database,
      "node_04",
      riverDoc,
      new Date(CREATED)
    );

    expect(result.unlockedNodes).toContain("node_07");
    const cabinet = db.objects.get(CABINET_OBJECT)!;
    const cabinetDoc = JSON.parse(cabinet.child_object_document_json);
    expect(cabinetDoc.game_meta.unlocked_by).toContain("node_04");
    expect(cabinet.public_state).toContain("Unlocked together");
  });

  it("records fragment on finale when operator marks fragment node claimed", async () => {
    const db = new UnlockDb();
    db.objects.set(MURAL_OBJECT, {
      object_id: MURAL_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village mural",
      public_state: "Fragment registered",
      status: "active",
      child_object_document_json: "{}",
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(FINALE_OBJECT, {
      object_id: FINALE_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Downtown alley arch",
      public_state: "Finale switch dormant",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { unlocked_by: [] },
        object_streams: [{ id: "bulletin", label: "Need", value: "0 / 3 fragments" }],
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    const muralDoc = {
      public_state: "Fragment registered — city-scale coordination continues",
      game_meta: { unlocked_by: ["node_09"] },
      object_streams: [{ id: "relay", label: "Fragment", value: "Claimed" }],
    };

    const result = await applyUnlockSideEffects(
      db as unknown as D1Database,
      "node_09",
      muralDoc,
      new Date(CREATED)
    );

    expect(result.fragmentsRegistered).toBe(1);
    expect(result.fragmentsRequired).toBe(3);
    expect(result.finaleOpen).toBe(false);
    const finale = db.objects.get(FINALE_OBJECT)!;
    const finaleDoc = JSON.parse(finale.child_object_document_json);
    expect(finaleDoc.game_meta.unlocked_by).toContain("node_09");
  });

  it("reconcileSeasonUnlockDrift repairs cabinet when River quorum met but unlock missed", async () => {
    const db = new UnlockDb();
    db.objects.set(RIVER_OBJECT, {
      object_id: RIVER_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Riverwalk River Lantern",
      public_state: "Unlocked together",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { collective_progress: 20, collective_target: 20, unlocked_by: [] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(CABINET_OBJECT, {
      object_id: CABINET_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village cabinet",
      public_state: "Locked until River Lantern quorum",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { unlocked_by: [], vouch_requires: ["node_10"] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    const { repaired } = await reconcileSeasonUnlockDrift(
      db as unknown as D1Database,
      new Date(CREATED)
    );

    expect(repaired).toContain("node_07");
    const cabinet = db.objects.get(CABINET_OBJECT)!;
    const cabinetDoc = JSON.parse(cabinet.child_object_document_json);
    expect(cabinetDoc.game_meta.unlocked_by).toContain("node_04");
  });

  it("applyUnlockSideEffects evolves River Lantern when quorum met but copy still seed", async () => {
    const db = new UnlockDb();
    db.objects.set(RIVER_OBJECT, {
      object_id: RIVER_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Riverwalk River Lantern",
      public_state: "Seed clue live",
      status: "active",
      child_object_document_json: JSON.stringify({
        object_streams: [{ id: "bulletin", label: "Clue", value: "Lantern path waking" }],
        game_meta: { collective_progress: 20, collective_target: 20, unlocked_by: [] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(CABINET_OBJECT, {
      object_id: CABINET_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village cabinet",
      public_state: "Locked",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { unlocked_by: [], vouch_requires: ["node_10"] },
        object_streams: [],
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    const riverDoc = JSON.parse(db.objects.get(RIVER_OBJECT)!.child_object_document_json);
    await applyUnlockSideEffects(
      db as unknown as D1Database,
      "node_04",
      riverDoc,
      new Date(CREATED)
    );

    const river = db.objects.get(RIVER_OBJECT)!;
    const riverDocAfter = JSON.parse(river.child_object_document_json);
    expect(river.public_state).toContain("Evolved together");
    expect(riverDocAfter.object_streams[0].value).toContain("Evolved clue");
  });

  it("reconcileSeasonUnlockDrift is a no-op when unlock graph is already consistent", async () => {
    const db = new UnlockDb();
    db.objects.set(RIVER_OBJECT, {
      object_id: RIVER_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Riverwalk River Lantern",
      public_state: "Unlocked together",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { collective_progress: 20, collective_target: 20, unlocked_by: [] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(CABINET_OBJECT, {
      object_id: CABINET_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village cabinet",
      public_state: "Unlocked together",
      status: "active",
      child_object_document_json: JSON.stringify({
        game_meta: { unlocked_by: ["node_04"], vouch_requires: ["node_10"] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    const { repaired } = await reconcileSeasonUnlockDrift(
      db as unknown as D1Database,
      new Date(CREATED)
    );

    expect(repaired).toEqual([]);
  });
});
