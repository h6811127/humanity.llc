import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getChildObject, getChildObjectParent } from "../db/child-objects";
import {
  delegatedCapabilityWriteFromDocument,
  getDelegatedCapabilityById,
  insertDelegatedCapability,
  listDelegatedCapabilitiesForParent,
  revokeDelegatedCapability,
  validateDelegatedCapabilityWrite,
} from "../db/delegated-capabilities";
import type { DelegatedCapabilityDocument } from "../live-object/delegation-spec";
import {
  DELEGATION_SPEC_VERSION,
  validateDelegatedCapabilityShape,
} from "../live-object/delegation-spec";
import { isParentOrRecoverySigner } from "./delegated-child-signer";
import { errorResponse, jsonResponse } from "../http/resolver";

export const DELEGATED_CAPABILITY_ID_REGEX = /^cap_[A-Za-z0-9_-]{4,76}$/;

const MAX_SCOPE_OBJECT_IDS = 1;

function parseCapabilityBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.capability && typeof o.capability === "object") {
    return o.capability as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.DELEGATED_CAPABILITY) return o;
  return null;
}

function capabilityListItem(row: {
  capability_id: string;
  delegated_public_key: string;
  label: string;
  expires_at: string;
  status: string;
  operations_json: string;
  scope_json: string;
  created_at: string;
  updated_at: string;
}) {
  let operations: string[] = [];
  let scope: { object_ids?: string[]; print_artifact_ids?: string[] } = {};
  try {
    operations = JSON.parse(row.operations_json) as string[];
    scope = JSON.parse(row.scope_json) as typeof scope;
  } catch {
    /* list still returns row */
  }
  return {
    capability_id: row.capability_id,
    delegated_public_key: row.delegated_public_key,
    label: row.label,
    expires_at: row.expires_at,
    status: row.status,
    operations,
    scope,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function handleGetDelegatedCapabilities(
  db: D1Database,
  pathProfileId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  const parent = await getChildObjectParent(db, pathProfileId);
  if (!parent) {
    return errorResponse("NOT_FOUND", "Parent card not found.", 404);
  }
  const rows = await listDelegatedCapabilitiesForParent(db, pathProfileId);
  return jsonResponse(
    {
      profile_id: pathProfileId,
      capabilities: rows.map(capabilityListItem),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function verifiedCapabilityIssuance(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathCapabilityId?: string
): Promise<
  | { ok: true; doc: DelegatedCapabilityDocument; documentJson: string }
  | { ok: false; response: Response }
> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return {
      ok: false,
      response: errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400),
    };
  }
  if (pathCapabilityId && !DELEGATED_CAPABILITY_ID_REGEX.test(pathCapabilityId)) {
    return {
      ok: false,
      response: errorResponse("INVALID_CAPABILITY_ID", "Invalid capability_id.", 400),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400) };
  }

  const raw = parseCapabilityBody(body);
  if (!raw) {
    return {
      ok: false,
      response: errorResponse(
        "MALFORMED_REQUEST",
        "Body must include signed `capability`.",
        400
      ),
    };
  }

  const parent = await getChildObjectParent(db, pathProfileId);
  if (!parent) {
    return { ok: false, response: errorResponse("NOT_FOUND", "Parent card not found.", 404) };
  }
  if (parent.status !== "active") {
    return {
      ok: false,
      response: errorResponse("CARD_NOT_ACTIVE", "Parent card is not active.", 410),
    };
  }

  const verify = await verifySignedDocument(raw, {
    expectedType: PAYLOAD_TYPES.DELEGATED_CAPABILITY,
  });
  if (!verify.ok) {
    return { ok: false, response: errorResponse(verify.code, verify.message, 401) };
  }

  if (!isParentOrRecoverySigner(verify.signature.public_key, parent)) {
    return {
      ok: false,
      response: errorResponse(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "Capability must be signed by the root owner or recovery key.",
        401
      ),
    };
  }

  const shape = validateDelegatedCapabilityShape(verify.unsigned);
  if (!shape.ok) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", shape.issues.join(" "), 422),
    };
  }

  const doc = verify.unsigned as unknown as DelegatedCapabilityDocument;
  if (doc.version !== DELEGATION_SPEC_VERSION) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "Unsupported capability version.", 422),
    };
  }
  if (doc.parent_profile_id !== pathProfileId) {
    return {
      ok: false,
      response: errorResponse("PROFILE_MISMATCH", "parent_profile_id must match URL.", 422),
    };
  }
  if (pathCapabilityId && doc.capability_id !== pathCapabilityId) {
    return {
      ok: false,
      response: errorResponse("CAPABILITY_MISMATCH", "capability_id must match URL.", 422),
    };
  }

  const objectIds = doc.scope?.object_ids ?? [];
  if (!objectIds.length || objectIds.length > MAX_SCOPE_OBJECT_IDS) {
    return {
      ok: false,
      response: errorResponse(
        "MALFORMED_REQUEST",
        `scope.object_ids must include 1–${MAX_SCOPE_OBJECT_IDS} object id(s) for this pilot.`,
        422
      ),
    };
  }
  for (const objectId of objectIds) {
    const child = await getChildObject(db, objectId);
    if (!child || child.parent_profile_id !== pathProfileId) {
      return {
        ok: false,
        response: errorResponse(
          "OBJECT_NOT_FOUND",
          `Child object ${objectId} not found under this root.`,
          404
        ),
      };
    }
  }

  return { ok: true, doc, documentJson: JSON.stringify(raw) };
}

