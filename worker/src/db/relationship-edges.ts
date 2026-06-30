import {
  PAYLOAD_TYPES,
  verifySignedDocument,
} from "../crypto";
import {
  validateRelationshipEdgeShape,
  type RelationshipEdgeDocument,
  type RelationshipEdgeKind,
} from "../live-object/relationship-edge-spec";
import type { RelationshipEdgeRow } from "./types";

type StewardSignerRow = {
  public_key: string;
  recovery_public_key: string | null;
  issuer_public_key: string | null;
  status: string;
};

export function isRelationshipEdgeSigner(
  signerKey: string,
  steward: StewardSignerRow
): boolean {
  if (signerKey === steward.public_key) return true;
  if (steward.recovery_public_key && signerKey === steward.recovery_public_key) {
    return true;
  }
  if (steward.issuer_public_key && signerKey === steward.issuer_public_key) {
    return true;
  }
  return false;
}

export async function getRelationshipEdgeStewardRow(
  db: D1Database,
  profileId: string
): Promise<StewardSignerRow | null> {
  return db
    .prepare(
      `SELECT public_key, recovery_public_key, issuer_public_key, status
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<StewardSignerRow>();
}

export async function relationshipEdgesSchemaReady(db: D1Database): Promise<boolean> {
  try {
    const row = await db
      .prepare(
        `SELECT 1 FROM sqlite_master
         WHERE type = 'table' AND name = 'relationship_edges'`
      )
      .first();
    return !!row;
  } catch {
    return false;
  }
}

export interface RelationshipEdgeWrite {
  edgeId: string;
  networkId: string;
  kind: RelationshipEdgeKind;
  fromObjectId: string;
  toObjectId: string;
  stewardProfileId: string;
  status: "active" | "revoked";
  edgeDocumentJson: string;
  createdAt: string;
  updatedAt: string;
}

export function relationshipEdgeWriteFromDocument(
  doc: RelationshipEdgeDocument,
  edgeDocumentJson: string
): RelationshipEdgeWrite {
  return {
    edgeId: doc.edge_id,
    networkId: doc.network_id,
    kind: doc.kind,
    fromObjectId: doc.from.id,
    toObjectId: doc.to.id,
    stewardProfileId: doc.steward_profile_id,
    status: doc.status,
    edgeDocumentJson,
    createdAt: doc.created_at,
    updatedAt: doc.created_at,
  };
}

export async function listActiveRelationshipEdgesForTarget(
  db: D1Database,
  input: { toObjectId: string; networkId: string }
): Promise<RelationshipEdgeRow[]> {
  const result = await db
    .prepare(
      `SELECT edge_id, network_id, kind, from_object_id, to_object_id,
              steward_profile_id, status, edge_document_json, created_at, updated_at
       FROM relationship_edges
       WHERE to_object_id = ? AND network_id = ? AND status = 'active'
       ORDER BY created_at ASC, edge_id ASC`
    )
    .bind(input.toObjectId, input.networkId)
    .all<RelationshipEdgeRow>();
  return result.results ?? [];
}

export async function listActiveRelationshipEdgesForSource(
  db: D1Database,
  input: { fromObjectId: string; networkId: string }
): Promise<RelationshipEdgeRow[]> {
  const result = await db
    .prepare(
      `SELECT edge_id, network_id, kind, from_object_id, to_object_id,
              steward_profile_id, status, edge_document_json, created_at, updated_at
       FROM relationship_edges
       WHERE from_object_id = ? AND network_id = ? AND status = 'active'
       ORDER BY created_at ASC, edge_id ASC`
    )
    .bind(input.fromObjectId, input.networkId)
    .all<RelationshipEdgeRow>();
  return result.results ?? [];
}

/** @deprecated Use listActiveRelationshipEdgesForTarget */
export async function listActiveWitnessEdgesForTarget(
  db: D1Database,
  input: { toObjectId: string; networkId: string }
): Promise<RelationshipEdgeRow[]> {
  const rows = await listActiveRelationshipEdgesForTarget(db, input);
  return rows.filter((row) => row.kind === "witnesses");
}

/** @deprecated Use listActiveRelationshipEdgesForSource */
export async function listActiveWitnessEdgesForSource(
  db: D1Database,
  input: { fromObjectId: string; networkId: string }
): Promise<RelationshipEdgeRow[]> {
  const rows = await listActiveRelationshipEdgesForSource(db, input);
  return rows.filter((row) => row.kind === "witnesses");
}

export async function getRelationshipEdgeById(
  db: D1Database,
  edgeId: string
): Promise<RelationshipEdgeRow | null> {
  return db
    .prepare(
      `SELECT edge_id, network_id, kind, from_object_id, to_object_id,
              steward_profile_id, status, edge_document_json, created_at, updated_at
       FROM relationship_edges WHERE edge_id = ?`
    )
    .bind(edgeId)
    .first<RelationshipEdgeRow>();
}

function rowMatchesDocument(
  row: RelationshipEdgeRow,
  doc: RelationshipEdgeDocument
): boolean {
  return (
    row.edge_id === doc.edge_id &&
    row.network_id === doc.network_id &&
    row.kind === doc.kind &&
    row.from_object_id === doc.from.id &&
    row.to_object_id === doc.to.id &&
    row.steward_profile_id === doc.steward_profile_id &&
    row.status === doc.status
  );
}

export async function verifyStoredRelationshipEdge(
  db: D1Database,
  row: RelationshipEdgeRow
): Promise<RelationshipEdgeDocument | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.edge_document_json);
  } catch {
    return null;
  }

  const shape = validateRelationshipEdgeShape(parsed);
  if (!shape.ok) return null;

  const doc = parsed as RelationshipEdgeDocument;
  if (!rowMatchesDocument(row, doc)) return null;
  if (doc.status !== "active") return null;

  const verify = await verifySignedDocument(parsed as Record<string, unknown>, {
    expectedType: PAYLOAD_TYPES.RELATIONSHIP_EDGE,
  });
  if (!verify.ok) return null;

  const steward = await getRelationshipEdgeStewardRow(db, doc.steward_profile_id);
  if (!steward || steward.status !== "active") return null;
  if (!isRelationshipEdgeSigner(verify.signature.public_key, steward)) return null;

  return doc;
}

export function validateRelationshipEdgeWrite(
  input: RelationshipEdgeWrite
): { ok: true } | { ok: false; issues: string[] } {
  let doc: unknown;
  try {
    doc = JSON.parse(input.edgeDocumentJson);
  } catch {
    return { ok: false, issues: ["edge_document_json must be valid JSON."] };
  }
  const shape = validateRelationshipEdgeShape(doc);
  if (!shape.ok) return { ok: false, issues: shape.issues };
  const edge = doc as RelationshipEdgeDocument;
  const issues: string[] = [];
  if (edge.edge_id !== input.edgeId) issues.push("edge_id must match edge_document_json.");
  if (edge.network_id !== input.networkId) {
    issues.push("network_id must match edge_document_json.");
  }
  if (edge.from.id !== input.fromObjectId) {
    issues.push("from_object_id must match edge_document_json.");
  }
  if (edge.to.id !== input.toObjectId) {
    issues.push("to_object_id must match edge_document_json.");
  }
  if (edge.steward_profile_id !== input.stewardProfileId) {
    issues.push("steward_profile_id must match edge_document_json.");
  }
  if (edge.status !== input.status) {
    issues.push("status must match edge_document_json.");
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export async function listRelationshipEdgesForSteward(
  db: D1Database,
  stewardProfileId: string
): Promise<RelationshipEdgeRow[]> {
  const result = await db
    .prepare(
      `SELECT edge_id, network_id, kind, from_object_id, to_object_id,
              steward_profile_id, status, edge_document_json, created_at, updated_at
       FROM relationship_edges
       WHERE steward_profile_id = ?
       ORDER BY created_at ASC, edge_id ASC`
    )
    .bind(stewardProfileId)
    .all<RelationshipEdgeRow>();
  return result.results ?? [];
}

export async function insertRelationshipEdge(
  db: D1Database,
  input: RelationshipEdgeWrite
): Promise<{ ok: true } | { ok: false; issues: string[] }> {
  const validation = validateRelationshipEdgeWrite(input);
  if (!validation.ok) return validation;

  const result = await db
    .prepare(
      `INSERT INTO relationship_edges (
         edge_id, network_id, kind, from_object_id, to_object_id,
         steward_profile_id, status, edge_document_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.edgeId,
      input.networkId,
      input.kind,
      input.fromObjectId,
      input.toObjectId,
      input.stewardProfileId,
      input.status,
      input.edgeDocumentJson,
      input.createdAt,
      input.updatedAt
    )
    .run();

  if (!result.success) {
    return { ok: false, issues: ["relationship edge insert failed."] };
  }
  return { ok: true };
}

export async function revokeRelationshipEdge(
  db: D1Database,
  input: {
    edgeId: string;
    stewardProfileId: string;
    edgeDocumentJson: string;
    updatedAt: string;
  }
): Promise<{ ok: true; changes: number } | { ok: false; issues: string[] }> {
  let doc: unknown;
  try {
    doc = JSON.parse(input.edgeDocumentJson);
  } catch {
    return { ok: false, issues: ["edge_document_json must be valid JSON."] };
  }
  const shape = validateRelationshipEdgeShape(doc);
  if (!shape.ok) return { ok: false, issues: shape.issues };
  const edge = doc as RelationshipEdgeDocument;
  if (edge.edge_id !== input.edgeId) {
    return { ok: false, issues: ["edge_id must match edge_document_json."] };
  }
  if (edge.steward_profile_id !== input.stewardProfileId) {
    return { ok: false, issues: ["steward_profile_id must match edge_document_json."] };
  }
  if (edge.status !== "revoked") {
    return { ok: false, issues: ['status must be "revoked" in edge_document_json.'] };
  }
  if (edge.kind !== "witnesses" && edge.kind !== "unlocks") {
    return { ok: false, issues: ['kind must be "witnesses" or "unlocks".'] };
  }

  const result = await db
    .prepare(
      `UPDATE relationship_edges
       SET status = 'revoked',
           edge_document_json = ?,
           updated_at = ?
       WHERE edge_id = ? AND steward_profile_id = ?`
    )
    .bind(input.edgeDocumentJson, input.updatedAt, input.edgeId, input.stewardProfileId)
    .run();

  return { ok: true, changes: result.meta.changes ?? 0 };
}
