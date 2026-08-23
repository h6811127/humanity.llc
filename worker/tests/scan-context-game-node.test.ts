import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  PAYLOAD_TYPES,
  encodeBase58,
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
import { gameMetaFromChildDocumentJson } from "../src/city-game/game-meta";
import {
  CR_UNLOCK_FROM_OBJECT_ID,
  CR_WITNESS_FROM_OBJECT_ID,
  CR_WITNESS_NETWORK_ID,
  CR_WITNESS_TO_OBJECT_ID,
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
  type RelationshipEdgeDocument,
} from "../src/live-object/relationship-edge-spec";
import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const OTHER_STEWARD = "8Ym2nQ3pR5sT7vW9zA2bC4dE6";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const CABINET = CR_WITNESS_TO_OBJECT_ID;
const LIBRARY = CR_WITNESS_FROM_OBJECT_ID;
const RIVER = CR_UNLOCK_FROM_OBJECT_ID;

type EdgeKind = "witnesses" | "unlocks";

type StoredEdge = Omit<RelationshipEdgeRow, "kind"> & { kind: EdgeKind };

class GameNodeScanDb {
  cards = new Map<string, CardRow & { issuer_public_key?: string | null; recovery_public_key?: string | null }>();
  qrs = new Map<string, QrCredentialRow>();
  objects = new Map<string, ChildObjectRow>();
  edges: StoredEdge[] = [];
  schemaReady = true;

  seedCard(row: CardRow & { issuer_public_key?: string | null; recovery_public_key?: string | null }) {
    this.cards.set(row.profile_id, row);
  }

  seedQr(row: QrCredentialRow) {
    this.qrs.set(row.qr_id, row);
  }

  seedObject(row: ChildObjectRow) {
    this.objects.set(row.object_id, row);
  }

  seedEdge(row: StoredEdge) {
    this.edges.push(row);
  }

  prepare(sql: string) {
    const db = this;
    const exec = {
      async first<T>(args: unknown[] = []) {
        if (sql.includes("sqlite_master") && sql.includes("relationship_edges")) {
          return (db.schemaReady ? ({ 1: 1 } as T) : null);
        }
        if (sql.includes("FROM cards WHERE profile_id = ?")) {
          return (db.cards.get(String(args[0])) ?? null) as T | null;
        }
        if (sql.includes("FROM qr_credentials")) {
          return (db.qrs.get(String(args[0])) ?? null) as T | null;
        }
        if (sql.includes("FROM child_objects WHERE object_id = ?")) {
          return (db.objects.get(String(args[0])) ?? null) as T | null;
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
            updated_at: "2026-06-01T12:00:00.000Z",
          } as T;
        }
        return null as T | null;
      },
      async all<T>(args: unknown[] = []) {
        if (sql.includes("FROM relationship_edges") && sql.includes("status = 'active'")) {
          const networkId = String(args[1]);
          const rows = db.edges.filter((row) => {
            if (row.network_id !== networkId || row.status !== "active") return false;
            if (sql.includes("to_object_id = ?")) return row.to_object_id === String(args[0]);
            if (sql.includes("from_object_id = ?")) return row.from_object_id === String(args[0]);
            return false;
          });
          return { results: rows as T[] };
        }
        return { results: [] as T[] };
      },
    };

    return {
      bind(...args: unknown[]) {
        return {
          first: <T>() => exec.first<T>(args),
          all: <T>() => exec.all<T>(args),
        };
      },
      first: <T>() => exec.first<T>(),
      all: <T>() => exec.all<T>(),
    };
  }
}

function asDb(db: GameNodeScanDb): D1Database {
  return db as unknown as D1Database;
}

function cardRow(
  publicKey: string,
  overrides: Partial<CardRow> = {}
): CardRow & { issuer_public_key: string | null; recovery_public_key: string | null } {
  return {
    profile_id: PROFILE,
    public_key: publicKey,
    handle: "cedar_rapids_wake",
    handle_normalized: "cedar_rapids_wake",
    manifesto_line: "Wake season",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
    issuer_public_key: null,
    recovery_public_key: null,
    ...overrides,
  };
}

