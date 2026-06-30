import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getChildObject } from "../db/child-objects";
import {
  getRelationshipEdgeById,
  getRelationshipEdgeStewardRow,
  insertRelationshipEdge,
  listRelationshipEdgesForSteward,
  relationshipEdgeWriteFromDocument,
  relationshipEdgesSchemaReady,
  revokeRelationshipEdge,
  validateRelationshipEdgeWrite,
  isRelationshipEdgeSigner,
} from "../db/relationship-edges";
import { GAME_NODE_OBJECT_TYPE } from "../city-game/constants";
import type { RelationshipEdgeDocument } from "../live-object/relationship-edge-spec";
import {
  RELATIONSHIP_EDGE_ID_REGEX,
  RELATIONSHIP_EDGE_KIND_WITNESSES,
  RELATIONSHIP_EDGE_KIND_UNLOCKS,
  RELATIONSHIP_EDGE_SPEC_VERSION,
  relationshipEdgePath,
  validateRelationshipEdgeShape,
} from "../live-object/relationship-edge-spec";
import { errorResponse, jsonResponse } from "../http/resolver";

function parseRelationshipEdgeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.relationship_edge && typeof o.relationship_edge === "object") {
    return o.relationship_edge as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.RELATIONSHIP_EDGE) return o;
  return null;
}

function edgeListItem(row: {
  edge_id: string;
  network_id: string;
  kind: string;
  from_object_id: string;
  to_object_id: string;
  label?: string;
  status: string;
  edge_document_json: string;
  created_at: string;
  updated_at: string;
}) {
  let path: { from_node_id: string; to_node_id: string } | null = null;
  let label = "";
  try {
    const parsed = JSON.parse(row.edge_document_json) as RelationshipEdgeDocument;
    path = relationshipEdgePath(parsed);
    label = parsed.label ?? "";
  } catch {
    /* list still returns row */
  }
  return {
    edge_id: row.edge_id,
    network_id: row.network_id,
    kind: row.kind,
    from_object_id: row.from_object_id,
    to_object_id: row.to_object_id,
    label,
    witness: row.kind === RELATIONSHIP_EDGE_KIND_WITNESSES ? path : null,
    unlock: row.kind === RELATIONSHIP_EDGE_KIND_UNLOCKS ? path : null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function schemaUnavailable(db: D1Database): Promise<Response | null> {
  if (await relationshipEdgesSchemaReady(db)) return null;
  return errorResponse(
    "SCHEMA_NOT_READY",
    "relationship_edges migration is not applied.",
    503
  );
}

async function verifiedWitnessEdgeIssuance(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathEdgeId?: string
): Promise<
  | { ok: true; doc: RelationshipEdgeDocument; documentJson: string }
  | { ok: false; response: Response }
> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return {
      ok: false,
      response: errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400),
    };
  }
  if (pathEdgeId && !RELATIONSHIP_EDGE_ID_REGEX.test(pathEdgeId)) {
    return {
      ok: false,
      response: errorResponse("INVALID_EDGE_ID", "Invalid edge_id.", 400),
    };
  }

  const schemaBlock = await schemaUnavailable(db);
  if (schemaBlock) {
    return { ok: false, response: schemaBlock };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400) };
  }

  const raw = parseRelationshipEdgeBody(body);
  if (!raw) {
    return {
      ok: false,
      response: errorResponse(
        "MALFORMED_REQUEST",
        "Body must include signed `relationship_edge`.",
        400
      ),
    };
  }

  const steward = await getRelationshipEdgeStewardRow(db, pathProfileId);
  if (!steward) {
    return { ok: false, response: errorResponse("NOT_FOUND", "Parent card not found.", 404) };
  }
  if (steward.status !== "active") {
    return {
      ok: false,
      response: errorResponse("CARD_NOT_ACTIVE", "Parent card is not active.", 410),
    };
  }

  const verify = await verifySignedDocument(raw, {
    expectedType: PAYLOAD_TYPES.RELATIONSHIP_EDGE,
  });
  if (!verify.ok) {
    return { ok: false, response: errorResponse(verify.code, verify.message, 401) };
  }

  if (!isRelationshipEdgeSigner(verify.signature.public_key, steward)) {
    return {
      ok: false,
      response: errorResponse(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "Relationship edge must be signed by the steward owner, recovery key, or game operator.",
        401
      ),
    };
  }

  const shape = validateRelationshipEdgeShape(verify.unsigned);
  if (!shape.ok) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", shape.issues.join(" "), 422),
    };
  }

  const doc = verify.unsigned as unknown as RelationshipEdgeDocument;
  if (doc.version !== RELATIONSHIP_EDGE_SPEC_VERSION) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "Unsupported relationship edge version.", 422),
    };
  }
  if (
    doc.kind !== RELATIONSHIP_EDGE_KIND_WITNESSES &&
    doc.kind !== RELATIONSHIP_EDGE_KIND_UNLOCKS
  ) {
    return {
      ok: false,
      response: errorResponse(
        "MALFORMED_REQUEST",
        `Only ${RELATIONSHIP_EDGE_KIND_WITNESSES} and ${RELATIONSHIP_EDGE_KIND_UNLOCKS} edges are supported in v1.`,
        422
      ),
    };
  }
  if (doc.steward_profile_id !== pathProfileId) {
    return {
      ok: false,
      response: errorResponse(
        "PROFILE_MISMATCH",
        "steward_profile_id must match URL.",
        422
      ),
    };
  }
  if (pathEdgeId && doc.edge_id !== pathEdgeId) {
    return {
      ok: false,
      response: errorResponse("EDGE_MISMATCH", "edge_id must match URL.", 422),
    };
  }

  for (const objectId of [doc.from.id, doc.to.id]) {
    const child = await getChildObject(db, objectId);
    if (!child || child.parent_profile_id !== pathProfileId) {
      return {
        ok: false,
        response: errorResponse(
          "OBJECT_NOT_FOUND",
          `Child object ${objectId} not found under this steward.`,
          404
        ),
      };
    }
    if (child.object_type !== GAME_NODE_OBJECT_TYPE) {
      return {
        ok: false,
        response: errorResponse(
          "NOT_GAME_NODE",
          "Witness relationship edges require game_node child objects.",
          422
        ),
      };
    }
    if (child.status !== "active") {
      return {
        ok: false,
        response: errorResponse(
          "OBJECT_NOT_ACTIVE",
          `Child object ${objectId} is not active.`,
          409
        ),
      };
    }
  }

  return { ok: true, doc, documentJson: JSON.stringify(raw) };
}

