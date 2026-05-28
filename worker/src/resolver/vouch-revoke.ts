import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import {
  getVouchById,
  getVouchCardOwner,
  recalculateVouchSummary,
  revokeVouch,
  vouchRevocationNonceUsed,
} from "../db/verification";
import { errorResponse, jsonResponse } from "../http/resolver";

const VOUCH_ID_REGEX =
  /^vouch_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyzA-Za-z0-9_]{3,80}$/;

const VOUCH_REVOKE_REASONS = new Set(["voucher_revoked"]);

function parseVouchRevokeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.vouch_revocation && typeof o.vouch_revocation === "object") {
    return o.vouch_revocation as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.VOUCH_REVOCATION) {
    return o;
  }
  return null;
}

/**
 * GET /v1/verification/vouches/{vouch_id}
 * Public vouch metadata (no private notes).
 */
export async function handleGetVouch(
  db: D1Database,
  vouchId: string
): Promise<Response> {
  if (!VOUCH_ID_REGEX.test(vouchId)) {
    return errorResponse("INVALID_VOUCH_ID", "Invalid vouch_id.", 422);
  }
  const row = await getVouchById(db, vouchId);
  if (!row) {
    return errorResponse("VOUCH_NOT_FOUND", "Vouch not found.", 404);
  }
  return jsonResponse(
    {
      vouch_id: row.vouch_id,
      voucher_profile_id: row.voucher_profile_id,
      vouchee_profile_id: row.vouchee_profile_id,
      statement: row.statement,
      method: row.method,
      status: row.status,
      created_at: row.created_at,
      revoked_at: row.revoked_at,
    },
    200
  );
}

/**
 * POST /v1/verification/vouches/{vouch_id}/revoke
 * Body: { "vouch_revocation": <signed document> } (M6 Step 3)
 *
 * Decision (v1): voucher signature only; steward/governance revoke deferred.
 * Payload type `vouch_revocation`  -  not in Technical Standards §10 yet; mirrors card revoke shape.
 */
export async function handlePostVouchRevoke(
  request: Request,
  db: D1Database,
  pathVouchId: string
): Promise<Response> {
  if (!VOUCH_ID_REGEX.test(pathVouchId)) {
    return errorResponse("INVALID_VOUCH_ID", "Invalid vouch_id.", 422);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const doc = parseVouchRevokeBody(body);
  if (!doc) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `vouch_revocation` object.",
      400
    );
  }

  const docVouchId = doc.vouch_id;
  if (typeof docVouchId !== "string" || !VOUCH_ID_REGEX.test(docVouchId)) {
    return errorResponse("INVALID_VOUCH_ID", "Invalid vouch_id in document.", 422);
  }
  if (docVouchId !== pathVouchId) {
    return errorResponse(
      "VOUCH_ID_MISMATCH",
      "Path vouch_id must match signed document.",
      422
    );
  }

  const voucherProfileId = doc.voucher_profile_id;
  const voucheeProfileId = doc.vouchee_profile_id;
  if (
    typeof voucherProfileId !== "string" ||
    !PROFILE_ID_REGEX.test(voucherProfileId)
  ) {
    return errorResponse("INVALID_PROFILE_ID", "Invalid voucher_profile_id.", 422);
  }
  if (
    typeof voucheeProfileId !== "string" ||
    !PROFILE_ID_REGEX.test(voucheeProfileId)
  ) {
    return errorResponse("INVALID_PROFILE_ID", "Invalid vouchee_profile_id.", 422);
  }

  const nonce = doc.nonce;
  if (typeof nonce !== "string" || !nonce) {
    return errorResponse("MALFORMED_REQUEST", "Vouch revocation must include nonce.", 422);
  }
  if (await vouchRevocationNonceUsed(db, nonce)) {
    return errorResponse(CRYPTO_ERROR.REPLAYED_NONCE, "Revocation nonce already used.", 409);
  }

  const revokedAt = doc.revoked_at;
  if (typeof revokedAt !== "string" || !revokedAt) {
    return errorResponse("MALFORMED_REQUEST", "Vouch revocation must include revoked_at.", 422);
  }

  const reason = doc.reason;
  if (typeof reason !== "string" || !VOUCH_REVOKE_REASONS.has(reason)) {
    return errorResponse(
      "INVALID_VOUCH_REVOKE_REASON",
      "Unsupported vouch revocation reason.",
      422
    );
  }

  const existing = await getVouchById(db, pathVouchId);
  if (!existing) {
    return errorResponse("VOUCH_NOT_FOUND", "Vouch not found.", 404);
  }
  if (existing.status === "revoked") {
    return errorResponse("VOUCH_ALREADY_REVOKED", "Vouch is already revoked.", 409);
  }
  if (
    existing.voucher_profile_id !== voucherProfileId ||
    existing.vouchee_profile_id !== voucheeProfileId
  ) {
    return errorResponse(
      "VOUCH_SUBJECT_MISMATCH",
      "Signed revocation does not match stored vouch subjects.",
      422
    );
  }

  const voucher = await getVouchCardOwner(db, voucherProfileId);
  if (!voucher) {
    return errorResponse("VOUCHER_NOT_FOUND", "Voucher card not found.", 404);
  }

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.VOUCH_REVOCATION,
    expectedPublicKeyBase58: voucher.public_key,
  });
  if (!verify.ok) {
    return errorResponse(verify.code, verify.message, 401);
  }

  try {
    const updated = await revokeVouch(db, {
      vouchId: pathVouchId,
      revokedAt,
      revokeNonce: nonce,
      revokeSignedDocumentJson: JSON.stringify(doc),
    });
    if (!updated) {
      return errorResponse("VOUCH_ALREADY_REVOKED", "Vouch is already revoked.", 409);
    }

    const summary = await recalculateVouchSummary(db, voucheeProfileId, revokedAt);
    return jsonResponse(
      {
        vouch_id: pathVouchId,
        voucher_profile_id: voucherProfileId,
        vouchee_profile_id: voucheeProfileId,
        status: "revoked",
        revoked_at: revokedAt,
        verification: {
          state: summary.state,
          label: summary.label,
          method: summary.method,
          vouch_count: summary.vouch_count,
          latest_accepted_vouch_at: summary.latest_accepted_vouch_at,
        },
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return errorResponse(CRYPTO_ERROR.REPLAYED_NONCE, "Revocation nonce already used.", 409);
    }
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }
}
