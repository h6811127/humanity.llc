import { describe, expect, it } from "vitest";

import { normalizeGameMeta } from "../src/city-game/game-meta";
import {
  persistRelayDecayIfExpired,
  runRelayTerritoryDecayCron,
} from "../src/city-game/relay-decay-cron";
import { CR_SEASON_01 } from "../src/city-game/season-config";

const PROFILE = "prof_cr_season_root";
const BRIDGE_OBJECT = "obj_cr_node_05_bridge";
const CREATED = "2026-06-01T12:00:00.000Z";

class RelayDecayDb {
  objects = new Map<string, Record<string, unknown>>();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM child_objects WHERE object_id = ?")) {
              const objectId = String(args[0]);
              return (self.objects.get(objectId) as T | undefined) ?? null;
            }
            return null;
          },
          async all<T>() {
            if (sql.includes("WHERE parent_profile_id = ?")) {
              const parent = String(args[0]);
              const results = [...self.objects.values()].filter(
                (row) => row.parent_profile_id === parent
              );
              return { results: results as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("UPDATE child_objects") && sql.includes("updated_at = ?")) {
              const [
                objectType,
                publicLabel,
                publicState,
                status,
                documentJson,
                updatedAt,
                objectId,
                parentProfileId,
                expectedUpdatedAt,
              ] = args as string[];
              const row = self.objects.get(objectId);
              if (!row || row.updated_at !== expectedUpdatedAt) {
                return { success: true, meta: { changes: 0 } };
              }
              self.objects.set(objectId, {
                ...row,
                object_type: objectType,
                public_label: publicLabel,
                public_state: publicState,
                status,
                child_object_document_json: documentJson,
                updated_at: updatedAt,
                parent_profile_id: parentProfileId,
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function bridgeRow(overrides: Record<string, unknown> = {}) {
  return {
    object_id: BRIDGE_OBJECT,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "16th Avenue bridge",
    public_state: "Red team holds the relay",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_streams: [
        { id: "territory", label: "Controller", value: "Red team" },
        { id: "relay", label: "Relay status", value: "Held" },
      ],
      game_meta: normalizeGameMeta({
        held_by_faction: "red",
        held_until: "2026-06-08T12:00:00.000Z",
      }),
    }),
    created_at: CREATED,
    updated_at: CREATED,
    ...overrides,
  };
}

describe("relay-decay-cron (SW-05)", () => {
  it("persistRelayDecayIfExpired neutralizes expired relay holds", async () => {
    const db = new RelayDecayDb();
    db.objects.set(BRIDGE_OBJECT, bridgeRow());

    const decayed = await persistRelayDecayIfExpired(db as unknown as D1Database, {
      objectId: BRIDGE_OBJECT,
      parentProfileId: PROFILE,
      now: new Date("2026-06-08T13:00:00.000Z"),
    });

    expect(decayed).toBe(true);
    const row = db.objects.get(BRIDGE_OBJECT)!;
    const doc = JSON.parse(String(row.child_object_document_json));
    expect(doc.game_meta.held_by_faction).toBe("neutral");
    expect(doc.game_meta.held_until).toBeNull();
    expect(row.public_state).toContain("decayed to neutral");
  });

  it("persistRelayDecayIfExpired is a no-op when hold is still active", async () => {
    const db = new RelayDecayDb();
    db.objects.set(BRIDGE_OBJECT, bridgeRow());

    const decayed = await persistRelayDecayIfExpired(db as unknown as D1Database, {
      objectId: BRIDGE_OBJECT,
      parentProfileId: PROFILE,
      now: new Date("2026-06-08T11:00:00.000Z"),
    });

    expect(decayed).toBe(false);
  });

  it("runRelayTerritoryDecayCron decays expired relay_gate nodes on season root", async () => {
    const db = new RelayDecayDb();
    db.objects.set(BRIDGE_OBJECT, bridgeRow());

    const season = {
      ...CR_SEASON_01,
      season_root_profile_id: PROFILE,
    };

    const { decayed } = await runRelayTerritoryDecayCron(
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      new Date("2026-06-08T13:00:00.000Z"),
      season
    );

    expect(decayed).toContain("node_05");
  });

  it("runRelayTerritoryDecayCron skips when city game disabled", async () => {
    const db = new RelayDecayDb();
    db.objects.set(BRIDGE_OBJECT, bridgeRow());

    const { decayed } = await runRelayTerritoryDecayCron(
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "0" },
      new Date("2026-06-08T13:00:00.000Z"),
      { ...CR_SEASON_01, season_root_profile_id: PROFILE }
    );

    expect(decayed).toEqual([]);
  });
});
