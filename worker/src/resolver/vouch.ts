import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import {
  activeVouchCountSince,
  activeVouchPairExists,
  getVerificationSummary,
  getVouchById,
  getVouchCardOwner,
  insertVouch,
  recalculateVouchSummary,
  revokeVouch,
  VOUCHER_ACTIVE_QUOTA_PER_YEAR,
  VOUCHER_WAIT_DAYS,
  vouchNonceUsed,
} from "../db/verification";
import { errorResponse, jsonResponse } from "../http/resolver";
import { VOUCH_METHODS, type VouchMethod } from "../db/types";

const VOUCH_ID_REGEX =
  /^vouch_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyzA-Za-z0-9_]{3,80}$/;
const MAX_STATEMENT_LENGTH = 280;

function parseVouchBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.vouch && typeof o.vouch === "object") {
    return o.vouch as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.VOUCH) {
    return o;
  }
  return null;
}

function parseVouchRevokeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.revocation && typeof o.revocation === "object") {
    return o.revocation as Record<string, unknown>;
  }
  return parseVouchBody(body);
}

function isVouchMethod(value: unknown): value is VouchMethod {
  return (
    typeof value === "string" &&
    (VOUCH_METHODS as readonly string[]).includes(value)
  );
}

function minusDaysIso(anchorIso: string, days: number): string {
  const t = Date.parse(anchorIso);
  const anchor = Number.isFinite(t) ? t : Date.now();
  return new Date(anchor - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * POST /v1/verification/vouches
 * Body: { "vouch": <signed vouch document> } (M6.1–M6.3)
 */
export async function handlePostVouch(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const doc = parseVouchBody(body);
  if (!doc) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `vouch` object.",
      400
    );
  }

  if ("private_note" in doc) {
    return errorResponse(
      "PRIVATE_NOTE_NOT_ALLOWED",
      "Public vouch records must not include private notes.",
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
  if (voucherProfileId === voucheeProfileId) {
    return errorResponse("SELF_VOUCH_NOT_ALLOWED", "A card cannot vouch for itself.", 422);
  }

  const vouchId = doc.vouch_id;
  if (typeof vouchId !== "string" || !VOUCH_ID_REGEX.test(vouchId)) {
    return errorResponse("INVALID_VOUCH_ID", "Invalid vouch_id.", 422);
  }

  const nonce = doc.nonce;
  if (typeof nonce !== "string" || !nonce) {
    return errorResponse("MALFORMED_REQUEST", "Vouch must include nonce.", 422);
  }
  if (await vouchNonceUsed(db, nonce)) {
    return errorResponse(CRYPTO_ERROR.REPLAYED_NONCE, "Vouch nonce already used.", 409);
  }

  const statement = doc.statement;
  if (
    typeof statement !== "string" ||
    !statement.trim() ||
    statement.length > MAX_STATEMENT_LENGTH
  ) {
    return errorResponse(
      "INVALID_VOUCH_STATEMENT",
      "Vouch statement must be 1–280 characters.",
      422
    );
  }

  const method = doc.method;
  if (!isVouchMethod(method)) {
    return errorResponse("INVALID_VOUCH_METHOD", "Unsupported vouch method.", 422);
  }

  const createdAt = doc.created_at;
  if (typeof createdAt !== "string" || !createdAt) {
    return errorResponse("MALFORMED_REQUEST", "Vouch must include created_at.", 422);
  }

  const voucher = await getVouchCardOwner(db, voucherProfileId);
  if (!voucher) {
    return errorResponse("VOUCHER_NOT_FOUND", "Voucher card not found.", 404);
  }
  if (voucher.status !== "active") {
    return errorResponse("VOUCHER_INACTIVE", "Voucher card is not active.", 409);
  }

  const vouchee = await getVouchCardOwner(db, voucheeProfileId);
  if (!vouchee) {
    return errorResponse("VOUCHEE_NOT_FOUND", "Vouchee card not found.", 404);
  }
  if (vouchee.status !== "active") {
    return errorResponse("VOUCHEE_INACTIVE", "Vouchee card is not active.", 409);
  }

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.VOUCH,
    expectedPublicKeyBase58: voucher.public_key,
  });
  if (!verify.ok) {
    return errorResponse(verify.code, verify.message, 401);
  }

  const summary = await getVerificationSummary(db, voucherProfileId);
  if (!summary || !["verified_human", "steward"].includes(summary.state)) {
    return errorResponse(
      "VOUCHER_NOT_VERIFIED",
      "Voucher must already be a verified human or steward.",
      403
    );
  }

  const eligibleSince = minusDaysIso(createdAt, VOUCHER_WAIT_DAYS);
  if (summary.updated_at > eligibleSince) {
    return errorResponse(
      "VOUCHER_TOO_NEW",
      `Voucher must wait ${VOUCHER_WAIT_DAYS} days after verification before vouching.`,
      403
    );
  }

  if (await activeVouchPairExists(db, voucherProfileId, voucheeProfileId)) {
    return errorResponse(
      "VOUCH_ALREADY_ACTIVE",
      "Voucher already has an active vouch for this card.",
      409
    );
  }

  const quotaSince = minusDaysIso(createdAt, 365);
  const activeIssued = await activeVouchCountSince(db, voucherProfileId, quotaSince);
  if (activeIssued >= VOUCHER_ACTIVE_QUOTA_PER_YEAR) {
    return errorResponse(
      "VOUCH_QUOTA_EXCEEDED",
      `Voucher has reached ${VOUCHER_ACTIVE_QUOTA_PER_YEAR} active vouches this year.`,
      403
    );
  }

  try {
    await insertVouch(db, {
      vouchId,
      voucherProfileId,
      voucheeProfileId,
      nonce,
      statement,
      method,
      signedDocumentJson: JSON.stringify(doc),
      issuerPublicKey: verify.signature.public_key,
      createdAt,
    });
    const updated = await recalculateVouchSummary(db, voucheeProfileId, createdAt);
    return jsonResponse(
      {
        vouch_id: vouchId,
        voucher_profile_id: voucherProfileId,
        vouchee_profile_id: voucheeProfileId,
        status: "active",
        created_at: createdAt,
        verification: {
          state: updated.state,
          label: updated.label,
          method: updated.method,
          vouch_count: updated.vouch_count,
          latest_accepted_vouch_at: updated.latest_accepted_vouch_at,
        },
      },
      201
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return errorResponse("VOUCH_ALREADY_EXISTS", "Vouch already recorded.", 409);
    }
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }
}

