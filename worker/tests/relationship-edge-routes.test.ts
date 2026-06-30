import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import {
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
  type RelationshipEdgeDocument,
} from "../src/live-object/relationship-edge-spec";
import {
  handleGetRelationshipEdges,
  handlePostRelationshipEdgeIssue,
  handlePostRelationshipEdgeRevoke,
} from "../src/resolver/relationship-edge-routes";
import type { RelationshipEdgeRow } from "../src/db/types";
import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const STEWARD = CITY_GAME_SEASON_ROOT_PROFILE;
const FROM_OBJECT = "obj_cr_node_10_library";
const TO_OBJECT = "obj_cr_node_07_cabinet";
const RIVER_OBJECT = "obj_cr_node_04_river";
const EDGE_ID = "edge_cr_witness_10_07";
const UNLOCK_EDGE_ID = "edge_cr_unlock_04_07";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

class RelationshipEdgeRouteDb {
  schemaReady = true;
  steward = {
    public_key: "",
    recovery_public_key: null as string | null,
    issuer_public_key: null as string | null,
    status: "active",
  };
  children = new Map<
    string,
    {
      object_id: string;
      parent_profile_id: string;
      object_type: string;
      status: string;
    }
  >();
  edges = new Map<string, RelationshipEdgeRow>();

  seedGameNodes() {
    for (const objectId of [FROM_OBJECT, TO_OBJECT, RIVER_OBJECT]) {
      this.children.set(objectId, {
        object_id: objectId,
        parent_profile_id: STEWARD,
        object_type: "game_node",
        status: "active",
      });
    }
  }

