import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { normalizeGameMeta, validateGameNodeDocument } from "../src/city-game/game-meta";
import { handlePostChildObjectCreate } from "../src/resolver/child-objects";
import { handlePostGameUpdate } from "../src/resolver/game-update";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_cr_node_01_newbo";
const CREATED = "2026-06-01T12:00:00.000Z";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function gameNodeDoc(input: {
  updatedAt?: string;
  publicState?: string;
}) {
  return withProtocolFields(
    {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "NewBo relay arch",
    public_state: input.publicState ?? "Red team holds the relay",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "relay_gate",
    district: "newbo",
    object_streams: [
      { id: "territory", class: "place", label: "Controller", value: "Red team" },
      { id: "relay", class: "route", label: "Relay status", value: "Open · 18 min" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Shift west" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: 20,
      unlocked_by: [],
      vouch_requires: [],
      scarcity_remaining: null,
      fragment_id: null,
    },
    created_at: CREATED,
    updated_at: input.updatedAt ?? "2026-06-01T12:05:00.000Z",
    },
    PAYLOAD_TYPES.CHILD_OBJECT
  );
}

class GameNodeDb {
  parent = {
    public_key: "",
    recovery_public_key: null as string | null,
    issuer_public_key: null as string | null,
    status: "active",
  };
  object: {
    object_id: string;
    parent_profile_id: string;
    object_type: string;
    public_label: string;
    public_state: string;
    status: string;
    child_object_document_json: string;
    created_at: string;
    updated_at: string;
  } | null = null;

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards")) return db.parent as T;
            if (sql.includes("FROM child_objects WHERE object_id")) {
              return (db.object as T) ?? null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.startsWith("INSERT INTO child_objects")) {
              db.object = {
                object_id: String(args[0]),
                parent_profile_id: String(args[1]),
                object_type: String(args[2]),
                public_label: String(args[3]),
                public_state: String(args[4]),
                status: String(args[5]),
                child_object_document_json: String(args[6]),
                created_at: String(args[7]),
                updated_at: String(args[8]),
              };
            }
            if (sql.startsWith("UPDATE child_objects")) {
              if (!db.object) throw new Error("missing object");
              db.object.object_type = String(args[0]);
              db.object.public_label = String(args[1]);
              db.object.public_state = String(args[2]);
              db.object.status = String(args[3]);
              db.object.child_object_document_json = String(args[4]);
              db.object.updated_at = String(args[5]);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

describe("city game game_meta", () => {
  it("normalizes defaults", () => {
    expect(normalizeGameMeta(undefined)).toEqual({
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: null,
      unlocked_by: [],
      vouch_requires: [],
      scarcity_remaining: null,
      fragment_id: null,
    });
  });

  it("validates a game_node document", () => {
    const out = validateGameNodeDocument({
      object_type: "game_node",
      season_id: "cr_season_01_wake",
      node_role: "relay_gate",
      district: "newbo",
      object_streams: [
        { id: "care", class: "care", label: "Site", value: "Clear" },
      ],
      game_meta: { compromised: true },
    });
    expect(out.seasonId).toBe("cr_season_01_wake");
    expect(out.gameMeta.compromised).toBe(true);
  });
});

describe("city game game-update", () => {
  it("returns 404 when CITY_GAME_ENABLED is off", async () => {
    const keys = await getTestKeypair();
    const db = new GameNodeDb();
    db.parent.public_key = keys.publicKeyBase58;
    db.object = {
      object_id: OBJECT_ID,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "NewBo relay arch",
      public_state: "Before",
      status: "active",
      child_object_document_json: "{}",
      created_at: CREATED,
      updated_at: CREATED,
    };

    const doc = gameNodeDoc({
      updatedAt: "2026-06-01T12:10:00.000Z",
    });
    const signed = await signDocument(doc, keys);
    const res = await handlePostGameUpdate(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: signed }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "0" },
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(404);
  });

  it("accepts game-operator signed update for game_node", async () => {
    const owner = await getTestKeypair();
    const operator = await randomKeypair();
    const db = new GameNodeDb();
    db.parent.public_key = owner.publicKeyBase58;
    db.parent.issuer_public_key = operator.publicKeyBase58;
    db.object = {
      object_id: OBJECT_ID,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      public_label: "NewBo relay arch",
      public_state: "Before",
      status: "active",
      child_object_document_json: "{}",
      created_at: CREATED,
      updated_at: CREATED,
    };

    const doc = gameNodeDoc({
      updatedAt: "2026-06-01T12:10:00.000Z",
      publicState: "Compromised relay · rekey pending",
    });
    const signed = await signDocument(doc, operator);
    const res = await handlePostGameUpdate(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: signed }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { signer_role?: string; public_state?: string };
    expect(body.signer_role).toBe("game_operator");
    expect(body.public_state).toContain("Compromised");
  });

  it("rejects game-operator update on status_plate object", async () => {
    const owner = await getTestKeypair();
    const operator = await randomKeypair();
    const db = new GameNodeDb();
    db.parent.public_key = owner.publicKeyBase58;
    db.parent.issuer_public_key = operator.publicKeyBase58;
    db.object = {
      object_id: OBJECT_ID,
      parent_profile_id: PROFILE,
      object_type: "status_plate",
      public_label: "Door",
      public_state: "Open",
      status: "active",
      child_object_document_json: "{}",
      created_at: CREATED,
      updated_at: CREATED,
    };

    const doc = gameNodeDoc({
      updatedAt: "2026-06-01T12:10:00.000Z",
    });
    const signed = await signDocument(doc, operator);
    const res = await handlePostGameUpdate(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects/y/game-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: signed }),
      }),
      db as unknown as D1Database,
      { CITY_GAME_ENABLED: "1" },
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(422);
  });
});

describe("city game game_node create", () => {
  it("requires season_id and node_role on create", async () => {
    const keys = await getTestKeypair();
    const db = new GameNodeDb();
    db.parent.public_key = keys.publicKeyBase58;

    const doc = withProtocolFields(
      {
        object_id: OBJECT_ID,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "Missing meta",
        public_state: "Test",
        status: "active",
        created_at: CREATED,
        updated_at: CREATED,
      },
      PAYLOAD_TYPES.CHILD_OBJECT
    );
    const signed = await signDocument(doc, keys);
    const res = await handlePostChildObjectCreate(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/x/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: signed }),
      }),
      db as unknown as D1Database,
      PROFILE
    );
    expect(res.status).toBe(422);
  });
});
