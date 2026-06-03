import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import { validateGameNodeDocument } from "../city-game/game-meta";
import { resolveSeasonForProfile } from "../city-game/season-loader";
import {
  enforceGameUpdateSeasonQuota,
  recordGameUpdateSeasonUsage,
} from "../city-game/season-quota";
import { applyUnlockSideEffects, seasonNodeIdFromObjectId } from "../city-game/unlock-evaluator";
import { getChildObject, updateChildObject } from "../db/child-objects";
import { errorResponse, jsonResponse } from "../http/resolver";
import { CHILD_OBJECT_ID_REGEX } from "./child-objects";

type GameUpdateParentRow = {
  public_key: string;
  recovery_public_key: string | null;
  issuer_public_key: string | null;
  status: string;
};

type GameUpdateSignerRole = "owner" | "game_operator";

function parseChildObjectBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.object && typeof o.object === "object") {
    return o.object as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.CHILD_OBJECT) return o;
  return null;
}

function resolveGameUpdateSigner(
  signerKey: string,
  parent: GameUpdateParentRow
): GameUpdateSignerRole | null {
  if (signerKey === parent.public_key) return "owner";
  if (parent.recovery_public_key && signerKey === parent.recovery_public_key) {
    return "owner";
  }
  if (parent.issuer_public_key && signerKey === parent.issuer_public_key) {
    return "game_operator";
  }
  return null;
}

async function getGameUpdateParent(
  db: D1Database,
  profileId: string
): Promise<GameUpdateParentRow | null> {
  return db
    .prepare(
      `SELECT public_key, recovery_public_key, issuer_public_key, status
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<GameUpdateParentRow>();
}

export async function handlePostGameUpdate(
  request: Request,
  db: D1Database,
  env: { CITY_GAME_ENABLED?: string },
  pathProfileId: string,
  pathObjectId: string
): Promise<Response> {
  if (!isCityGameEnabled(env)) {
    return errorResponse("NOT_AVAILABLE", "City game endpoints are not enabled.", 404);
  }

  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  if (!CHILD_OBJECT_ID_REGEX.test(pathObjectId)) {
    return errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const doc = parseChildObjectBody(body);
  if (!doc) {
    return errorResponse("MALFORMED_REQUEST", "Body must include signed `object`.", 400);
  }

  const parent = await getGameUpdateParent(db, pathProfileId);
  if (!parent) {
    return errorResponse("NOT_FOUND", "Parent card not found.", 404);
  }
  if (parent.status !== "active") {
    return errorResponse("CARD_NOT_ACTIVE", "Parent card is not active.", 410);
  }

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.CHILD_OBJECT,
  });
  if (!verify.ok) {
    return errorResponse(verify.code, verify.message, 401);
  }

  const signerRole = resolveGameUpdateSigner(verify.signature.public_key, parent);
  if (!signerRole) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Game update must be signed by the root owner, recovery key, or registered game-operator key.",
      401
    );
  }

  if (doc.parent_profile_id !== pathProfileId) {
    return errorResponse("PROFILE_MISMATCH", "parent_profile_id must match URL.", 422);
  }

  const objectId =
    typeof doc.object_id === "string" && doc.object_id.trim() ? doc.object_id.trim() : "";
  if (!CHILD_OBJECT_ID_REGEX.test(objectId) || objectId !== pathObjectId) {
    return errorResponse("OBJECT_MISMATCH", "object_id must match URL.", 422);
  }

  if (doc.object_type !== GAME_NODE_OBJECT_TYPE) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "game-update applies only to game_node child objects.",
      422
    );
  }

  const existing = await getChildObject(db, pathObjectId);
  if (!existing || existing.parent_profile_id !== pathProfileId) {
    return errorResponse("NOT_FOUND", "Child object not found.", 404);
  }
  if (existing.object_type !== GAME_NODE_OBJECT_TYPE) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "game-update applies only to game_node child objects.",
      422
    );
  }
  if (existing.status !== "active") {
    return errorResponse("OBJECT_NOT_ACTIVE", "Child object is not active.", 409);
  }

  const status = doc.status;
  if (status !== "active") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Use the revoke endpoint to disable a game node.",
      422
    );
  }

  const createdAt = typeof doc.created_at === "string" ? doc.created_at.trim() : "";
  const updatedAt = typeof doc.updated_at === "string" ? doc.updated_at.trim() : "";
  if (!createdAt || createdAt !== existing.created_at) {
    return errorResponse("MALFORMED_REQUEST", "created_at must match existing object.", 422);
  }
  if (!updatedAt || updatedAt <= existing.updated_at) {
    return errorResponse("MALFORMED_REQUEST", "updated_at must be newer.", 422);
  }

  try {
    validateGameNodeDocument(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid game_node document.";
    return errorResponse("MALFORMED_REQUEST", msg, 422);
  }

  const publicLabel =
    typeof doc.public_label === "string" && doc.public_label.trim()
      ? doc.public_label.trim().slice(0, 120)
      : existing.public_label;
  const publicState =
    typeof doc.public_state === "string" && doc.public_state.trim()
      ? doc.public_state.trim().slice(0, 280)
      : existing.public_state;

  const season = resolveSeasonForProfile(pathProfileId);
  if (!season) {
    return errorResponse("NOT_FOUND", "City game season not found for this profile.", 404);
  }

  const updateQuota = await enforceGameUpdateSeasonQuota(db, season);
  if (updateQuota) return updateQuota;

  try {
    await updateChildObject(db, {
      objectId: pathObjectId,
      parentProfileId: pathProfileId,
      objectType: GAME_NODE_OBJECT_TYPE,
      publicLabel,
      publicState,
      status: "active",
      documentJson: JSON.stringify(doc),
      createdAt,
      updatedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }

  await recordGameUpdateSeasonUsage(db, season.season_id);

  const nodeId = seasonNodeIdFromObjectId(pathObjectId, season);
  const unlockEffects =
    nodeId != null
      ? await applyUnlockSideEffects(db, nodeId, doc, new Date(updatedAt), season)
      : { unlockedNodes: [] as string[] };

  return jsonResponse(
    {
      profile_id: pathProfileId,
      object_id: pathObjectId,
      object_type: GAME_NODE_OBJECT_TYPE,
      public_label: publicLabel,
      public_state: publicState,
      status: "active",
      updated_at: updatedAt,
      signer_role: signerRole,
      unlocked_nodes: unlockEffects.unlockedNodes,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