  prepare(sql: string) {
    const db = this;
    const stmt = {
      bind(...args: unknown[]) {
        return {
          first: () => stmt.first(args),
          all: () => stmt.all(args),
          run: () => stmt.run(args),
        };
      },
      async first<T>(args: unknown[] = []) {
        if (sql.includes("sqlite_master")) {
          return (db.schemaReady ? { 1: 1 } : null) as T | null;
        }
        if (sql.includes("FROM cards WHERE profile_id = ?")) {
          return {
            public_key: db.steward.public_key,
            recovery_public_key: db.steward.recovery_public_key,
            issuer_public_key: db.steward.issuer_public_key,
            status: db.steward.status,
          } as T;
        }
        if (sql.includes("FROM child_objects WHERE object_id = ?")) {
          return (db.children.get(String(args[0])) ?? null) as T | null;
        }
        if (sql.includes("FROM relationship_edges WHERE edge_id = ?")) {
          return (db.edges.get(String(args[0])) ?? null) as T | null;
        }
        return null as T | null;
      },
      async all<T>(args: unknown[] = []) {
        if (sql.includes("WHERE steward_profile_id = ?")) {
          const rows = Array.from(db.edges.values()).filter(
            (row) => row.steward_profile_id === String(args[0])
          );
          return { results: rows as T[] };
        }
        if (
          sql.includes("to_object_id = ?") &&
          sql.includes("status = 'active'")
        ) {
          const rows = Array.from(db.edges.values()).filter(
            (row) =>
              row.to_object_id === String(args[0]) &&
              row.network_id === String(args[1]) &&
              row.status === "active"
          );
          return { results: rows as T[] };
        }
        return { results: [] as T[] };
      },
      async run(args: unknown[] = []) {
        if (sql.startsWith("INSERT INTO relationship_edges")) {
          const row: RelationshipEdgeRow = {
            edge_id: String(args[0]),
            network_id: String(args[1]),
            kind: String(args[2]) as RelationshipEdgeRow["kind"],
            from_object_id: String(args[3]),
            to_object_id: String(args[4]),
            steward_profile_id: String(args[5]),
            status: args[6] as RelationshipEdgeRow["status"],
            edge_document_json: String(args[7]),
            created_at: String(args[8]),
            updated_at: String(args[9]),
          };
          db.edges.set(row.edge_id, row);
          return { success: true, meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE relationship_edges")) {
          const edgeId = String(args[2]);
          const row = db.edges.get(edgeId);
          if (!row) return { success: true, meta: { changes: 0 } };
          row.status = "revoked";
          row.edge_document_json = String(args[0]);
          row.updated_at = String(args[1]);
          db.edges.set(edgeId, row);
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      },
    };
    return stmt;
  }
}

async function signedEdge(
  signer: "owner" | "operator",
  overrides: Partial<Omit<RelationshipEdgeDocument, "signature">> = {}
): Promise<{ doc: RelationshipEdgeDocument; json: string }> {
  const owner = await getTestKeypair();
  const operator = await getTestKeypair();
  const unsigned = crWitnessEdgeDocumentUnsigned(STEWARD, overrides);
  const keys = signer === "operator" ? operator : owner;
  const signed = (await signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    keys
  )) as RelationshipEdgeDocument;
  return { doc: signed, json: JSON.stringify(signed) };
}

describe("relationship-edge-routes", () => {
  it("issues signed witness edge via game operator", async () => {
    const db = new RelationshipEdgeRouteDb();
    const owner = await getTestKeypair();
    const operator = await getTestKeypair();
    db.steward = {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: operator.publicKeyBase58,
      status: "active",
    };
    db.seedGameNodes();

    const { json } = await signedEdge("operator");
    const res = await handlePostRelationshipEdgeIssue(
      new Request("https://humanity.llc/v1/cards/x/relationship-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_edge: JSON.parse(json) }),
      }),
      db as unknown as D1Database,
      STEWARD
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { edge_id: string; kind: string };
    expect(body.edge_id).toBe(EDGE_ID);
    expect(body.kind).toBe("witnesses");
  });

  it("lists steward relationship edges", async () => {
    const db = new RelationshipEdgeRouteDb();
    const owner = await getTestKeypair();
    const operator = await getTestKeypair();
    db.steward = {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: operator.publicKeyBase58,
      status: "active",
    };
    db.seedGameNodes();
    const { doc, json } = await signedEdge("operator");
    await handlePostRelationshipEdgeIssue(
      new Request("https://humanity.llc/v1/cards/x/relationship-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_edge: JSON.parse(json) }),
      }),
      db as unknown as D1Database,
      STEWARD
    );

    const res = await handleGetRelationshipEdges(
      db as unknown as D1Database,
      STEWARD
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      relationship_edges: Array<{ edge_id: string; witness: { from_node_id: string } }>;
    };
    expect(body.relationship_edges).toHaveLength(1);
    expect(body.relationship_edges[0]?.edge_id).toBe(doc.edge_id);
    expect(body.relationship_edges[0]?.witness?.from_node_id).toBe("node_10");
  });

  it("revokes active witness edge", async () => {
    const db = new RelationshipEdgeRouteDb();
    const owner = await getTestKeypair();
    const operator = await getTestKeypair();
    db.steward = {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: operator.publicKeyBase58,
      status: "active",
    };
    db.seedGameNodes();
    const { json } = await signedEdge("operator");
    await handlePostRelationshipEdgeIssue(
      new Request("https://humanity.llc/v1/cards/x/relationship-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_edge: JSON.parse(json) }),
      }),
      db as unknown as D1Database,
      STEWARD
    );

    const revoked = await signedEdge("operator", { status: "revoked" });
    const res = await handlePostRelationshipEdgeRevoke(
      new Request(
        `https://humanity.llc/v1/cards/x/relationship-edges/${EDGE_ID}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationship_edge: JSON.parse(revoked.json) }),
        }
      ),
      db as unknown as D1Database,
      STEWARD,
      EDGE_ID
    );
    expect(res.status).toBe(200);
    expect(db.edges.get(EDGE_ID)?.status).toBe("revoked");
  });

  it("accepts unlock kind edge", async () => {
    const db = new RelationshipEdgeRouteDb();
    const owner = await getTestKeypair();
    db.steward = {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: null,
      status: "active",
    };
    db.seedGameNodes();

    const unsigned = crUnlockEdgeDocumentUnsigned(STEWARD);
    const signed = (await signDocument(
      withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
      owner
    )) as RelationshipEdgeDocument;

    const res = await handlePostRelationshipEdgeIssue(
      new Request("https://humanity.llc/v1/cards/x/relationship-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_edge: signed }),
      }),
      db as unknown as D1Database,
      STEWARD
    );
    expect(res.status).toBe(201);
    expect(db.edges.get(UNLOCK_EDGE_ID)?.kind).toBe("unlocks");
  });

  it("rejects malformed unlock edge missing unlock block", async () => {
    const db = new RelationshipEdgeRouteDb();
    const owner = await getTestKeypair();
    db.steward = {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: null,
      status: "active",
    };
    db.seedGameNodes();

    const unsigned = {
      ...crWitnessEdgeDocumentUnsigned(STEWARD),
      kind: "unlocks",
      edge_id: "edge_bad_unlock_shape",
    };
    const signed = (await signDocument(
      withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
      owner
    )) as RelationshipEdgeDocument;

    const res = await handlePostRelationshipEdgeIssue(
      new Request("https://humanity.llc/v1/cards/x/relationship-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_edge: signed }),
      }),
      db as unknown as D1Database,
      STEWARD
    );
    expect(res.status).toBe(422);
  });

  it("rejects stranger signer", async () => {
    const db = new RelationshipEdgeRouteDb();
    const owner = await getTestKeypair();
    const stranger = await randomKeypair();
    db.steward = {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: null,
      status: "active",
    };
    db.seedGameNodes();

    const unsigned = crWitnessEdgeDocumentUnsigned(STEWARD);
    const signed = (await signDocument(
      withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
      stranger
    )) as RelationshipEdgeDocument;

    const res = await handlePostRelationshipEdgeIssue(
      new Request("https://humanity.llc/v1/cards/x/relationship-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_edge: signed }),
      }),
      db as unknown as D1Database,
      STEWARD
    );
    expect(res.status).toBe(401);
  });

  it("returns 503 when migration is missing", async () => {
    const db = new RelationshipEdgeRouteDb();
    db.schemaReady = false;
    const res = await handleGetRelationshipEdges(
      db as unknown as D1Database,
      STEWARD
    );
    expect(res.status).toBe(503);
  });
});
