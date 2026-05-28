import {
  CRYPTO_ERROR,
  isSignatureBlock,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getCardForUpdate } from "../db/card-update";
import { applyQrExtend, getActiveQrCredential } from "../db/qr-extend";
import { getActiveCardScopeQr } from "../db/qr-rotation";
import { getCardOwner } from "../db/revoke";
import { errorResponse, jsonResponse, requestOrigin } from "../http/resolver";
import { QR_ID_REGEX } from "./scan-state";

function parseExtendBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (!o.qr_credential || typeof o.qr_credential !== "object") return null;
  return o.qr_credential as Record<string, unknown>;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function expectedQrOrigin(request: Request, payload: unknown): string {
  const origin = requestOrigin(request);
  const requestOriginHeader = request.headers.get("Origin") ?? "";
  if (isLocalOrigin(requestOriginHeader) && typeof payload === "string") {
    try {
      const payloadUrl = new URL(payload);
      if (isLocalOrigin(payloadUrl.origin)) return payloadUrl.origin;
    } catch {
      /* fall through */
    }
  }
  return origin;
}

function expectedPayload(origin: string, profileId: string, qrId: string): string {
  return `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

function resolveExtendSigner(
  signerKey: string,
  row: { public_key: string; recovery_public_key: string | null }
): boolean {
  if (signerKey === row.public_key) return true;
  if (row.recovery_public_key && signerKey === row.recovery_public_key) {
    return true;
  }
  return false;
}

/**
 * POST /.well-known/hc/v1/cards/{profile_id}/qr/extend
 * Body: { qr_credential } - extends active card-scoped QR expiry (M4.6).
 */
export async function handlePostExtendQr(
  request: Request,
  db: D1Database,
  pathProfileId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const qr = parseExtendBody(body);
  if (!qr) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `qr_credential` object.",
      400
    );
  }

  const existingCard = await getCardForUpdate(db, pathProfileId);
  if (!existingCard) {
    return errorResponse("NOT_FOUND", "Card not found.", 404);
  }
  if (existingCard.status !== "active") {
    if (existingCard.status === "suspended") {
      return errorResponse(
        "CARD_SUSPENDED",
        "Cannot extend QR on a suspended card.",
        410
      );
    }
    return errorResponse(
      "CARD_REVOKED",
      "Cannot extend QR on a revoked or disabled card.",
      410
    );
  }

  const qrVerify = await verifySignedDocument(qr, {
    expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
  });
  if (!qrVerify.ok) {
    return errorResponse(qrVerify.code, qrVerify.message, 401);
  }

  const signerKey = qrVerify.signature.public_key;
  if (!resolveExtendSigner(signerKey, existingCard)) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Extension must be signed by the card owner or recovery key.",
      401
    );
  }

  const profileId = qr.profile_id as string;
  const qrId = qr.qr_id as string;
  if (profileId !== pathProfileId) {
    return errorResponse("MALFORMED_REQUEST", "profile_id must match URL.", 422);
  }
  if (!QR_ID_REGEX.test(qrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid qr_id.", 422);
  }

  const activeCardQr = await getActiveCardScopeQr(db, profileId);
  if (!activeCardQr || activeCardQr.qr_id !== qrId) {
    return errorResponse(
      "QR_NOT_ACTIVE",
      "Only the active card-scoped QR can be extended.",
      422
    );
  }

  const stored = await getActiveQrCredential(db, profileId, qrId);
  if (!stored) {
    return errorResponse("NOT_FOUND", "Active QR credential not found.", 404);
  }

  if (qr.scope !== "card" || qr.status !== "active") {
    return errorResponse("INVALID_QR_STATUS", "QR must remain scope card and status active.", 422);
  }
  if (qr.epoch !== stored.epoch) {
    return errorResponse("INVALID_QR_EPOCH", "QR epoch cannot change on extension.", 422);
  }

  const expectedPayloadUrl = expectedPayload(
    expectedQrOrigin(request, qr.payload),
    profileId,
    qrId
  );
  if (qr.payload !== expectedPayloadUrl || qr.payload !== stored.payload) {
    return errorResponse(
      "INVALID_QR_PAYLOAD",
      `QR payload must match the stored scan URL (${stored.payload}).`,
      422
    );
  }

  const qrSig = qr.signature;
  if (!isSignatureBlock(qrSig) || qrSig.public_key !== existingCard.public_key) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "QR credential must be signed by the card owner key.",
      422
    );
  }

  const newExpiresAt = qr.expires_at as string;
  if (typeof newExpiresAt !== "string" || !newExpiresAt) {
    return errorResponse("INVALID_QR_EXPIRY", "expires_at is required.", 422);
  }

  const nowIso = new Date().toISOString();
  if (newExpiresAt <= nowIso) {
    return errorResponse(
      "INVALID_QR_EXPIRY",
      "expires_at must be in the future.",
      422
    );
  }
  if (stored.expires_at && newExpiresAt <= stored.expires_at) {
    return errorResponse(
      "INVALID_QR_EXPIRY",
      "expires_at must be later than the current expiry.",
      422
    );
  }

  if ((qr.issued_at as string) !== stored.issued_at) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "issued_at cannot change on extension.",
      422
    );
  }

  const owner = await getCardOwner(db, profileId);
  if (owner?.status === "revoked") {
    return errorResponse("CARD_REVOKED", "Card is disabled.", 410);
  }

  const updatedAt = new Date().toISOString();
  try {
    await applyQrExtend(
      db,
      profileId,
      qrId,
      newExpiresAt,
      JSON.stringify(qr),
      updatedAt
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }

  return jsonResponse(
    {
      profile_id: profileId,
      qr_id: qrId,
      qr_expires_at: newExpiresAt,
      previous_expires_at: stored.expires_at,
      status: "active",
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
