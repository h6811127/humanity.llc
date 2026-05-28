import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getCardForUpdate } from "../db/card-update";
import type { ArtifactIntentRow } from "../db/artifact-intents";
import { requestOrigin } from "../http/resolver";
import {
  PRINT_ARTIFACT_ID_REGEX,
  type MintPrintArtifactFailure,
} from "../resolver/mint-print-artifact-qr";
import {
  validatePrintArtifactMintExpiry,
} from "../resolver/merch-qr-policy";
import { QR_ID_REGEX } from "../resolver/scan-state";

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
  httpStatus = 422
): MintPrintArtifactFailure {
  return { ok: false, code, message, httpStatus };
}

export interface PreMintCredentialValidation {
  ok: true;
  credentials: Record<string, unknown>[];
}

export type PreMintCredentialValidationResult =
  | PreMintCredentialValidation
  | MintPrintArtifactFailure;

/**
 * Validate owner-signed print_artifact credentials against a pre-checkout intent.
 * Does not mint — stores validated credentials for post-payment auto-mint.
 */
export async function validatePreMintCredentialsForIntent(
  request: Request,
  db: D1Database,
  intent: ArtifactIntentRow,
  rawCredentials: unknown[]
): Promise<PreMintCredentialValidationResult> {
  const profileId = intent.profile_id;
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return fail(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id on artifact intent.");
  }

  const plannedQrIds = JSON.parse(intent.planned_item_qr_ids_json) as string[];
  const plannedPaIds = JSON.parse(intent.planned_print_artifact_ids_json) as string[];

  if (plannedQrIds.length === 0) {
    return fail("NO_PLANNED_QRS", "Artifact intent has no planned item QR ids.");
  }

  if (rawCredentials.length !== plannedQrIds.length) {
    return fail(
      "PRE_MINT_COUNT_MISMATCH",
      "qr_credentials count must match planned item quantity."
    );
  }

  const existing = await getCardForUpdate(db, profileId);
  if (!existing) {
    return fail("NOT_FOUND", "Card not found.", 404);
  }
  if (existing.status !== "active") {
    return fail(
      "CARD_UNAVAILABLE",
      "Cannot pre-mint print artifact QRs on an inactive card.",
      410
    );
  }

  const expected = new Map<string, string>();
  for (let i = 0; i < plannedQrIds.length; i++) {
    expected.set(plannedQrIds[i]!, plannedPaIds[i]!);
  }

  const seenQr = new Set<string>();
  const seenPa = new Set<string>();
  const credentials: Record<string, unknown>[] = [];

  for (let index = 0; index < rawCredentials.length; index++) {
    const credential = rawCredentials[index];
    if (!credential || typeof credential !== "object") {
      return fail("MALFORMED_REQUEST", `qr_credentials[${index}] must be an object.`);
    }

    const qrVerify = await verifySignedDocument(credential as Record<string, unknown>, {
      expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
    });
    if (!qrVerify.ok) {
      return fail(qrVerify.code, qrVerify.message);
    }

    if (!resolveIssueSigner(qrVerify.signature.public_key, existing)) {
      return fail(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "QR credential must be signed by the card owner or recovery key."
      );
    }

    const qr = qrVerify.unsigned;
    if (qr.profile_id !== profileId) {
      return fail("PROFILE_MISMATCH", "QR profile_id does not match artifact intent.");
    }
    if (qr.scope !== "print_artifact") {
      return fail("INVALID_QR_SCOPE", "Issued QR must have scope print_artifact.");
    }

    const expiryCheck = validatePrintArtifactMintExpiry("print_artifact", qr.expires_at);
    if (!expiryCheck.ok) {
      return fail(expiryCheck.code, expiryCheck.message);
    }

    const printArtifactId =
      typeof qr.print_artifact_id === "string" ? qr.print_artifact_id.trim() : "";
    const qrId = typeof qr.qr_id === "string" ? qr.qr_id : "";
    if (!QR_ID_REGEX.test(qrId)) {
      return fail("INVALID_QR_ID", `qr_credentials[${index}] has invalid qr_id.`);
    }
    if (!PRINT_ARTIFACT_ID_REGEX.test(printArtifactId)) {
      return fail(
        "INVALID_PRINT_ARTIFACT_ID",
        `qr_credentials[${index}] has invalid print_artifact_id.`
      );
    }
    if (!expected.has(qrId) || expected.get(qrId) !== printArtifactId) {
      return fail(
        "PLANNED_QR_MISMATCH",
        "Credential qr_id/print_artifact_id does not match artifact intent plan."
      );
    }
    if (seenQr.has(qrId) || seenPa.has(printArtifactId)) {
      return fail(
        "DUPLICATE_PLANNED_QR",
        "Duplicate planned qr_id or print_artifact_id in batch."
      );
    }
    seenQr.add(qrId);
    seenPa.add(printArtifactId);

    if (qr.status !== "active") {
      return fail("INVALID_QR_STATUS", "New QR must have status active.");
    }
    if (qrVerify.signature.public_key !== existing.public_key) {
      return fail(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "QR credential must be signed by the card owner key."
      );
    }

    const expectedPayload = qrPayload(
      expectedQrOrigin(request, qr.payload),
      profileId,
      qrId
    );
    if (qr.payload !== expectedPayload) {
      return fail(
        "INVALID_QR_PAYLOAD",
        `QR payload must be ${expectedPayload}`
      );
    }

    credentials.push(credential as Record<string, unknown>);
  }

  return { ok: true, credentials };
}
