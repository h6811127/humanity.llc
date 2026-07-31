import { afterEach, describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { ChildObjectStatus } from "../src/db/types";
import {
  handleGetChildObjects,
  handlePostChildObjectCreate,
  handlePostChildObjectRevoke,
  handlePostChildObjectUpdate,
} from "../src/resolver/child-objects";
import {
  registerSeasonConfig,
  resetSeasonRegistryForTests,
} from "../src/city-game/season-loader";
import type { CrSeasonConfig } from "../src/city-game/season-config";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_status_plate_001";
const CREATED = "2026-05-16T17:00:00.000Z";

afterEach(() => {
  resetSeasonRegistryForTests();
});

function testSeasonConfig(seasonId: string): CrSeasonConfig {
  return {
    season_id: seasonId,
    season_root_profile_id: PROFILE,
    districts: ["river_spine"],
    nodes: [],
    unlock_edges: [],
  };
}

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

type StoredObject = {
  object_id: string;
  parent_profile_id: string;
  object_type: string;
  public_label: string;
  public_state: string;
  status: ChildObjectStatus;
  child_object_document_json: string;
  created_at: string;
  updated_at: string;
};

class ChildObjectDb {
  parent = {
    public_key: "",
    recovery_public_key: null as string | null,
    status: "active",
  };
  objects = new Map<string, StoredObject>();
  activeQrs: Array<{ qr_id: string; object_id: string; profile_id: string }> = [];

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards")) return db.parent as T;
            if (sql.includes("FROM child_objects WHERE object_id")) {
              return (db.objects.get(String(args[0])) ?? null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("FROM child_objects") && sql.includes("parent_profile_id")) {
              const parentId = String(args[0]);
              const rows = Array.from(db.objects.values())
                .filter((row) => row.parent_profile_id === parentId)
                .sort(
                  (a, b) =>
                    a.created_at.localeCompare(b.created_at) ||
                    a.object_id.localeCompare(b.object_id)
                );
              return { results: rows as T[] };
            }
            if (sql.includes("FROM qr_credentials") && sql.includes("scope = 'child_object'")) {
              const profileId = String(args[0]);
              const rows = db.activeQrs.filter((row) => row.profile_id === profileId);
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO child_objects")) {
              const row: StoredObject = {
                object_id: String(args[0]),
                parent_profile_id: String(args[1]),
                object_type: String(args[2]),
                public_label: String(args[3]),
                public_state: String(args[4]),
                status: args[5] as ChildObjectStatus,
                child_object_document_json: String(args[6]),
                created_at: String(args[7]),
                updated_at: String(args[8]),
              };
              db.objects.set(row.object_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE child_objects")) {
              const objectId = String(args[6]);
              const existing = db.objects.get(objectId);
              if (!existing || existing.parent_profile_id !== String(args[7])) {
                return { success: true, meta: { changes: 0 } };
              }
              db.objects.set(objectId, {
                ...existing,
                object_type: String(args[0]),
                public_label: String(args[1]),
                public_state: String(args[2]),
                status: args[3] as ChildObjectStatus,
                child_object_document_json: String(args[4]),
                updated_at: String(args[5]),
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

function requestFor(path: string, object: Record<string, unknown>) {
  return new Request(`https://humanity.llc${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object }),
  });
}

async function signedChildObject(
  keypair: Awaited<ReturnType<typeof getTestKeypair>>,
  overrides: Partial<Record<string, unknown>> = {}
) {
  return signDocument(
    withProtocolFields(
      {
        object_id: OBJECT_ID,
        parent_profile_id: PROFILE,
        object_type: "status_plate",
        public_label: "Studio door",
        public_state: "Open",
        status: "active",
        created_at: CREATED,
        updated_at: CREATED,
        ...overrides,
      },
      PAYLOAD_TYPES.CHILD_OBJECT
    ),
    keypair
  );
}

describe("child object endpoints", () => {
  it("creates a parent-signed child object without a child key", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const object = await signedChildObject(keys);

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(201);
    expect(db.objects.get(OBJECT_ID)?.public_state).toBe("Open");
    const body = await res.json() as { object_id: string; status: string };
    expect(body).toMatchObject({ object_id: OBJECT_ID, status: "active" });
  });

  it("accepts optional time_policy on status_plate create", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const object = await signedChildObject(keys, {
      time_policy: {
        valid_until: "2026-12-31T22:00:00-05:00",
        timezone: "America/Chicago",
      },
    });

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(201);
    const stored = JSON.parse(
      db.objects.get(OBJECT_ID)?.child_object_document_json ?? "{}"
    ) as { time_policy?: { valid_until?: string } };
    expect(stored.time_policy?.valid_until).toBe("2026-12-31T22:00:00-05:00");
  });

  it("rejects malformed time_policy schedule slots", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const object = await signedChildObject(keys, {
      time_policy: {
        schedule: [{ local_hour_from: 9 }],
      },
    });

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(422);
  });

  it("accepts optional custody on lost_item_relay create", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const objectId = "obj_lost_item_relay1";
    const object = await signedChildObject(keys, {
      object_id: objectId,
      object_type: "lost_item_relay",
      public_label: "House keys",
      public_state: "Lost — contact through relay",
      custody: {
        holder_label: "Finder at front desk",
        note: "Turn in at lobby",
      },
    });

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(201);
    const stored = JSON.parse(
      db.objects.get(objectId)?.child_object_document_json ?? "{}"
    ) as { custody?: { holder_label?: string } };
    expect(stored.custody?.holder_label).toBe("Finder at front desk");
  });

  it("rejects game_node create when season_id does not match the parent profile season", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    registerSeasonConfig(testSeasonConfig("test_city_season_01"));
    const object = await signedChildObject(keys, {
      object_id: "obj_game_node_001",
      object_type: "game_node",
      public_label: "Wrong season relay",
      public_state: "Dormant",
      season_id: "other_city_season_01",
      node_role: "relay_gate",
      district: "river_spine",
    });

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(422);
    const body = await res.json() as { error?: string };
    expect(body.error).toBe("SEASON_MISMATCH");
    expect(db.objects.has("obj_game_node_001")).toBe(false);
  });

  it("creates a game_node when season_id matches the parent profile season", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    registerSeasonConfig(testSeasonConfig("test_city_season_01"));
    const object = await signedChildObject(keys, {
      object_id: "obj_game_node_001",
      object_type: "game_node",
      public_label: "River relay",
      public_state: "Dormant",
      season_id: "test_city_season_01",
      node_role: "relay_gate",
      district: "river_spine",
    });

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(201);
    expect(db.objects.get("obj_game_node_001")?.object_type).toBe("game_node");
  });

  it("allows recovery key to update an active child object", async () => {
    const owner = await getTestKeypair();
    const recovery = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = owner.publicKeyBase58;
    db.parent.recovery_public_key = recovery.publicKeyBase58;
    const created = await signedChildObject(owner);
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );

    const updated = await signedChildObject(recovery, {
      public_state: "Closed until Monday",
      updated_at: "2026-05-17T12:00:00.000Z",
    });
    const res = await handlePostChildObjectUpdate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/update`, updated),
      db as unknown as D1Database,
      PROFILE,
      OBJECT_ID
    );

    expect(res.status).toBe(200);
    expect(db.objects.get(OBJECT_ID)?.public_state).toBe("Closed until Monday");
  });

  it("disables a child object through the revoke endpoint", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const created = await signedChildObject(keys);
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );

    const disabled = await signedChildObject(keys, {
      status: "disabled",
      public_state: "Retired",
      updated_at: "2026-05-18T12:00:00.000Z",
    });
    const res = await handlePostChildObjectRevoke(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/revoke`, disabled),
      db as unknown as D1Database,
      PROFILE,
      OBJECT_ID
    );

    expect(res.status).toBe(200);
    expect(db.objects.get(OBJECT_ID)?.status).toBe("disabled");
  });

  it("rejects signatures that are not root owner or recovery key", async () => {
    const owner = await getTestKeypair();
    const attacker = await randomKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = owner.publicKeyBase58;
    const object = await signedChildObject(attacker);

    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(401);
  });

  it("lists child objects for a parent profile with active qr ids", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const created = await signedChildObject(keys);
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );
    db.activeQrs.push({
      qr_id: "qr_child_plate_01",
      object_id: OBJECT_ID,
      profile_id: PROFILE,
    });

    const res = await handleGetChildObjects(db as unknown as D1Database, PROFILE);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      profile_id: string;
      objects: Array<{ object_id: string; active_qr_id: string | null; public_state: string }>;
    };
    expect(body.profile_id).toBe(PROFILE);
    expect(body.objects).toHaveLength(1);
    expect(body.objects[0]).toMatchObject({
      object_id: OBJECT_ID,
      active_qr_id: "qr_child_plate_01",
      public_state: "Open",
    });
  });

  it("lists time_policy on Phase A child objects when present in signed document", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const object = await signedChildObject(keys, {
      time_policy: {
        valid_until: "2026-12-31T22:00:00-05:00",
        timezone: "America/Chicago",
        schedule: [],
      },
    });
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    const res = await handleGetChildObjects(db as unknown as D1Database, PROFILE);
    const body = (await res.json()) as {
      objects: Array<{ time_policy?: { valid_until?: string } }>;
    };
    expect(body.objects[0]?.time_policy?.valid_until).toBe("2026-12-31T22:00:00-05:00");
  });

  it("lists custody on Phase A child objects when present in signed document", async () => {
    const keys = await getTestKeypair();
    const db = new ChildObjectDb();
    db.parent.public_key = keys.publicKeyBase58;
    const object = await signedChildObject(keys, {
      custody: {
        holder_label: "Tool library desk",
        note: "Return at close",
      },
    });
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    const res = await handleGetChildObjects(db as unknown as D1Database, PROFILE);
    const body = (await res.json()) as {
      objects: Array<{ custody?: { holder_label?: string } }>;
    };
    expect(body.objects[0]?.custody?.holder_label).toBe("Tool library desk");
  });

  it("returns 404 when parent card is missing", async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              async first<T>() {
                if (sql.includes("FROM cards")) return null as T | null;
                return null as T | null;
              },
              async all<T>() {
                return { results: [] as T[] };
              },
            };
          },
        };
      },
    };
    const res = await handleGetChildObjects(db as unknown as D1Database, PROFILE);
    expect(res.status).toBe(404);
  });
});

