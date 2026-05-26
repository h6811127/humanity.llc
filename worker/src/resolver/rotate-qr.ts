import {
  CRYPTO_ERROR,
  isSignatureBlock,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { QR_ID_REGEX } from "./scan-state";
import { getCardForUpdate } from "../db/card-update";
import {
  applyQrRotation,
  getActiveCardScopeQr,
  getMaxCardScopeEpoch,
} from "../db/qr-rotation";
import { getCardOwner } from "../db/revoke";
import { errorResponse, jsonResponse, requestOrigin } from "../http/resolver";
import { validateManifestoLine } from "../validation/manifesto";

function parseRotateBody(body: unknown): {
  card: Record<string, unknown>;
  qr_credential: Record<string, unknown>;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (!o.card || typeof o.card !== "object") return null;
  if (!o.qr_credential || typeof o.qr_credential !== "object") return null;
  return {
    card: o.card as Record<string, unknown>,
    qr_credential: o.qr_credential as Record<string, unknown>,
  };
}

function qrPayload(origin: string, profileId: string, qrId: string): string {
  return `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
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

function resolveRotateSigner(
  signerKey: string,
  row: { public_key: string; recovery_public_key: string | null }
): boolean {
  if (signerKey === row.public_key) return true;
  if (row.recovery_public_key && signerKey === row.recovery_public_key) {
    return true;
  }
  return false;
}

function defaultQrExpiry(issuedAt: string): string {
  const d = new Date(issuedAt);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

/**
 * POST /.well-known/hc/v1/cards/{profile_id}/qr
 * Body: { card, qr_credential } - rotates card-scoped QR (A.6).
 */
export async function handlePostRotateQr(
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

  const parsed = parseRotateBody(body);
  if (!parsed) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `card` and `qr_credential` objects.",
      400
    );
  }

  const existing = await getCardForUpdate(db, pathProfileId);
  if (!existing) {
    return errorResponse("NOT_FOUND", "Card not found.", 404);
  }
  if (existing.status !== "active") {
    if (existing.status === "suspended") {
      return errorResponse(
        "CARD_SUSPENDED",
        "Cannot rotate QR on a suspended card.",
        410
      );
    }
    return errorResponse(
      "CARD_REVOKED",
      "Cannot rotate QR on a revoked or disabled card.",
      410
    );
  }

  const cardVerify = await verifySignedDocument(parsed.card, {
    expectedType: PAYLOAD_TYPES.HUMANITY_CARD,
  });
  if (!cardVerify.ok) {
    return errorResponse(cardVerify.code, cardVerify.message, 401);
  }

  const qrVerify = await verifySignedDocument(parsed.qr_credential, {
    expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
  });
  if (!qrVerify.ok) {
    return errorResponse(qrVerify.code, qrVerify.message, 401);
  }

  const signerKey = cardVerify.signature.public_key;
  if (!resolveRotateSigner(signerKey, existing)) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Rotation must be signed by the card owner or recovery key.",
      401
    );
  }

  const card = parsed.card;
  const qr = parsed.qr_credential;
  const profileId = card.profile_id as string;
  const publicKey = card.public_key as string;

  if (profileId !== pathProfileId) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "profile_id must match URL.",
      422
    );
  }
  if (publicKey !== existing.public_key) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "public_key cannot change on rotation.",
      422
    );
  }
  if ((card.handle as string) !== existing.handle) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "handle cannot change on rotation.",
      422
    );
  }
  if ((card.created_at as string) !== existing.created_at) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "created_at must match the original card.",
      422
    );
  }
  const updatedAt = card.updated_at as string;
  if (typeof updatedAt !== "string" || updatedAt <= existing.updated_at) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "updated_at must be newer than the stored card.",
      422
    );
  }
  if (card.status !== "active") {
    return errorResponse("INVALID_CARD_STATUS", "Card must remain active.", 422);
  }

  const cardSig = card.signature;
  if (!isSignatureBlock(cardSig) || cardSig.public_key !== publicKey) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Card public_key must match signature.public_key.",
      422
    );
  }

  const newQrId = qr.qr_id as string;
  if (!QR_ID_REGEX.test(newQrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid qr_id.", 422);
  }

  const cardQr = card.qr as Record<string, unknown> | undefined;
  const activeQrId = cardQr?.active_qr_id;
  if (activeQrId !== newQrId) {
    return errorResponse(
      "QR_MISMATCH",
      "Card qr.active_qr_id must match qr_credential.qr_id.",
      422
    );
  }

  const newEpoch = qr.epoch as number;
  if (!Number.isInteger(newEpoch) || newEpoch < 1) {
    return errorResponse("INVALID_QR_EPOCH", "QR epoch must be a positive integer.", 422);
  }

  const activeRow = await getActiveCardScopeQr(db, profileId);
  const maxEpoch = await getMaxCardScopeEpoch(db, profileId);
  const expectedEpoch = (activeRow?.epoch ?? maxEpoch) + 1;
  if (newEpoch !== expectedEpoch) {
    return errorResponse(
      "INVALID_QR_EPOCH",
      `QR epoch must be ${expectedEpoch} for the next rotation.`,
      422
    );
  }

  if (activeRow && activeRow.qr_id === newQrId) {
    return errorResponse(
      "ALREADY_ACTIVE",
      "This QR credential is already the active card QR.",
      409
    );
  }

  if (qr.profile_id !== profileId) {
    return errorResponse("PROFILE_MISMATCH", "QR profile_id mismatch.", 422);
  }
  if (qr.scope !== "card") {
    return errorResponse("INVALID_QR_SCOPE", "Rotated QR must have scope card.", 422);
  }
  if (qr.status !== "active") {
    return errorResponse("INVALID_QR_STATUS", "New QR must have status active.", 422);
  }
  if (qr.epoch !== newEpoch) {
    return errorResponse("INVALID_QR_EPOCH", "QR credential epoch must match card qr.epoch.", 422);
  }

  const qrSig = qr.signature;
  if (!isSignatureBlock(qrSig) || qrSig.public_key !== publicKey) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "QR credential must be signed by the card owner key.",
      422
    );
  }

  const expectedPayload = qrPayload(
    expectedQrOrigin(request, qr.payload),
    profileId,
    newQrId
  );
  if (qr.payload !== expectedPayload) {
    return errorResponse(
      "INVALID_QR_PAYLOAD",
      `QR payload must be ${expectedPayload}`,
      422
    );
  }

  let manifestoLine: string;
  try {
    manifestoLine = validateManifestoLine(card.manifesto_line as string);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid manifesto_line.";
    return errorResponse("MALFORMED_REQUEST", msg, 422);
  }

  const issuedAt = qr.issued_at as string;
  const expiresAt =
    (typeof qr.expires_at === "string" && qr.expires_at) ||
    defaultQrExpiry(issuedAt);

  const owner = await getCardOwner(db, profileId);
  if (owner?.status === "revoked") {
    return errorResponse("CARD_REVOKED", "Card is disabled.", 410);
  }

  try {
    await applyQrRotation(db, {
      profileId,
      manifestoLine,
      cardDocumentJson: JSON.stringify(card),
      updatedAt,
      previousQrId: activeRow?.qr_id ?? null,
      newQr: {
        qrId: newQrId,
        epoch: newEpoch,
        payload: expectedPayload,
        issuedAt,
        expiresAt,
        credentialDocumentJson: JSON.stringify(qr),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return errorResponse(
        "QR_EXISTS",
        "QR id already exists or another active card QR is present.",
        409
      );
    }
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }

  return jsonResponse(
    {
      profile_id: profileId,
      qr_id: newQrId,
      replaced_qr_id: activeRow?.qr_id ?? null,
      epoch: newEpoch,
      scan_url: expectedPayload,
      qr_expires_at: expiresAt,
      status: "active",
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
