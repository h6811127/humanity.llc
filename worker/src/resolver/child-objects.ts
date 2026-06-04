import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import {
  getChildObject,
  getChildObjectParent,
  insertChildObject,
  listChildObjectsForParent,
  updateChildObject,
  type ChildObjectParentRow,
} from "../db/child-objects";
import { listActiveChildObjectQrsForParent } from "../db/child-object-qr";
import type { ChildObjectStatus } from "../db/types";
import { errorResponse, jsonResponse } from "../http/resolver";
import { GAME_NODE_OBJECT_TYPE } from "../city-game/constants";
import { resolveSeasonForProfile } from "../city-game/season-loader";
import { enforceGameNodeCap } from "../city-game/season-quota";
import { parseGameNodeFields } from "../city-game/scan-view";
import { validateGameNodeDocument } from "../city-game/game-meta";
import { validateTimePolicyForChildDocument } from "../live-object/time-policy";
import { validateCustodyForChildDocument } from "../live-object/custody";
import { parseObjectTimePolicy } from "../live-object/time-policy";
import { parseObjectCustody } from "../live-object/custody";
import {
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
} from "../live-object/object-types";
import { authorizeDelegatedChildRoute } from "./delegated-child-signer";
import type { DelegatedChildObjectRoute } from "../live-object/delegation-spec";

export const CHILD_OBJECT_ID_REGEX = /^obj_[A-Za-z0-9_-]{4,76}$/;
const OBJECT_TYPE_RE = /^[a-z][a-z0-9_-]{0,39}$/;
const CHILD_OBJECT_STATUSES = new Set<ChildObjectStatus>([
  "active",
  "disabled",
  "revoked",
  "replaced",
]);

function parseChildObjectBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.object && typeof o.object === "object") {
    return o.object as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.CHILD_OBJECT) return o;
  return null;
}

function readStringField(
  doc: Record<string, unknown>,
  field: string,
  max: number
): string | Response {
  const value = doc[field];
  if (typeof value !== "string" || !value.trim()) {
    return errorResponse("MALFORMED_REQUEST", `${field} is required.`, 422);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    return errorResponse("MALFORMED_REQUEST", `${field} is too long.`, 422);
  }
  return trimmed;
}

function statusFromDoc(doc: Record<string, unknown>): ChildObjectStatus | Response {
  const status = doc.status;
  if (typeof status !== "string" || !CHILD_OBJECT_STATUSES.has(status as ChildObjectStatus)) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "status must be active, disabled, revoked, or replaced.",
      422
    );
  }
  return status as ChildObjectStatus;
}

async function verifiedChildObjectDoc(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  route: DelegatedChildObjectRoute,
  pathObjectId?: string
): Promise<
  | {
      ok: true;
      doc: Record<string, unknown>;
      parent: ChildObjectParentRow;
      objectId: string;
      objectType: string;
      publicLabel: string;
      publicState: string;
      status: ChildObjectStatus;
      createdAt: string;
      updatedAt: string;
    }
  | { ok: false; response: Response }
> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return {
      ok: false,
      response: errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400),
    };
  }
  if (pathObjectId && !CHILD_OBJECT_ID_REGEX.test(pathObjectId)) {
    return {
      ok: false,
      response: errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 400),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400) };
  }

  const doc = parseChildObjectBody(body);
  if (!doc) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "Body must include signed `object`.", 400),
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

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.CHILD_OBJECT,
  });
  if (!verify.ok) {
    return { ok: false, response: errorResponse(verify.code, verify.message, 401) };
  }

  const parentProfileId = doc.parent_profile_id;
  if (parentProfileId !== pathProfileId) {
    return {
      ok: false,
      response: errorResponse("PROFILE_MISMATCH", "parent_profile_id must match URL.", 422),
    };
  }

  const objectIdRaw = readStringField(doc, "object_id", 80);
  if (objectIdRaw instanceof Response) return { ok: false, response: objectIdRaw };
  if (!CHILD_OBJECT_ID_REGEX.test(objectIdRaw)) {
    return {
      ok: false,
      response: errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 422),
    };
  }
  if (pathObjectId && objectIdRaw !== pathObjectId) {
    return {
      ok: false,
      response: errorResponse("OBJECT_MISMATCH", "object_id must match URL.", 422),
    };
  }

  const auth = await authorizeDelegatedChildRoute(
    db,
    pathProfileId,
    parent,
    verify.signature.public_key,
    route,
    { objectId: objectIdRaw }
  );
  if (!auth.ok) {
    return {
      ok: false,
      response: errorResponse(auth.code, auth.message, auth.httpStatus),
    };
  }

  const objectType = readStringField(doc, "object_type", 40);
  if (objectType instanceof Response) return { ok: false, response: objectType };
  if (!OBJECT_TYPE_RE.test(objectType)) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "Invalid object_type.", 422),
    };
  }

  const publicLabel = readStringField(doc, "public_label", 120);
  if (publicLabel instanceof Response) return { ok: false, response: publicLabel };
  const publicState = readStringField(doc, "public_state", 280);
  if (publicState instanceof Response) return { ok: false, response: publicState };
  const status = statusFromDoc(doc);
  if (status instanceof Response) return { ok: false, response: status };

  const createdAt = readStringField(doc, "created_at", 40);
  if (createdAt instanceof Response) return { ok: false, response: createdAt };
  const updatedAt = readStringField(doc, "updated_at", 40);
  if (updatedAt instanceof Response) return { ok: false, response: updatedAt };
  if (updatedAt < createdAt) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "updated_at must not precede created_at.", 422),
    };
  }

  try {
    validateTimePolicyForChildDocument(doc, objectType);
    validateCustodyForChildDocument(doc, objectType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid child object document.";
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", msg, 422),
    };
  }

  if (objectType === GAME_NODE_OBJECT_TYPE) {
    const seasonForDistricts = resolveSeasonForProfile(pathProfileId);
    try {
      validateGameNodeDocument(doc, {
        allowedDistricts: seasonForDistricts?.districts?.length
          ? seasonForDistricts.districts
          : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid game_node document.";
      return {
        ok: false,
        response: errorResponse("MALFORMED_REQUEST", msg, 422),
      };
    }
  }

  return {
    ok: true,
    doc,
    parent,
    objectId: objectIdRaw,
    objectType,
    publicLabel,
    publicState,
    status,
    createdAt,
    updatedAt,
  };
}

function responseForObject(input: {
  profileId: string;
  objectId: string;
  objectType: string;
  publicLabel: string;
  publicState: string;
  status: ChildObjectStatus;
  updatedAt: string;
}, status = 200): Response {
  return jsonResponse(
    {
      profile_id: input.profileId,
      object_id: input.objectId,
      object_type: input.objectType,
      public_label: input.publicLabel,
      public_state: input.publicState,
      status: input.status,
      updated_at: input.updatedAt,
    },
    status,
    { "Cache-Control": "no-store" }
  );
}

export async function handlePostChildObjectCreate(
  request: Request,
  db: D1Database,
  pathProfileId: string
): Promise<Response> {
  const parsed = await verifiedChildObjectDoc(
    request,
    db,
    pathProfileId,
    "child_object.create"
  );
  if (!parsed.ok) return parsed.response;
  if (parsed.status !== "active") {
    return errorResponse("MALFORMED_REQUEST", "New child objects must start active.", 422);
  }
  const existing = await getChildObject(db, parsed.objectId);
  if (existing) {
    return errorResponse("OBJECT_EXISTS", "Child object already exists.", 409);
  }

  if (parsed.objectType === GAME_NODE_OBJECT_TYPE) {
    const season = resolveSeasonForProfile(pathProfileId);
    if (season) {
      const siblings = await listChildObjectsForParent(db, pathProfileId);
      const activeGameNodes = siblings.filter(
        (row) => row.object_type === GAME_NODE_OBJECT_TYPE && row.status === "active"
      ).length;
      const nodeCapResponse = await enforceGameNodeCap(db, season, activeGameNodes);
      if (nodeCapResponse) return nodeCapResponse;
    }
  }

  try {
    await insertChildObject(db, {
      objectId: parsed.objectId,
      parentProfileId: pathProfileId,
      objectType: parsed.objectType,
      publicLabel: parsed.publicLabel,
      publicState: parsed.publicState,
      status: parsed.status,
      documentJson: JSON.stringify(parsed.doc),
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }
  return responseForObject({ profileId: pathProfileId, ...parsed }, 201);
}

export async function handlePostChildObjectUpdate(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathObjectId: string
): Promise<Response> {
  const parsed = await verifiedChildObjectDoc(
    request,
    db,
    pathProfileId,
    "child_object.update",
    pathObjectId
  );
  if (!parsed.ok) return parsed.response;
  const existing = await getChildObject(db, pathObjectId);
  if (!existing || existing.parent_profile_id !== pathProfileId) {
    return errorResponse("NOT_FOUND", "Child object not found.", 404);
  }
  if (existing.status !== "active") {
    return errorResponse("OBJECT_NOT_ACTIVE", "Child object is not active.", 409);
  }
  if (parsed.status !== "active") {
    return errorResponse("MALFORMED_REQUEST", "Use the revoke endpoint to disable an object.", 422);
  }
  if (parsed.createdAt !== existing.created_at) {
    return errorResponse("MALFORMED_REQUEST", "created_at must match existing object.", 422);
  }
  if (parsed.updatedAt <= existing.updated_at) {
    return errorResponse("MALFORMED_REQUEST", "updated_at must be newer.", 422);
  }
  try {
    await updateChildObject(db, {
      objectId: parsed.objectId,
      parentProfileId: pathProfileId,
      objectType: parsed.objectType,
      publicLabel: parsed.publicLabel,
      publicState: parsed.publicState,
      status: parsed.status,
      documentJson: JSON.stringify(parsed.doc),
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }
  return responseForObject({ profileId: pathProfileId, ...parsed });
}

export async function handlePostChildObjectRevoke(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathObjectId: string
): Promise<Response> {
  const parsed = await verifiedChildObjectDoc(
    request,
    db,
    pathProfileId,
    "child_object.revoke",
    pathObjectId
  );
  if (!parsed.ok) return parsed.response;
  const existing = await getChildObject(db, pathObjectId);
  if (!existing || existing.parent_profile_id !== pathProfileId) {
    return errorResponse("NOT_FOUND", "Child object not found.", 404);
  }
  if (existing.status !== "active") {
    return errorResponse("OBJECT_NOT_ACTIVE", "Child object is not active.", 409);
  }
  if (parsed.status !== "disabled" && parsed.status !== "revoked") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Revoke endpoint requires status disabled or revoked.",
      422
    );
  }
  if (parsed.createdAt !== existing.created_at) {
    return errorResponse("MALFORMED_REQUEST", "created_at must match existing object.", 422);
  }
  if (parsed.updatedAt <= existing.updated_at) {
    return errorResponse("MALFORMED_REQUEST", "updated_at must be newer.", 422);
  }
  try {
    await updateChildObject(db, {
      objectId: parsed.objectId,
      parentProfileId: pathProfileId,
      objectType: parsed.objectType,
      publicLabel: parsed.publicLabel,
      publicState: parsed.publicState,
      status: parsed.status,
      documentJson: JSON.stringify(parsed.doc),
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }
  return responseForObject({ profileId: pathProfileId, ...parsed });
}

function phaseAChildDocumentFields(documentJson: string | null | undefined): {
  time_policy: ReturnType<typeof parseObjectTimePolicy>;
  custody: ReturnType<typeof parseObjectCustody>;
} {
  if (!documentJson?.trim()) {
    return { time_policy: null, custody: null };
  }
  try {
    const doc = JSON.parse(documentJson) as Record<string, unknown>;
    return {
      time_policy: parseObjectTimePolicy(doc),
      custody: parseObjectCustody(doc),
    };
  } catch {
    return { time_policy: null, custody: null };
  }
}

export async function handleGetChildObjects(
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

  const [rows, activeQrs] = await Promise.all([
    listChildObjectsForParent(db, pathProfileId),
    listActiveChildObjectQrsForParent(db, pathProfileId),
  ]);
  const qrByObjectId = new Map(activeQrs.map((row) => [row.object_id, row.qr_id]));

  return jsonResponse(
    {
      profile_id: pathProfileId,
      objects: rows.map((row) => {
        const base = {
          object_id: row.object_id,
          object_type: row.object_type,
          public_label: row.public_label,
          public_state: row.public_state,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          active_qr_id: qrByObjectId.get(row.object_id) ?? null,
        };
        if (row.object_type !== GAME_NODE_OBJECT_TYPE) {
          if (
            row.object_type === CHILD_OBJECT_TYPE_STATUS_PLATE ||
            row.object_type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY
          ) {
            const phaseA = phaseAChildDocumentFields(row.child_object_document_json);
            return {
              ...base,
              ...(phaseA.time_policy ? { time_policy: phaseA.time_policy } : {}),
              ...(phaseA.custody ? { custody: phaseA.custody } : {}),
            };
          }
          return base;
        }
        const game = parseGameNodeFields(row.child_object_document_json);
        if (!game) return base;
        return {
          ...base,
          season_id: game.seasonId,
          node_role: game.nodeRole,
          district: game.district,
          object_streams: game.objectStreams,
          game_meta: game.gameMeta,
        };
      }),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

