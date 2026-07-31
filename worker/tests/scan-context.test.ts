import { describe, expect, it } from "vitest";

import {
  PAYLOAD_TYPES,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { loadScanContext } from "../src/db/scan";
import type {
  CardRow,
  ChildObjectRow,
  QrCredentialRow,
  RelationshipEdgeRow,
} from "../src/db/types";
import {
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
  type RelationshipEdgeDocument,
} from "../src/live-object/relationship-edge-spec";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const OBJECT_ID = "obj_status_plate_scan1";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";
const RIVER = "obj_cr_node_04_river";
const TARGET = "obj_cr_node_11_target";
const SEASON = "cr_season_01_wake";

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Root manifesto",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function childObjectRow(): ChildObjectRow {
  return {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "status_plate",
    public_label: "Studio door",
    public_state: "Open until 9 PM",
    status: "active",
    child_object_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function childObjectQr(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: OBJECT_ID,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function gameNodeRow(
  objectId: string,
  publicLabel: string,
  nodeRole: string,
  gameMeta: Record<string, unknown>,
  parentProfileId = PROFILE
): ChildObjectRow {
  return {
    object_id: objectId,
    parent_profile_id: parentProfileId,
    object_type: "game_node",
    public_label: publicLabel,
    public_state: "Game node state",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: objectId,
      parent_profile_id: parentProfileId,
      object_type: "game_node",
      season_id: SEASON,
      node_role: nodeRole,
      district: "downtown",
      game_meta: gameMeta,
    }),
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
  };
}

function relationshipEdgeRow(
  doc: RelationshipEdgeDocument,
  overrides: Partial<RelationshipEdgeRow> = {}
): RelationshipEdgeRow {
  return {
    edge_id: doc.edge_id,
    network_id: doc.network_id,
    kind: doc.kind,
    from_object_id: doc.from.id,
    to_object_id: doc.to.id,
    steward_profile_id: doc.steward_profile_id,
    status: doc.status,
    edge_document_json: JSON.stringify(doc),
    created_at: doc.created_at,
    updated_at: doc.created_at,
    ...overrides,
  };
}

async function signedEdge(
  unsigned: ReturnType<
    | typeof crWitnessEdgeDocumentUnsigned
    | typeof crUnlockEdgeDocumentUnsigned
  >
): Promise<RelationshipEdgeDocument> {
  const signer = await getTestKeypair();
  return (await signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    signer
  )) as RelationshipEdgeDocument;
}

function scanContextDb(child: ChildObjectRow | null) {
  const objects = child ? new Map([[child.object_id, child]]) : new Map();
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) return cardRow();
          if (sql.includes("FROM qr_credentials")) return childObjectQr();
          if (sql.includes("FROM child_objects")) {
            return objects.get(String(args[0])) ?? null;
          }
          if (sql.includes("FROM verification_summaries")) {
            return {
              profile_id: PROFILE,
              state: "registered",
              level: 1,
              label: "Registered",
              method: "registered",
              vouch_count: 0,
              latest_accepted_vouch_at: null,
              credential_ids_json: "[]",
              summary_document_json: null,
              updated_at: "2026-05-16T17:00:00Z",
            };
          }
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

function gameNodeScanContextDb(input: {
  scanned: ChildObjectRow;
  peers: ChildObjectRow[];
  edges: RelationshipEdgeRow[];
  signerPublicKey: string;
}) {
  const objects = new Map(
    [input.scanned, ...input.peers].map((row) => [row.object_id, row])
  );
  const qr = { ...childObjectQr(), object_id: input.scanned.object_id };

  const first = async (sql: string, args: unknown[]) => {
    if (sql.includes("sqlite_master")) return { 1: 1 };
    if (sql.includes("FROM cards")) {
      return {
        ...cardRow(),
        public_key: input.signerPublicKey,
        recovery_public_key: null,
        issuer_public_key: input.signerPublicKey,
      };
    }
    if (sql.includes("FROM qr_credentials")) return qr;
    if (sql.includes("FROM child_objects")) {
      return objects.get(String(args[0])) ?? null;
    }
    if (sql.includes("FROM verification_summaries")) {
      return {
        profile_id: PROFILE,
        state: "registered",
        level: 1,
        label: "Registered",
        method: "registered",
        vouch_count: 0,
        latest_accepted_vouch_at: null,
        credential_ids_json: "[]",
        summary_document_json: null,
        updated_at: "2026-06-22T00:00:00.000Z",
      };
    }
    return null;
  };

  const all = async (sql: string, args: unknown[]) => {
    if (!sql.includes("FROM relationship_edges")) return { results: [] };
    const [objectId, networkId] = args.map(String);
    const rows = input.edges.filter(
      (row) =>
        row.network_id === networkId &&
        row.status === "active" &&
        (sql.includes("to_object_id = ?")
          ? row.to_object_id === objectId
          : row.from_object_id === objectId)
    );
    return { results: rows };
  };

  return {
    prepare: (sql: string) => ({
      first: () => first(sql, []),
      bind: (...args: unknown[]) => ({
        first: () => first(sql, args),
        all: () => all(sql, args),
      }),
    }),
  } as unknown as D1Database;
}

