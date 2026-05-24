import {
  CRYPTO_ERROR,
  isSignatureBlock,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { insertCardWithQr, handleExists, profileIdExists } from "../db/cards";
import { checkCreateRateLimit, hashIp } from "../db/rate-limit";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  requestOrigin,
  RESOLVER_ORIGIN,
} from "../http/resolver";
import { validateHandle } from "../validation/handle";
import { validateManifestoLine } from "../validation/manifesto";

export interface CreateCardBody {
  card: Record<string, unknown>;
  qr_credential: Record<string, unknown>;
}

function parseCreateBody(body: unknown): CreateCardBody | null {
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
  return `${origin}/c/${profileId}?q=${qrId}`;
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
      /* Keep canonical validation error below. */
    }
  }
  return origin;
}

export async function handlePostCards(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const parsed = parseCreateBody(body);
  if (!parsed) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `card` and `qr_credential` objects.",
      400
    );
  }

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkCreateRateLimit(db, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many card creations from this network. Try again later.",
      429,
      rate.retryAfterSec
        ? { "Retry-After": String(rate.retryAfterSec) }
        : undefined
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

  const card = parsed.card;
  const qr = parsed.qr_credential;
  const profileId = card.profile_id as string;
  const publicKey = card.public_key as string;
  const handleRaw = card.handle as string;
  const manifestoRaw = card.manifesto_line as string;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 422);
  }

  if (card.status !== "active") {
    return errorResponse("INVALID_CARD_STATUS", "New cards must have status active.", 422);
  }

  const cardSig = card.signature;
  if (!isSignatureBlock(cardSig) || publicKey !== cardSig.public_key) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Card public_key must match signature.public_key.",
      422
    );
  }

  if (qr.profile_id !== profileId) {
    return errorResponse("PROFILE_MISMATCH", "QR credential profile_id mismatch.", 422);
  }

  const qrSig = qr.signature;
  if (!isSignatureBlock(qrSig) || qrSig.public_key !== publicKey) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "QR credential must be signed by the card owner key.",
      422
    );
  }

  if (qr.scope !== "card") {
    return errorResponse("INVALID_QR_SCOPE", "Initial QR must have scope card.", 422);
  }

  if (qr.status !== "active") {
    return errorResponse("INVALID_QR_STATUS", "Initial QR must have status active.", 422);
  }

  const qrMeta = card.qr as Record<string, unknown> | undefined;
  const activeQrId = qrMeta?.active_qr_id;
  if (activeQrId !== qr.qr_id) {
    return errorResponse(
      "QR_MISMATCH",
      "Card qr.active_qr_id must match qr_credential.qr_id.",
      422
    );
  }

  const expectedPayload = qrPayload(
    expectedQrOrigin(request, qr.payload),
    profileId,
    qr.qr_id as string
  );
  if (qr.payload !== expectedPayload) {
    return errorResponse(
      "INVALID_QR_PAYLOAD",
      `QR payload must be ${expectedPayload}`,
      422
    );
  }

  let handleNormalized: string;
  let manifestoLine: string;
  try {
    handleNormalized = validateHandle(handleRaw);
    manifestoLine = validateManifestoLine(manifestoRaw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Validation failed.";
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "VALIDATION_ERROR";
    return errorResponse(code, msg, 422);
  }

  if (await profileIdExists(db, profileId)) {
    return errorResponse("PROFILE_EXISTS", "profile_id already registered.", 409);
  }

  if (await handleExists(db, handleNormalized)) {
    return errorResponse("HANDLE_TAKEN", "Handle is already taken.", 409);
  }

  const createdAt =
    (card.created_at as string) ?? (card.updated_at as string) ?? new Date().toISOString();

  const recoveryPublicKeyRaw = card.recovery_public_key;
  let recoveryPublicKey: string | null = null;
  if (recoveryPublicKeyRaw != null && recoveryPublicKeyRaw !== "") {
    if (typeof recoveryPublicKeyRaw !== "string") {
      return errorResponse(
        "MALFORMED_REQUEST",
        "recovery_public_key must be a base58 string.",
        422
      );
    }
    if (recoveryPublicKeyRaw === publicKey) {
      return errorResponse(
        "INVALID_RECOVERY_KEY",
        "Recovery key must differ from the owner public key.",
        422
      );
    }
    recoveryPublicKey = recoveryPublicKeyRaw;
  }

  const issuerPublicKeyRaw = card.issuer_public_key;
  let issuerPublicKey: string | null = null;
  if (issuerPublicKeyRaw != null && issuerPublicKeyRaw !== "") {
    if (typeof issuerPublicKeyRaw !== "string") {
      return errorResponse(
        "MALFORMED_REQUEST",
        "issuer_public_key must be a base58 string.",
        422
      );
    }
    if (issuerPublicKeyRaw === publicKey || issuerPublicKeyRaw === recoveryPublicKey) {
      return errorResponse(
        "INVALID_ISSUER_KEY",
        "Organizer key must differ from owner and recovery keys.",
        422
      );
    }
    issuerPublicKey = issuerPublicKeyRaw;
  }

  try {
    await insertCardWithQr(
      db,
      {
        profileId,
        publicKey,
        recoveryPublicKey,
        issuerPublicKey,
        handle: handleNormalized,
        handleNormalized,
        manifestoLine,
        cardDocumentJson: JSON.stringify(card),
        createdAt,
      },
      {
        qrId: qr.qr_id as string,
        payload: expectedPayload,
        issuedAt: qr.issued_at as string,
        expiresAt:
          (typeof qr.expires_at === "string" && qr.expires_at) ||
          defaultQrExpiry(qr.issued_at as string),
        credentialDocumentJson: JSON.stringify(qr),
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return errorResponse("HANDLE_TAKEN", "Handle or profile already exists.", 409);
    }
    if (msg.includes("recovery_public_key")) {
      return errorResponse(
        "RESOLVER_SCHEMA",
        "Resolver database is missing the recovery key column. Apply D1 migration 0003_recovery_public_key.sql and redeploy.",
        503
      );
    }
    if (msg.includes("issuer_public_key")) {
      return errorResponse(
        "RESOLVER_SCHEMA",
        "Resolver database is missing the organizer key column. Apply D1 migration 0005_issuer_public_key.sql and redeploy.",
        503
      );
    }
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }

  return jsonResponse(
    {
      profile_id: profileId,
      handle: handleNormalized,
      qr_id: qr.qr_id,
      scan_url: expectedPayload,
      card_url: `${RESOLVER_ORIGIN}/.well-known/hc/v1/cards/${profileId}`,
      status: "active",
      verification: {
        state: "registered",
        label: "Registered",
      },
    },
    201
  );
}

export async function handleGetCard(
  db: D1Database,
  profileId: string,
  request: Request
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }

  const row = await db
    .prepare(
      `SELECT card_document_json, status FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<{ card_document_json: string; status: string }>();

  if (!row) {
    return errorResponse("NOT_FOUND", "Card not found.", 404);
  }

  if (row.status === "revoked") {
    return errorResponse(
      "CARD_REVOKED",
      "This card has been revoked.",
      410,
      { "Cache-Control": "public, max-age=60" }
    );
  }

  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("text/html")) {
    return new Response(
      `<!DOCTYPE html><html><body><pre>${escapeHtml(row.card_document_json)}</pre></body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      }
    );
  }

  return new Response(row.card_document_json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

function defaultQrExpiry(issuedAt: string): string {
  const d = new Date(issuedAt);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
