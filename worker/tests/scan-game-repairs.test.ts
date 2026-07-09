import { describe, expect, it } from "vitest";

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";
import { loadScanContextWithGameRepairs } from "../src/resolver/scan-game-repairs";
import type { CardRow, ChildObjectRow, QrCredentialRow } from "../src/db/types";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const RIVER_OBJECT = "obj_cr_node_04_river";
const CABINET_OBJECT = "obj_cr_node_07_cabinet";
const CREATED = "2026-06-01T12:00:00.000Z";

class ScanRepairDb {
  card: CardRow = {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "cedar_rapids_wake",
    handle_normalized: "cedar_rapids_wake",
    manifesto_line: "Wake season",
    status: "active",
    card_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  };

  qr: QrCredentialRow = {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: CABINET_OBJECT,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: CREATED,
    expires_at: "2027-06-01T12:00:00.000Z",
    credential_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  };

  objects = new Map<string, ChildObjectRow>();

  constructor() {
    this.objects.set(RIVER_OBJECT, {
      object_id: RIVER_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Riverwalk River Lantern",
      public_state: "Unlocked together",
      status: "active",
      child_object_document_json: JSON.stringify({
        object_id: RIVER_OBJECT,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        season_id: "cr_season_01_wake",
        game_meta: {
          collective_progress: 20,
          collective_target: 20,
          unlocked_by: [],
        },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });
    this.objects.set(CABINET_OBJECT, {
      object_id: CABINET_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village cabinet",
      public_state: "Locked until River Lantern quorum",
      status: "active",
      child_object_document_json: JSON.stringify({
        object_id: CABINET_OBJECT,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        season_id: "cr_season_01_wake",
        game_meta: { unlocked_by: [], vouch_requires: [] },
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });
  }

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("sqlite_master")) return null as T | null;
            if (sql.includes("FROM cards WHERE profile_id")) {
              return db.card as T;
            }
            if (sql.includes("FROM qr_credentials WHERE qr_id")) {
              return db.qr as T;
            }
            if (sql.includes("FROM child_objects WHERE object_id")) {
              return (db.objects.get(String(args[0])) as T) ?? null;
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

describe("scan game repairs", () => {
  it("repairs and reloads unlock drift for status and HTML scan callers", async () => {
    const db = new ScanRepairDb();
    const ctx = await loadScanContextWithGameRepairs(
      db as unknown as D1Database,
      PROFILE,
      QR,
      new Date(CREATED),
      { CITY_GAME_ENABLED: "1" }
    );

    const doc = JSON.parse(ctx.childObject!.child_object_document_json);
    expect(doc.game_meta.unlocked_by).toContain("node_04");
    expect(ctx.childObject?.public_state).toContain("Unlocked together");
  });
});
