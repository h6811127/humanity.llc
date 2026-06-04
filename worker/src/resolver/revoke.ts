import {
  applyRevocation,
  getCardOwner,
  getQrCredential,
  revocationNonceUsed,
} from "../db/revoke";
import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { errorResponse, jsonResponse } from "../http/resolver";
import { QR_ID_REGEX } from "./scan-state";
import type { RevocationTargetKind } from "../db/types";
import { REVOCATION_TARGET_KINDS } from "../db/types";
import { parseRevocationDisplayFields } from "./revocation-display";
import { authorizeDelegatedChildRoute } from "./delegated-child-signer";

const OWNER_REASONS = new Set(["owner_revoked"]);
const ORGANIZER_REASONS = new Set(["organizer_revoked"]);

type RevokeSignerRole = "owner" | "organizer";

function resolveRevokeSigner(
  signerKey: string,
  owner: { public_key: string; recovery_public_key: string | null; issuer_public_key: string | null }
): RevokeSignerRole | null {
  if (signerKey === owner.public_key) return "owner";
  if (owner.recovery_public_key && signerKey === owner.recovery_public_key) {
    return "owner";
  }
  if (owner.issuer_public_key && signerKey === owner.issuer_public_key) {
    return "organizer";
  }
  return null;
}

function parseRevokeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.revocation && typeof o.revocation === "object") {
    return o.revocation as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.REVOCATION) {
    return o;
  }
  return null;
}

function isTargetKind(value: unknown): value is RevocationTargetKind {
  return (
    typeof value === "string" &&
    (REVOCATION_TARGET_KINDS as readonly string[]).includes(value)
  );
}

/**
 * POST /.well-known/hc/v1/cards/{profile_id}/revoke
 * Body: { "revocation": <signed document> } (M4.1)
 */
export async function handlePostRevoke(
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

  const doc = parseRevokeBody(body);
  if (!doc) {
    return errorResponse(
      "MALFORMED_REQUEST",
      'Body must include signed `revocation` object.',
      400
    );
  }

  const owner = await getCardOwner(db, pathProfileId);
  if (!owner) {
    return errorResponse("NOT_FOUND", "Card not found.", 404);
  }

  const nonceRaw = doc.nonce;
  if (typeof nonceRaw !== "string" || !nonceRaw) {
    return errorResponse("MALFORMED_REQUEST", "Revocation must include nonce.", 422);
  }
  if (await revocationNonceUsed(db, nonceRaw)) {
    return errorResponse(
      CRYPTO_ERROR.REPLAYED_NONCE,
      "Revocation nonce already used.",
      409
    );
  }

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.REVOCATION,
  });

  if (!verify.ok) {
    const status =
      verify.code === CRYPTO_ERROR.REPLAYED_NONCE ? 409 : 401;
    return errorResponse(verify.code, verify.message, status);
  }

  const unsigned = verify.unsigned;
  const profileId = unsigned.profile_id as string;
  if (profileId !== pathProfileId) {
    return errorResponse(
      "PROFILE_MISMATCH",
      "Revocation profile_id must match URL.",
      422
    );
  }

  const targetKind = unsigned.target_kind;
  if (!isTargetKind(targetKind)) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "target_kind must be card or qr_credential.",
      422
    );
  }

  const targetQrId =
    typeof unsigned.target_qr_id === "string" ? unsigned.target_qr_id : null;

  const signerKey = verify.signature.public_key;
  let signerRole = resolveRevokeSigner(signerKey, owner);

  if (
    !signerRole &&
    targetKind === "qr_credential" &&
    targetQrId &&
    QR_ID_REGEX.test(targetQrId)
  ) {
    const qrForAuth = await getQrCredential(db, targetQrId);
    if (
      qrForAuth &&
      qrForAuth.profile_id === profileId &&
      qrForAuth.scope === "child_object" &&
      typeof qrForAuth.object_id === "string" &&
      qrForAuth.object_id
    ) {
      const auth = await authorizeDelegatedChildRoute(
        db,
        pathProfileId,
        {
          public_key: owner.public_key,
          recovery_public_key: owner.recovery_public_key,
          status: owner.status,
        },
        signerKey,
        "child_object.revoke_qr",
        { objectId: qrForAuth.object_id }
      );
      if (auth.ok) {
        signerRole = "owner";
      } else {
        return errorResponse(auth.code, auth.message, auth.httpStatus);
      }
    }
  }

  if (!signerRole) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Revocation must be signed by the card owner, recovery key, or registered organizer key.",
      401
    );
  }

  const reason = unsigned.reason as string;
  if (signerRole === "owner" && !OWNER_REASONS.has(reason)) {
    return errorResponse(
      "INVALID_REASON",
      "Owner revocations must use reason owner_revoked.",
      422
    );
  }
  if (signerRole === "organizer" && !ORGANIZER_REASONS.has(reason)) {
    return errorResponse(
      "INVALID_REASON",
      "Organizer revocations must use reason organizer_revoked.",
      422
    );
  }

  if (targetKind === "card" && targetQrId) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Card revocation must not include target_qr_id.",
      422
    );
  }

  if (targetKind === "qr_credential") {
    if (!targetQrId || !QR_ID_REGEX.test(targetQrId)) {
      return errorResponse("INVALID_QR_ID", "Invalid target_qr_id.", 422);
    }
    const qr = await getQrCredential(db, targetQrId);
    if (!qr || qr.profile_id !== profileId) {
      return errorResponse("NOT_FOUND", "QR credential not found for this card.", 404);
    }
    if (qr.status === "revoked") {
      return errorResponse("ALREADY_REVOKED", "QR credential is already revoked.", 409);
    }
    if (owner.status === "revoked") {
      return errorResponse("CARD_REVOKED", "Card is already revoked.", 409);
    }
  } else if (owner.status === "revoked") {
    return errorResponse("ALREADY_REVOKED", "Card is already revoked.", 409);
  }

  const nonce = unsigned.nonce as string;
  const revokedAt = unsigned.revoked_at as string;

  const displayParsed = parseRevocationDisplayFields(unsigned);
  if (!displayParsed.ok) {
    return errorResponse("MALFORMED_REQUEST", displayParsed.message, 422);
  }

  try {
    await applyRevocation(db, {
      profileId,
      targetKind,
      targetQrId,
      reason,
      revokedAt,
      revocationId: nonce,
      signedDocumentJson: JSON.stringify(doc),
      issuerPublicKey: verify.signature.public_key,
      displayMode: displayParsed.meta.display_mode,
      publicReason: displayParsed.meta.public_reason,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return errorResponse(CRYPTO_ERROR.REPLAYED_NONCE, "Revocation already recorded.", 409);
    }
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }

  return jsonResponse(
    {
      profile_id: profileId,
      target_kind: targetKind,
      target_qr_id: targetQrId,
      status: "revoked",
      revoked_at: revokedAt,
      display_mode: displayParsed.meta.display_mode,
      public_reason: displayParsed.meta.public_reason,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
