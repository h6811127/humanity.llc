import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  PAYLOAD_TYPES,
  encodeBase58,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import {
  crWitnessEdgeDocumentUnsigned,
  type RelationshipEdgeDocument,
} from "../src/live-object/relationship-edge-spec";
import {
  insertRelationshipEdge,
  listActiveWitnessEdgesForTarget,
  relationshipEdgeWriteFromDocument,
  verifyStoredRelationshipEdge,
} from "../src/db/relationship-edges";
import type { RelationshipEdgeRow } from "../src/db/types";
import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const STEWARD = CITY_GAME_SEASON_ROOT_PROFILE;

type StewardRow = {
  public_key: string;
  recovery_public_key: string | null;
  issuer_public_key: string | null;
  status: string;
};

class RelationshipEdgeDb {
  edges = new Map<string, RelationshipEdgeRow>();
  stewards = new Map<string, StewardRow>();

  seedSteward(profileId: string, row: StewardRow) {
    this.stewards.set(profileId, row);
  }

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("sqlite_master")) {
              return { 1: 1 } as T;
            }
            if (sql.includes("FROM cards WHERE profile_id = ?")) {
              return (db.stewards.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("FROM relationship_edges WHERE edge_id = ?")) {
              return (db.edges.get(String(args[0])) ?? null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            if (
              sql.includes("to_object_id = ?") &&
              sql.includes("status = 'active'")
            ) {
              const toObjectId = String(args[0]);
              const networkId = String(args[1]);
              const rows = Array.from(db.edges.values()).filter(
                (row) =>
                  row.to_object_id === toObjectId &&
                  row.network_id === networkId &&
                  row.status === "active"
              );
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO relationship_edges")) {
              const row: RelationshipEdgeRow = {
                edge_id: String(args[0]),
                network_id: String(args[1]),
                kind: "witnesses",
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
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

async function signedCrEdge(
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

describe("relationship-edges store", () => {
  it("loads and verifies signed active witness edge", async () => {
    const db = new RelationshipEdgeDb();
    const owner = await getTestKeypair();
    const operator = await getTestKeypair();
    db.seedSteward(STEWARD, {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: operator.publicKeyBase58,
      status: "active",
    });

    const { doc, json } = await signedCrEdge("operator");
    const write = relationshipEdgeWriteFromDocument(doc, json);
    const insert = await insertRelationshipEdge(db as unknown as D1Database, write);
    expect(insert).toEqual({ ok: true });

    const rows = await listActiveWitnessEdgesForTarget(
      db as unknown as D1Database,
      { toObjectId: doc.to.id, networkId: doc.network_id }
    );
    expect(rows).toHaveLength(1);

    const verified = await verifyStoredRelationshipEdge(
      db as unknown as D1Database,
      rows[0]
    );
    expect(verified?.edge_id).toBe("edge_cr_witness_10_07");
  });

  it("ignores unsigned edge", async () => {
    const db = new RelationshipEdgeDb();
    db.seedSteward(STEWARD, {
      public_key: "owner-pk",
      recovery_public_key: null,
      issuer_public_key: "operator-pk",
      status: "active",
    });
    const unsigned = crWitnessEdgeDocumentUnsigned(STEWARD);
    const row: RelationshipEdgeRow = {
      edge_id: unsigned.edge_id,
      network_id: unsigned.network_id,
      kind: "witnesses",
      from_object_id: unsigned.from.id,
      to_object_id: unsigned.to.id,
      steward_profile_id: STEWARD,
      status: "active",
      edge_document_json: JSON.stringify(unsigned),
      created_at: unsigned.created_at,
      updated_at: unsigned.created_at,
    };
    const verified = await verifyStoredRelationshipEdge(
      db as unknown as D1Database,
      row
    );
    expect(verified).toBeNull();
  });

  it("ignores edge signed by non-steward key", async () => {
    const db = new RelationshipEdgeDb();
    const owner = await getTestKeypair();
    const operator = await getTestKeypair();
    const stranger = await randomKeypair();
    db.seedSteward(STEWARD, {
      public_key: owner.publicKeyBase58,
      recovery_public_key: null,
      issuer_public_key: operator.publicKeyBase58,
      status: "active",
    });

    const unsigned = crWitnessEdgeDocumentUnsigned(STEWARD);
    const signed = (await signDocument(
      withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
      stranger
    )) as RelationshipEdgeDocument;
    const json = JSON.stringify(signed);
    const row: RelationshipEdgeRow = {
      edge_id: signed.edge_id,
      network_id: signed.network_id,
      kind: "witnesses",
      from_object_id: signed.from.id,
      to_object_id: signed.to.id,
      steward_profile_id: STEWARD,
      status: "active",
      edge_document_json: json,
      created_at: signed.created_at,
      updated_at: signed.created_at,
    };
    const verified = await verifyStoredRelationshipEdge(
      db as unknown as D1Database,
      row
    );
    expect(verified).toBeNull();
  });

  it("ignores revoked edge row from active listing", async () => {
    const db = new RelationshipEdgeDb();
    const rows = await listActiveWitnessEdgesForTarget(
      db as unknown as D1Database,
      {
        toObjectId: "obj_cr_node_07_cabinet",
        networkId: "cr_season_01_wake",
      }
    );
    db.edges.set("edge_cr_witness_10_07", {
      edge_id: "edge_cr_witness_10_07",
      network_id: "cr_season_01_wake",
      kind: "witnesses",
      from_object_id: "obj_cr_node_10_library",
      to_object_id: "obj_cr_node_07_cabinet",
      steward_profile_id: STEWARD,
      status: "revoked",
      edge_document_json: "{}",
      created_at: "2026-06-22T00:00:00.000Z",
      updated_at: "2026-06-22T00:00:00.000Z",
    });
    const activeRows = await listActiveWitnessEdgesForTarget(
      db as unknown as D1Database,
      {
        toObjectId: "obj_cr_node_07_cabinet",
        networkId: "cr_season_01_wake",
      }
    );
    expect(rows).toHaveLength(0);
    expect(activeRows).toHaveLength(0);
  });
});