export async function handlePostDelegatedCapabilityIssue(
  request: Request,
  db: D1Database,
  pathProfileId: string
): Promise<Response> {
  const parsed = await verifiedCapabilityIssuance(request, db, pathProfileId);
  if (!parsed.ok) return parsed.response;

  if (parsed.doc.status !== "active") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "New delegated capabilities must have status active.",
      422
    );
  }

  const write = delegatedCapabilityWriteFromDocument(parsed.doc, parsed.documentJson);
  write.updatedAt = write.createdAt;
  const validation = validateDelegatedCapabilityWrite(write);
  if (!validation.ok) {
    return errorResponse("MALFORMED_REQUEST", validation.issues.join(" "), 422);
  }

  const existing = await getDelegatedCapabilityById(db, parsed.doc.capability_id);
  if (existing) {
    return errorResponse("CAPABILITY_EXISTS", "Delegated capability already exists.", 409);
  }

  const insert = await insertDelegatedCapability(db, write);
  if (!insert.ok) {
    return errorResponse("MALFORMED_REQUEST", insert.issues.join(" "), 422);
  }

  return jsonResponse(
    {
      profile_id: pathProfileId,
      capability_id: parsed.doc.capability_id,
      delegated_public_key: parsed.doc.delegated_public_key,
      status: parsed.doc.status,
      expires_at: parsed.doc.expires_at,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

export async function handlePostDelegatedCapabilityRevoke(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathCapabilityId: string
): Promise<Response> {
  const parsed = await verifiedCapabilityIssuance(
    request,
    db,
    pathProfileId,
    pathCapabilityId
  );
  if (!parsed.ok) return parsed.response;

  if (parsed.doc.status !== "revoked") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Revoke must set capability status to revoked.",
      422
    );
  }

  const existing = await getDelegatedCapabilityById(db, pathCapabilityId);
  if (!existing || existing.parent_profile_id !== pathProfileId) {
    return errorResponse("NOT_FOUND", "Delegated capability not found.", 404);
  }
  if (existing.status === "revoked") {
    return errorResponse("CAPABILITY_REVOKED", "Delegated capability is already revoked.", 409);
  }

  const revoke = await revokeDelegatedCapability(db, {
    capabilityId: pathCapabilityId,
    parentProfileId: pathProfileId,
    capabilityDocumentJson: parsed.documentJson,
    updatedAt: new Date().toISOString(),
  });
  if (!revoke.ok) {
    return errorResponse("MALFORMED_REQUEST", revoke.issues.join(" "), 422);
  }
  if (revoke.changes === 0) {
    return errorResponse("NOT_FOUND", "Delegated capability not found.", 404);
  }

  return jsonResponse(
    {
      profile_id: pathProfileId,
      capability_id: pathCapabilityId,
      status: "revoked",
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