/**
 * POST /v1/verification/vouches/{vouch_id}/revoke
 * Body: { "revocation": <signed vouch document with revoked: true> } (M6.4)
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
      "Body must include signed `revocation` vouch object.",
      400
    );
  }

  if (doc.vouch_id !== pathVouchId) {
    return errorResponse(
      "VOUCH_MISMATCH",
      "Revocation vouch_id must match URL.",
      422
    );
  }
  if (doc.revoked !== true) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Vouch revocation must set revoked to true.",
      422
    );
  }

  const existing = await getVouchById(db, pathVouchId);
  if (!existing) {
    return errorResponse("NOT_FOUND", "Vouch not found.", 404);
  }
  if (existing.status === "revoked") {
    return errorResponse("ALREADY_REVOKED", "Vouch is already revoked.", 409);
  }

  const nonce = doc.nonce;
  if (typeof nonce !== "string" || !nonce) {
    return errorResponse("MALFORMED_REQUEST", "Vouch revocation must include nonce.", 422);
  }
  if (nonce === existing.nonce || (await vouchNonceUsed(db, nonce))) {
    return errorResponse(CRYPTO_ERROR.REPLAYED_NONCE, "Vouch nonce already used.", 409);
  }

  if (
    doc.voucher_profile_id !== existing.voucher_profile_id ||
    doc.vouchee_profile_id !== existing.vouchee_profile_id
  ) {
    return errorResponse(
      "VOUCH_MISMATCH",
      "Revocation voucher and vouchee must match the active vouch.",
      422
    );
  }

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.VOUCH,
    expectedPublicKeyBase58: existing.issuer_public_key,
  });
  if (!verify.ok) {
    return errorResponse(verify.code, verify.message, 401);
  }

  const revokedAt =
    typeof doc.revoked_at === "string" && doc.revoked_at
      ? doc.revoked_at
      : typeof doc.created_at === "string" && doc.created_at
        ? doc.created_at
        : new Date().toISOString();

  try {
    await revokeVouch(db, {
      vouchId: pathVouchId,
      revokedAt,
      revocationNonce: nonce,
      revocationDocumentJson: JSON.stringify(doc),
    });
    const updated = await recalculateVouchSummary(
      db,
      existing.vouchee_profile_id,
      revokedAt
    );
    return jsonResponse(
      {
        vouch_id: pathVouchId,
        voucher_profile_id: existing.voucher_profile_id,
        vouchee_profile_id: existing.vouchee_profile_id,
        status: "revoked",
        revoked_at: revokedAt,
        verification: {
          state: updated.state,
          label: updated.label,
          method: updated.method,
          vouch_count: updated.vouch_count,
          latest_accepted_vouch_at: updated.latest_accepted_vouch_at,
        },
      },
      200
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }
}