describe("loadScanContext", () => {
  it("loads child object when QR scope is child_object", async () => {
    const row = childObjectRow();
    const ctx = await loadScanContext(scanContextDb(row), PROFILE, QR);
    expect(ctx.childObject).toEqual(row);
  });

  it("omits child object when parent_profile_id mismatches", async () => {
    const row = { ...childObjectRow(), parent_profile_id: "other_profile_id" };
    const ctx = await loadScanContext(scanContextDb(row), PROFILE, QR);
    expect(ctx.childObject).toBeNull();
  });

  it("omits child object for non-child_object QR scope", async () => {
    const db = scanContextDb(childObjectRow());
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql: string) => {
      const stmt = originalPrepare(sql);
      return {
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes("FROM qr_credentials")) {
              return { ...childObjectQr(), scope: "card", object_id: null };
            }
            return stmt.bind(...args).first();
          },
        }),
      };
    };
    const ctx = await loadScanContext(db, PROFILE, QR);
    expect(ctx.childObject).toBeNull();
  });

  it("loads verified incoming relationship edges and hydrates witness peers", async () => {
    const signer = await getTestKeypair();
    const witness = await signedEdge(crWitnessEdgeDocumentUnsigned(PROFILE));
    const unlock = await signedEdge(crUnlockEdgeDocumentUnsigned(PROFILE));
    const cabinet = gameNodeRow(CABINET, "Czech Village cabinet", "lore_archive", {
      unlocked_by: ["node_04"],
      vouch_requires: ["node_10"],
    });
    const library = gameNodeRow(LIBRARY, "Library witness", "witness", {
      vouch_active_for: ["node_07"],
      scarcity_remaining: 24,
    });
    const river = gameNodeRow(RIVER, "River lantern", "relay_gate", {
      collective_progress: 5,
      collective_target: 5,
    });
    const db = gameNodeScanContextDb({
      scanned: cabinet,
      peers: [library, river],
      edges: [relationshipEdgeRow(witness), relationshipEdgeRow(unlock)],
      signerPublicKey: signer.publicKeyBase58,
    });

    const ctx = await loadScanContext(db, PROFILE, QR);

    expect(
      ctx.witnessRelationshipEdgesIncoming?.map((edge) => edge.edge_id)
    ).toEqual(["edge_cr_witness_10_07", "edge_cr_unlock_04_07"]);
    expect(ctx.witnessRelationshipEdgesOutgoing).toBeNull();
    expect(ctx.witnessPeerLabels).toEqual({
      [LIBRARY]: "Library witness",
      [RIVER]: "River lantern",
    });
    expect(ctx.gameVouchWitnesses?.node_10.vouch_active_for).toEqual([
      "node_07",
    ]);
    expect(ctx.relationshipPeerGameMeta?.[RIVER].collective_progress).toBe(5);
  });

  it("drops mismatched rows and omits foreign peer metadata", async () => {
    const signer = await getTestKeypair();
    const witness = await signedEdge(crWitnessEdgeDocumentUnsigned(PROFILE));
    const outgoingUnlock = await signedEdge(
      crUnlockEdgeDocumentUnsigned(PROFILE, {
        edge_id: "edge_test_outgoing_07_11",
        from: { ref: "object_id", id: CABINET },
        to: { ref: "object_id", id: TARGET },
        unlock: { from_node_id: "node_07", to_node_id: "node_11" },
      })
    );
    const cabinet = gameNodeRow(CABINET, "Czech Village cabinet", "lore_archive", {
      vouch_requires: ["node_10"],
    });
    const library = gameNodeRow(LIBRARY, "Library witness", "witness", {
      vouch_active_for: ["node_07"],
    });
    const foreignTarget = gameNodeRow(
      TARGET,
      "Foreign target",
      "lore_archive",
      {},
      "other_profile"
    );
    const db = gameNodeScanContextDb({
      scanned: cabinet,
      peers: [library, foreignTarget],
      edges: [
        relationshipEdgeRow(witness, {
          from_object_id: "obj_tampered_index",
        }),
        relationshipEdgeRow(outgoingUnlock),
      ],
      signerPublicKey: signer.publicKeyBase58,
    });

    const ctx = await loadScanContext(db, PROFILE, QR);

    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(
      ctx.witnessRelationshipEdgesOutgoing?.map((edge) => edge.edge_id)
    ).toEqual(["edge_test_outgoing_07_11"]);
    expect(ctx.witnessPeerLabels).toBeNull();
    expect(ctx.relationshipPeerGameMeta).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
  });
});
