import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getCardForUpdate } from "../db/card-update";
import {
  getActivePrintArtifactQr,
  insertPrintArtifactQr,
} from "../db/print-artifact-qr";
import { getCardOwner } from "../db/revoke";
import { requestOrigin } from "../http/resolver";
import {
  normalizeExpiresAtForScope,
  validatePrintArtifactMintExpiry,
} from "./merch-qr-policy";
import { QR_ID_REGEX } from "./scan-state";

/** Base58-ish opaque id (aligned with profile/qr id charset; no `i`/`l`/`o`). */
export const PRINT_ARTIFACT_ID_REGEX =
  /^pa_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz_-]{4,80}$/;

export interface MintPrintArtifactSuccess {
  ok: true;
  profile_id: string;
  qr_id: string;
  print_artifact_id: string;
  scan_url: string;
  qr_expires_at: null;
  status: "active";
  already_minted: boolean;
}

export interface MintPrintArtifactFailure {
  ok: false;
  code: string;
  message: string;
  httpStatus: number;
}

export type MintPrintArtifactResult = MintPrintArtifactSuccess | MintPrintArtifactFailure;

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

function resolveIssueSigner(
  signerKey: string,
  row: { public_key: string; recovery_public_key: string | null }
): boolean {
  if (signerKey === row.public_key) return true;
  if (row.recovery_public_key && signerKey === row.recovery_public_key) {
    return true;
  }
  return false;
}

function fail(
  code: string,
  message: string,
  httpStatus: number
): MintPrintArtifactFailure {
  return { ok: false, code, message, httpStatus };
}

/**
 * Mint one print_artifact QR from an owner-signed credential document.
 * Shared by owner issue API and fulfillment batch mint.
 */
export async function mintPrintArtifactFromSignedCredential(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  qrCredential: Record<string, unknown>,
  opts: { allowAlreadyMinted?: boolean } = {}
): Promise<MintPrintArtifactResult> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return fail(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }

  const existing = await getCardForUpdate(db, pathProfileId);
  if (!existing) {
    return fail("NOT_FOUND", "Card not found.", 404);
  }
  if (existing.status !== "active") {
    if (existing.status === "suspended") {
      return fail(
        "CARD_SUSPENDED",
        "Cannot issue print artifact QR on a suspended card.",
        410
      );
    }
    return fail(
      "CARD_REVOKED",
      "Cannot issue print artifact QR on a revoked or disabled card.",
      410
    );
  }

  const qrVerify = await verifySignedDocument(qrCredential, {
    expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
  });
  if (!qrVerify.ok) {
    return fail(qrVerify.code, qrVerify.message, 401);
  }

  if (!resolveIssueSigner(qrVerify.signature.public_key, existing)) {
    return fail(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "QR credential must be signed by the card owner or recovery key.",
      401
    );
  }

  const qr = qrVerify.unsigned;
  const qrSig = qrVerify.signature;
  const profileId = qr.profile_id as string;
  const publicKey = existing.public_key;

  if (profileId !== pathProfileId) {
    return fail("PROFILE_MISMATCH", "QR profile_id mismatch.", 422);
  }

  if (qr.scope !== "print_artifact") {
    return fail("INVALID_QR_SCOPE", "Issued QR must have scope print_artifact.", 422);
  }

  const expiryCheck = validatePrintArtifactMintExpiry("print_artifact", qr.expires_at);
  if (!expiryCheck.ok) {
    return fail(expiryCheck.code, expiryCheck.message, 422);
  }

  const printArtifactId =
    typeof qr.print_artifact_id === "string" ? qr.print_artifact_id.trim() : "";
  if (!PRINT_ARTIFACT_ID_REGEX.test(printArtifactId)) {
    return fail(
      "INVALID_PRINT_ARTIFACT_ID",
      "print_artifact_id must match pa_<opaque>.",
      422
    );
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

  if (qrSig.public_key !== publicKey) {
    return fail(
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

  const activeForArtifact = await getActivePrintArtifactQr(db, profileId, printArtifactId);
  if (activeForArtifact) {
    if (opts.allowAlreadyMinted && activeForArtifact.qr_id === newQrId) {
      return {
        ok: true,
        profile_id: profileId,
        qr_id: newQrId,
        print_artifact_id: printArtifactId,
        scan_url: expectedPayload,
        qr_expires_at: null,
        status: "active",
        already_minted: true,
      };
    }
    return fail(
      "PRINT_ARTIFACT_ACTIVE",
      "An active QR already exists for this print_artifact_id.",
      409
    );
  }

  const owner = await getCardOwner(db, profileId);
  if (owner?.status === "revoked") {
    return fail("CARD_REVOKED", "Card is disabled.", 410);
  }

  const storedExpiresAt = normalizeExpiresAtForScope("print_artifact", null);

  try {
    await insertPrintArtifactQr(db, {
      qrId: newQrId,
      profileId,
      epoch,
      printArtifactId,
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
          qr_id: newQrId,
          print_artifact_id: printArtifactId,
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
    qr_id: newQrId,
    print_artifact_id: printArtifactId,
    scan_url: expectedPayload,
    qr_expires_at: null,
    status: "active",
    already_minted: false,
  };
}