function cabinetQr(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: CABINET,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-06-01T12:00:00.000Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

function gameNodeRow(
  objectId: string,
  publicLabel: string,
  gameMeta: Record<string, unknown>,
  overrides: Partial<ChildObjectRow> = {}
): ChildObjectRow {
  return {
    object_id: objectId,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: publicLabel,
    public_state: "Public state",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: objectId,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      season_id: "cr_season_01_wake",
      node_role: objectId === CABINET ? "lore_archive" : "witness",
      district: "czech_village",
      game_meta: gameMeta,
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

function cabinetRow(overrides: Partial<ChildObjectRow> = {}): ChildObjectRow {
  return gameNodeRow(
    CABINET,
    "Czech Village cabinet",
    {
      unlocked_by: ["node_04"],
      vouch_requires: ["node_10"],
      fragment_id: "czech_1",
    },
    overrides
  );
}

function libraryRow(overrides: Partial<ChildObjectRow> = {}): ChildObjectRow {
  return gameNodeRow(
    LIBRARY,
    "Library witness",
    {
      vouch_active_for: ["node_07"],
      scarcity_remaining: 24,
    },
    overrides
  );
}

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

async function signedWitnessEdge(
  keys: { privateKey: Uint8Array; publicKeyBase58: string },
  overrides: Partial<Omit<RelationshipEdgeDocument, "signature">> = {}
): Promise<{ doc: RelationshipEdgeDocument; json: string }> {
  const unsigned = crWitnessEdgeDocumentUnsigned(PROFILE, overrides);
  const signed = (await signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    keys
  )) as RelationshipEdgeDocument;
  return { doc: signed, json: JSON.stringify(signed) };
}

function edgeRow(doc: RelationshipEdgeDocument, json: string): StoredEdge {
  return {
    edge_id: doc.edge_id,
    network_id: doc.network_id,
    kind: doc.kind,
    from_object_id: doc.from.id,
    to_object_id: doc.to.id,
    steward_profile_id: doc.steward_profile_id,
    status: doc.status,
    edge_document_json: json,
    created_at: doc.created_at,
    updated_at: doc.created_at,
  };
}

async function seededCabinetDb(opts?: {
  schemaReady?: boolean;
  extraObjects?: ChildObjectRow[];
  edges?: StoredEdge[];
}): Promise<GameNodeScanDb> {
  const owner = await getTestKeypair();
  const db = new GameNodeScanDb();
  db.schemaReady = opts?.schemaReady ?? true;
  db.seedCard(cardRow(owner.publicKeyBase58));
  db.seedQr(cabinetQr());
  db.seedObject(cabinetRow());
  for (const row of opts?.extraObjects ?? []) db.seedObject(row);
  for (const row of opts?.edges ?? []) db.seedEdge(row);
  return db;
}

describe("loadScanContext game_node witness path", () => {
  it("skips witness load for non-game child objects", async () => {
    const db = await seededCabinetDb();
    db.seedObject({
      ...cabinetRow(),
      object_type: "status_plate",
      child_object_document_json: JSON.stringify({ object_type: "status_plate" }),
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.childObject?.object_type).toBe("status_plate");
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.witnessPeerLabels).toBeNull();
  });

  it("skips witness load when the game_node is not active", async () => {
    const db = await seededCabinetDb();
    db.seedObject(cabinetRow({ status: "disabled" }));

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.childObject?.status).toBe("disabled");
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
  });

  it("returns empty witness payload when game_node JSON is not parseable", async () => {
    const db = await seededCabinetDb();
    db.seedObject(cabinetRow({ child_object_document_json: "{not-json" }));

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.witnessRelationshipEdgesOutgoing).toBeNull();
    expect(ctx.witnessPeerLabels).toBeNull();
    expect(ctx.relationshipPeerGameMeta).toBeNull();
  });

  it("does not load season-object witness meta when relationship_edges schema is missing", async () => {
    const db = await seededCabinetDb({
      schemaReady: false,
      extraObjects: [libraryRow()],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.witnessRelationshipEdgesOutgoing).toBeNull();
    expect(ctx.witnessPeerLabels).toBeNull();
    expect(ctx.relationshipPeerGameMeta).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
  });

  it("does not treat vouch_requires season IDs as witness meta without signed edges", async () => {
    const db = await seededCabinetDb({ extraObjects: [libraryRow()] });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessPeerLabels).toBeNull();
  });

  it("loads signed witness edges and same-steward peer labels/meta", async () => {
    const owner = await getTestKeypair();
    const { doc, json } = await signedWitnessEdge(owner);
    const library = libraryRow();
    const db = await seededCabinetDb({
      extraObjects: [library],
      edges: [edgeRow(doc, json)],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toEqual([doc]);
    expect(ctx.witnessPeerLabels).toEqual({ [LIBRARY]: "Library witness" });
    expect(ctx.relationshipPeerGameMeta?.[LIBRARY]).toEqual(
      gameMetaFromChildDocumentJson(library.child_object_document_json)
    );
    expect(ctx.gameVouchWitnesses?.node_10).toEqual(
      gameMetaFromChildDocumentJson(library.child_object_document_json)
    );
  });

  it("excludes unsigned and tampered relationship edges", async () => {
    const owner = await getTestKeypair();
    const unsigned = crWitnessEdgeDocumentUnsigned(PROFILE);
    const { doc, json } = await signedWitnessEdge(owner);
    const tampered = JSON.parse(json) as RelationshipEdgeDocument;
    tampered.label = "tampered label";

    const db = await seededCabinetDb({
      extraObjects: [libraryRow()],
      edges: [
        edgeRow(unsigned as RelationshipEdgeDocument, JSON.stringify(unsigned)),
        edgeRow(tampered, JSON.stringify(tampered)),
      ],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessPeerLabels).toBeNull();
  });

  it("excludes edges signed by a non-steward key", async () => {
    const attacker = await randomKeypair();
    const { doc, json } = await signedWitnessEdge(attacker);
    const db = await seededCabinetDb({
      extraObjects: [libraryRow()],
      edges: [edgeRow(doc, json)],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessPeerLabels).toBeNull();
  });

  it("does not leak cross-steward peer labels or game_meta", async () => {
    const owner = await getTestKeypair();
    const { doc, json } = await signedWitnessEdge(owner);
    const foreignLibrary = libraryRow({
      parent_profile_id: OTHER_STEWARD,
      public_label: "Secret foreign library",
    });
    const db = await seededCabinetDb({
      extraObjects: [foreignLibrary],
      edges: [edgeRow(doc, json)],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toEqual([doc]);
    expect(ctx.witnessPeerLabels).toBeNull();
    expect(ctx.relationshipPeerGameMeta).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(JSON.stringify(ctx)).not.toContain("Secret foreign library");
  });

  it("ignores inactive same-steward peers when collecting labels", async () => {
    const owner = await getTestKeypair();
    const { doc, json } = await signedWitnessEdge(owner);
    const db = await seededCabinetDb({
      extraObjects: [libraryRow({ status: "disabled", public_label: "Retired library" })],
      edges: [edgeRow(doc, json)],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toEqual([doc]);
    expect(ctx.witnessPeerLabels).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(JSON.stringify(ctx)).not.toContain("Retired library");
  });

  it("keeps verified unlock edges without inventing witness meta", async () => {
    const owner = await getTestKeypair();
    const unsigned = crUnlockEdgeDocumentUnsigned(PROFILE);
    const signed = (await signDocument(
      withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
      owner
    )) as RelationshipEdgeDocument;
    const river = gameNodeRow(RIVER, "River lantern", { unlocked_by: [] });
    const db = await seededCabinetDb({
      extraObjects: [libraryRow(), river],
      edges: [edgeRow(signed, JSON.stringify(signed))],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toEqual([signed]);
    expect(ctx.witnessPeerLabels).toEqual({ [RIVER]: "River lantern" });
    expect(ctx.relationshipPeerGameMeta?.[RIVER]).toEqual(
      gameMetaFromChildDocumentJson(river.child_object_document_json)
    );
    expect(ctx.gameVouchWitnesses).toBeNull();
    expect(ctx.witnessPeerLabels?.[LIBRARY]).toBeUndefined();
  });

  it("does not load witness context for a different network_id", async () => {
    const owner = await getTestKeypair();
    const { doc, json } = await signedWitnessEdge(owner, {
      network_id: "other_season_99",
    });
    expect(doc.network_id).not.toBe(CR_WITNESS_NETWORK_ID);
    const db = await seededCabinetDb({
      extraObjects: [libraryRow()],
      edges: [edgeRow(doc, json)],
    });

    const ctx = await loadScanContext(asDb(db), PROFILE, QR);
    expect(ctx.witnessRelationshipEdgesIncoming).toBeNull();
    expect(ctx.gameVouchWitnesses).toBeNull();
  });
});