export async function handleGetRelationshipEdges(
  db: D1Database,
  pathProfileId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  const schemaBlock = await schemaUnavailable(db);
  if (schemaBlock) return schemaBlock;

  const parent = await getRelationshipEdgeStewardRow(db, pathProfileId);
  if (!parent) {
    return errorResponse("NOT_FOUND", "Parent card not found.", 404);
  }

  const rows = await listRelationshipEdgesForSteward(db, pathProfileId);
  return jsonResponse(
    {
      profile_id: pathProfileId,
      relationship_edges: rows.map(edgeListItem),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

export async function handlePostRelationshipEdgeIssue(
  request: Request,
  db: D1Database,
  pathProfileId: string
): Promise<Response> {
  const parsed = await verifiedWitnessEdgeIssuance(request, db, pathProfileId);
  if (!parsed.ok) return parsed.response;

  if (parsed.doc.status !== "active") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "New relationship edges must have status active.",
      422
    );
  }

  const write = relationshipEdgeWriteFromDocument(parsed.doc, parsed.documentJson);
  write.updatedAt = write.createdAt;
  const validation = validateRelationshipEdgeWrite(write);
  if (!validation.ok) {
    return errorResponse("MALFORMED_REQUEST", validation.issues.join(" "), 422);
  }

  const existing = await getRelationshipEdgeById(db, parsed.doc.edge_id);
  if (existing) {
    return errorResponse("EDGE_EXISTS", "Relationship edge already exists.", 409);
  }

  const insert = await insertRelationshipEdge(db, write);
  if (!insert.ok) {
    return errorResponse("MALFORMED_REQUEST", insert.issues.join(" "), 422);
  }

  return jsonResponse(
    {
      profile_id: pathProfileId,
      edge_id: parsed.doc.edge_id,
      network_id: parsed.doc.network_id,
      kind: parsed.doc.kind,
      from_object_id: parsed.doc.from.id,
      to_object_id: parsed.doc.to.id,
      status: parsed.doc.status,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

export async function handlePostRelationshipEdgeRevoke(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathEdgeId: string
): Promise<Response> {
  const parsed = await verifiedWitnessEdgeIssuance(
    request,
    db,
    pathProfileId,
    pathEdgeId
  );
  if (!parsed.ok) return parsed.response;

  if (parsed.doc.status !== "revoked") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Revoke must set relationship edge status to revoked.",
      422
    );
  }

  const existing = await getRelationshipEdgeById(db, pathEdgeId);
  if (!existing || existing.steward_profile_id !== pathProfileId) {
    return errorResponse("NOT_FOUND", "Relationship edge not found.", 404);
  }
  if (existing.status === "revoked") {
    return errorResponse("EDGE_REVOKED", "Relationship edge is already revoked.", 409);
  }

  const revoke = await revokeRelationshipEdge(db, {
    edgeId: pathEdgeId,
    stewardProfileId: pathProfileId,
    edgeDocumentJson: parsed.documentJson,
    updatedAt: new Date().toISOString(),
  });
  if (!revoke.ok) {
    return errorResponse("MALFORMED_REQUEST", revoke.issues.join(" "), 422);
  }
  if (revoke.changes === 0) {
    return errorResponse("NOT_FOUND", "Relationship edge not found.", 404);
  }

  return jsonResponse(
    {
      profile_id: pathProfileId,
      edge_id: pathEdgeId,
      status: "revoked",
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
