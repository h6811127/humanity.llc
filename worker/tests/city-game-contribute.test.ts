import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handlePostGameContribute } from "../src/resolver/game-contribute";
import * as seasonWindow from "../src/city-game/season-window";
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
        child_object_document_json: riverDocument(19),
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

describe("game-contribute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00-05:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns 404 when CITY_GAME_ENABLED is off", async () => {
    const db = new ContributeDb();
    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: QR, site_code: "CR-LANTERN-7K" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "0" },
      PROFILE,
      RIVER_OBJECT
    );
    expect(res.status).toBe(404);
  });

  it("rejects invalid site code", async () => {
    const db = new ContributeDb();
    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.1" },
        body: JSON.stringify({ qr_id: QR, site_code: "WRONG-CODE" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      RIVER_OBJECT
    );
    expect(res.status).toBe(403);
  });

  it("increments quorum and unlocks cabinet at target", async () => {
    const db = new ContributeDb();
    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.2" },
        body: JSON.stringify({ qr_id: QR, site_code: "cr-lantern-7k" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      RIVER_OBJECT
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      collective_progress: number;
      quorum_complete: boolean;
      unlocked_nodes: string[];
    };
    expect(body.collective_progress).toBe(20);
    expect(body.quorum_complete).toBe(true);
    expect(body.unlocked_nodes).toContain("node_07");

    const river = db.objects.get(RIVER_OBJECT)!;
    const riverDoc = JSON.parse(river.child_object_document_json);
    expect(riverDoc.game_meta.collective_progress).toBe(20);

    const cabinet = db.objects.get(CABINET_OBJECT)!;
    const cabinetDoc = JSON.parse(cabinet.child_object_document_json);
    expect(cabinetDoc.game_meta.unlocked_by).toContain("node_04");
    expect(cabinet.public_state).toContain("Unlocked together");
  });

  it("registers fragment on finale and opens when lattice completes", async () => {
    const MURAL_OBJECT = "obj_cr_node_09_mural";
    const MARKER_OBJECT = "obj_cr_node_11_marker";
    const RELAY_OBJECT = "obj_cr_node_01_newbo";
    const FINALE_OBJECT = "obj_cr_node_13_finale";
    const MURAL_QR = "qr_cr_node_09_mural01";
    const MARKER_QR = "qr_cr_node_11_marker01";
    const RELAY_QR = "qr_cr_node_01_newbo01";

    function fragmentDocument(objectId: string, nodeRole: string, label: string, nodeId: string) {
      return JSON.stringify({
        object_id: objectId,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: label,
        public_state: "Fragment live",
        status: "active",
        season_id: "cr_season_01_wake",
        node_role: nodeRole,
        district: "czech_village",
        object_streams: [{ id: "relay", class: "route", label: "Fragment", value: "Live" }],
        game_meta: {
          visible_until: null,
          compromised: false,
          collective_progress: null,
          collective_target: null,
          unlocked_by: [],
          vouch_requires: [],
          scarcity_remaining: null,
          fragment_id: nodeId,
        },
        created_at: CREATED,
        updated_at: CREATED,
      });
    }

    const db = new ContributeDb();
    db.qr = {
      ...db.qr,
      qr_id: MURAL_QR,
      object_id: MURAL_OBJECT,
    };
    db.objects.set(MURAL_OBJECT, {
      object_id: MURAL_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Czech Village mural",
      public_state: "Fragment live",
      status: "active",
      child_object_document_json: fragmentDocument(
        MURAL_OBJECT,
        "lore_archive",
        "Czech Village mural",
        "node_09"
      ),
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(MARKER_OBJECT, {
      object_id: MARKER_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Greene Square marker",
      public_state: "Fragment live",
      status: "active",
      child_object_document_json: fragmentDocument(
        MARKER_OBJECT,
        "route_splitter",
        "Greene Square marker",
        "node_11"
      ),
      created_at: CREATED,
      updated_at: CREATED,
    });
    db.objects.set(RELAY_OBJECT, {
      object_id: RELAY_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "NewBo relay arch",
      public_state: "Fragment live",
      status: "active",
      child_object_document_json: fragmentDocument(
        RELAY_OBJECT,
        "relay_gate",
        "NewBo relay arch",
        "node_01"
      ),
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
        object_id: FINALE_OBJECT,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "Downtown alley arch",
        public_state: "Finale switch dormant",
        status: "active",
        season_id: "cr_season_01_wake",
        node_role: "finale",
        district: "downtown",
        object_streams: [{ id: "bulletin", class: "narrative", label: "Need", value: "0 / 3 fragments" }],
        game_meta: { unlocked_by: [] },
        created_at: CREATED,
        updated_at: CREATED,
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    async function contributeFragment(qrId: string, objectId: string, code: string, ip: string) {
      db.qr = { ...db.qr, qr_id: qrId, object_id: objectId };
      return handlePostGameContribute(
        new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
          method: "POST",
          headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
          body: JSON.stringify({ qr_id: qrId, site_code: code }),
        }),
        db as unknown as D1Database,
        { CITY_GAME_ENABLED: "1" },
        PROFILE,
        objectId
      );
    }

    let res = await contributeFragment(MURAL_QR, MURAL_OBJECT, "CR-MURAL-2F", "203.0.113.10");
    expect(res.status).toBe(200);
    let body = (await res.json()) as {
      fragment_claimed: boolean;
      fragments_registered: number;
      finale_open: boolean;
    };
    expect(body.fragment_claimed).toBe(true);
    expect(body.fragments_registered).toBe(1);
    expect(body.finale_open).toBe(false);

    res = await contributeFragment(MARKER_QR, MARKER_OBJECT, "CR-MARK-9P", "203.0.113.11");
    body = (await res.json()) as typeof body;
    expect(body.fragments_registered).toBe(2);
    expect(body.finale_open).toBe(false);

    res = await contributeFragment(RELAY_QR, RELAY_OBJECT, "CR-RELAY-1N", "203.0.113.12");
    body = (await res.json()) as typeof body & { unlocked_nodes: string[] };
    expect(body.fragments_registered).toBe(3);
    expect(body.finale_open).toBe(true);
    expect(body.unlocked_nodes).toContain("node_13");

    const finale = db.objects.get(FINALE_OBJECT)!;
    expect(finale.public_state).toContain("Finale switch live");
    const finaleDoc = JSON.parse(finale.child_object_document_json);
    expect(finaleDoc.game_meta.unlocked_by).toEqual(
      expect.arrayContaining(["node_09", "node_11", "node_01"])
    );

    res = await contributeFragment(MURAL_QR, MURAL_OBJECT, "CR-MURAL-2F", "203.0.113.13");
    expect(res.status).toBe(200);
    body = (await res.json()) as typeof body & { message?: string };
    expect(body.fragment_claimed).toBe(true);
    expect(body.fragments_registered).toBe(3);
    expect(body.finale_open).toBe(true);
    expect(body.message).toContain("already registered");
  });

  it("issues sunset pass, decrements scarcity, and activates cabinet vouch", async () => {
    const WITNESS_OBJECT = "obj_cr_node_10_library";
    const WITNESS_QR = "qr_cr_node_10_library01";

    const db = new ContributeDb();
    db.qr = {
      ...db.qr,
      qr_id: WITNESS_QR,
      object_id: WITNESS_OBJECT,
    };
    db.objects.set(WITNESS_OBJECT, {
      object_id: WITNESS_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "Library witness seal",
      public_state: "Witness seal open",
      status: "active",
      child_object_document_json: JSON.stringify({
        object_id: WITNESS_OBJECT,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "Library witness seal",
        public_state: "Witness seal open",
        status: "active",
        season_id: "cr_season_01_wake",
        node_role: "witness",
        district: "downtown",
        object_streams: [
          { id: "relay", class: "route", label: "Passes", value: "2 sunset passes remain" },
          { id: "bulletin", class: "narrative", label: "Vouch", value: "Issues trust for cabinet path" },
        ],
        game_meta: {
          visible_until: null,
          compromised: false,
          collective_progress: null,
          collective_target: null,
          unlocked_by: [],
          vouch_requires: [],
          vouch_active_for: [],
          scarcity_remaining: 2,
          fragment_id: null,
        },
        created_at: CREATED,
        updated_at: CREATED,
      }),
      created_at: CREATED,
      updated_at: CREATED,
    });

    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.20" },
        body: JSON.stringify({ qr_id: WITNESS_QR, site_code: "CR-WITNS-4P" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      WITNESS_OBJECT
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contribute_mode: string;
      scarcity_remaining: number;
      witness_depleted: boolean;
      vouch_targets: string[];
    };
    expect(body.contribute_mode).toBe("scarcity");
    expect(body.scarcity_remaining).toBe(1);
    expect(body.witness_depleted).toBe(false);
    expect(body.vouch_targets).toContain("node_07");

    const witness = db.objects.get(WITNESS_OBJECT)!;
    const witnessDoc = JSON.parse(witness.child_object_document_json);
    expect(witnessDoc.game_meta.scarcity_remaining).toBe(1);
    expect(witnessDoc.game_meta.vouch_active_for).toContain("node_07");

    const finalRes = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.21" },
        body: JSON.stringify({ qr_id: WITNESS_QR, site_code: "cr-witns-4p" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      WITNESS_OBJECT
    );
    const finalBody = (await finalRes.json()) as {
      scarcity_remaining: number;
      witness_depleted: boolean;
    };
    expect(finalBody.scarcity_remaining).toBe(0);
    expect(finalBody.witness_depleted).toBe(true);
    expect(witness.public_state).toContain("closed for the night");
  });

  it("rejects contribute when season window is closed", async () => {
    vi.spyOn(seasonWindow, "resolveSeasonWindowPhase").mockReturnValue("before");
    const db = new ContributeDb();
    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.30" },
        body: JSON.stringify({ qr_id: QR, site_code: "CR-LANTERN-7K" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      RIVER_OBJECT
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("SEASON_CLOSED");
    vi.restoreAllMocks();
  });

  it("allows contribute before window when CITY_GAME_LOCAL_PLAY_OPEN=1", async () => {
    vi.spyOn(seasonWindow, "resolveSeasonWindowPhase").mockReturnValue("before");
    const db = new ContributeDb();
    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.31" },
        body: JSON.stringify({ qr_id: QR, site_code: "CR-LANTERN-7K" }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1", CITY_GAME_LOCAL_PLAY_OPEN: "1" },
      PROFILE,
      RIVER_OBJECT
    );
    expect(res.status).toBe(200);
    vi.restoreAllMocks();
  });

  it("captures a relay for a faction (SW-03)", async () => {
    const BRIDGE_OBJECT = "obj_cr_node_05_bridge";
    const BRIDGE_QR = "qr_cr_node_05_bridge01";
    const bridgeJson = JSON.stringify({
      object_id: BRIDGE_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "16th Avenue bridge",
      public_state: "Neutral relay edge",
      status: "active",
      season_id: "cr_season_01_wake",
      node_role: "relay_gate",
      district: "river_spine",
      object_streams: [
        { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
        { id: "relay", class: "route", label: "Relay status", value: "Open" },
        { id: "care", class: "care", label: "Site", value: "Clear" },
      ],
      game_meta: {
        visible_until: null,
        compromised: false,
        collective_progress: null,
        collective_target: null,
        unlocked_by: [],
        vouch_requires: [],
        scarcity_remaining: null,
        fragment_id: null,
        held_by_faction: null,
        held_until: null,
      },
      created_at: CREATED,
      updated_at: CREATED,
    });

    const db = new ContributeDb();
    db.qr = {
      ...db.qr,
      qr_id: BRIDGE_QR,
      object_id: BRIDGE_OBJECT,
      payload: `https://humanity.llc/c/${PROFILE}?q=${BRIDGE_QR}`,
    };
    db.objects.set(BRIDGE_OBJECT, {
      object_id: BRIDGE_OBJECT,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "16th Avenue bridge",
      public_state: "Neutral relay edge",
      status: "active",
      child_object_document_json: bridgeJson,
      created_at: CREATED,
      updated_at: CREATED,
    });

    const res = await handlePostGameContribute(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.40" },
        body: JSON.stringify({
          qr_id: BRIDGE_QR,
          site_code: "CR-BRIDGE-5B",
          faction: "red",
          action: "capture",
        }),
      }),
      db as unknown as D1Database,
      {
        CITY_GAME_ENABLED: "1",
        CITY_GAME_RELAY_CAPTURE_PLAYER: "1",
      },
      PROFILE,
      BRIDGE_OBJECT
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contribute_mode: string;
      held_by_faction: string;
      held_until: string;
    };
    expect(body.contribute_mode).toBe("capture");
    expect(body.held_by_faction).toBe("red");
    expect(body.held_until).toBeTruthy();

    const bridge = db.objects.get(BRIDGE_OBJECT)!;
    const bridgeDoc = JSON.parse(bridge.child_object_document_json);
    expect(bridgeDoc.game_meta.held_by_faction).toBe("red");
    expect(bridge.public_state).toContain("Red team");
  });
});
