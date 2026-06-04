import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getChildObject } from "../db/child-objects";
import { getActiveChildObjectQr, insertChildObjectQr } from "../db/child-object-qr";
import { getCardForUpdate } from "../db/card-update";
import { getCardOwner } from "../db/revoke";
import { requestOrigin } from "../http/resolver";
import { CHILD_OBJECT_ID_REGEX } from "./child-objects";
import {
  normalizeExpiresAtForScope,
  validateItemScopedMintExpiry,
} from "./merch-qr-policy";
import { QR_ID_REGEX } from "./scan-state";
import {
  authorizeDelegatedChildRoute,
  qrCredentialMustMatchOwnerKey,
} from "./delegated-child-signer";

export interface MintChildObjectQrSuccess {
  ok: true;
  profile_id: string;
  object_id: string;
  qr_id: string;
  scan_url: string;
  qr_expires_at: null;
  status: "active";
  already_minted: boolean;
}

export interface MintChildObjectQrFailure {
  ok: false;
  code: string;
  message: string;
  httpStatus: number;
}

export type MintChildObjectQrResult = MintChildObjectQrSuccess | MintChildObjectQrFailure;

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

function fail(
  code: string,
  message: string,
  httpStatus: number
): MintChildObjectQrFailure {
  return { ok: false, code, message, httpStatus };
}

/**
 * Mint one child_object QR from an owner-signed credential document.
 */
export async function mintChildObjectFromSignedCredential(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathObjectId: string,
  qrCredential: Record<string, unknown>,
  opts: { allowAlreadyMinted?: boolean } = {}
): Promise<MintChildObjectQrResult> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return fail(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  if (!CHILD_OBJECT_ID_REGEX.test(pathObjectId)) {
    return fail("INVALID_OBJECT_ID", "Invalid object_id.", 400);
  }

  const existing = await getCardForUpdate(db, pathProfileId);
  if (!existing) {
    return fail("NOT_FOUND", "Card not found.", 404);
  }
  if (existing.status !== "active") {
    if (existing.status === "suspended") {
      return fail(
        "CARD_SUSPENDED",
        "Cannot issue child object QR on a suspended card.",
        410
      );
    }
    return fail(
      "CARD_REVOKED",
      "Cannot issue child object QR on a revoked or disabled card.",
      410
    );
  }

  const childObject = await getChildObject(db, pathObjectId);
  if (!childObject || childObject.parent_profile_id !== pathProfileId) {
    return fail("NOT_FOUND", "Child object not found.", 404);
  }
  if (childObject.status !== "active") {
    return fail("OBJECT_NOT_ACTIVE", "Child object is not active.", 409);
  }

  const qrVerify = await verifySignedDocument(qrCredential, {
    expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
  });
  if (!qrVerify.ok) {
    return fail(qrVerify.code, qrVerify.message, 401);
  }

  const issueAuth = await authorizeDelegatedChildRoute(
    db,
    pathProfileId,
    {
      public_key: existing.public_key,
      recovery_public_key: existing.recovery_public_key,
      status: existing.status,
    },
    qrVerify.signature.public_key,
    "child_object.issue_qr",
    { objectId: pathObjectId }
  );
  if (!issueAuth.ok) {
    return fail(issueAuth.code, issueAuth.message, issueAuth.httpStatus);
  }
  if (
    !qrCredentialMustMatchOwnerKey(
      issueAuth.kind,
      qrVerify.signature.public_key,
      existing.public_key
    )
  ) {
    return fail(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "QR credential must be signed by the card owner key.",
      422
    );
  }

  const qr = qrVerify.unsigned;
  const profileId = qr.profile_id as string;

  if (profileId !== pathProfileId) {
    return fail("PROFILE_MISMATCH", "QR profile_id mismatch.", 422);
  }

  if (qr.scope !== "child_object") {
    return fail("INVALID_QR_SCOPE", "Issued QR must have scope child_object.", 422);
  }

  const expiryCheck = validateItemScopedMintExpiry("child_object", qr.expires_at);
  if (!expiryCheck.ok) {
    return fail(expiryCheck.code, expiryCheck.message, 422);
  }

  const objectId = typeof qr.object_id === "string" ? qr.object_id.trim() : "";
  if (!CHILD_OBJECT_ID_REGEX.test(objectId) || objectId !== pathObjectId) {
    return fail("OBJECT_MISMATCH", "object_id must match URL and child object.", 422);
  }

  const newQrId = qr.qr_id as string;
  if (!QR_ID_REGEX.test(newQrId)) {
    return fail("INVALID_QR_ID", "Invalid qr_id.", 422);
  }

  const epoch = qr.epoch as number;
  if (!Number.isInteger(epoch) || epoch < 1) {
    return fail("INVALID_QR_EPOCH", "QR epoch must be a positive integer.", 422);
  }

  if (qr.status !== "active") {
    return fail("INVALID_QR_STATUS", "New QR must have status active.", 422);
  }

  const expectedPayload = qrPayload(
    expectedQrOrigin(request, qr.payload),
    profileId,
    newQrId
  );
  if (qr.payload !== expectedPayload) {
    return fail(
      "INVALID_QR_PAYLOAD",
      `QR payload must be ${expectedPayload}`,
      422
    );
  }

  const issuedAt = qr.issued_at as string;
  if (typeof issuedAt !== "string" || !issuedAt) {
    return fail("MALFORMED_REQUEST", "issued_at is required.", 422);
  }

  const activeForObject = await getActiveChildObjectQr(db, profileId, objectId);
  if (activeForObject) {
    if (opts.allowAlreadyMinted && activeForObject.qr_id === newQrId) {
      return {
        ok: true,
        profile_id: profileId,
        object_id: objectId,
        qr_id: newQrId,
        scan_url: expectedPayload,
        qr_expires_at: null,
        status: "active",
        already_minted: true,
      };
    }
    return fail(
      "CHILD_OBJECT_QR_ACTIVE",
      "An active QR already exists for this child object.",
      409
    );
  }

  const owner = await getCardOwner(db, profileId);
  if (owner?.status === "revoked") {
    return fail("CARD_REVOKED", "Card is disabled.", 410);
  }

  const storedExpiresAt = normalizeExpiresAtForScope("child_object", null);

  try {
    await insertChildObjectQr(db, {
      qrId: newQrId,
      profileId,
      epoch,
      objectId,
      payload: expectedPayload,
      issuedAt,
      credentialDocumentJson: JSON.stringify({
        ...qr,
        expires_at: storedExpiresAt,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      if (opts.allowAlreadyMinted) {
        return {
          ok: true,
          profile_id: profileId,
          object_id: objectId,
          qr_id: newQrId,
          scan_url: expectedPayload,
          qr_expires_at: null,
          status: "active",
          already_minted: true,
        };
      }
      return fail("QR_EXISTS", "qr_id already exists.", 409);
    }
    return fail("RESOLVER_ERROR", msg, 500);
  }

  return {
    ok: true,
    profile_id: profileId,
    object_id: objectId,
    qr_id: newQrId,
    scan_url: expectedPayload,
    qr_expires_at: null,
    status: "active",
    already_minted: false,
  };
}
