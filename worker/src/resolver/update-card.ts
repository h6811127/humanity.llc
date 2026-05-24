import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { applyCardUpdate, getCardForUpdate } from "../db/card-update";
import { errorResponse, jsonResponse } from "../http/resolver";
import { validateManifestoLine } from "../validation/manifesto";

function parseUpdateBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.card && typeof o.card === "object") {
    return o.card as Record<string, unknown>;
  }
  if (o.type === PAYLOAD_TYPES.HUMANITY_CARD) {
    return o;
  }
  return null;
}

function resolveUpdateSigner(
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
 * POST /.well-known/hc/v1/cards/{profile_id}/update
 * Body: { "card": <signed humanity_card> }
 * Updates manifesto_line and stored card document; handle and profile_id are immutable.
 */
export async function handlePostCardUpdate(
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

  const doc = parseUpdateBody(body);
  if (!doc) {
    return errorResponse(
      "MALFORMED_REQUEST",
      'Body must include signed `card` object.',
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
        "Cannot update a suspended card.",
        410
      );
    }
    return errorResponse(
      "CARD_REVOKED",
      "Cannot update a revoked or disabled card.",
      410
    );
  }

  const verify = await verifySignedDocument(doc, {
    expectedType: PAYLOAD_TYPES.HUMANITY_CARD,
  });
  if (!verify.ok) {
    return errorResponse(verify.code, verify.message, 401);
  }

  const signerKey = verify.signature.public_key;
  if (!resolveUpdateSigner(signerKey, existing)) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Update must be signed by the card owner or recovery key.",
      401
    );
  }

  const profileId = doc.profile_id as string;
  const publicKey = doc.public_key as string;
  const handleRaw = doc.handle as string;
  const createdAt = doc.created_at as string;
  const updatedAt = doc.updated_at as string;
  const manifestoRaw = doc.manifesto_line as string;

  if (profileId !== pathProfileId) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "profile_id in document must match URL.",
      422
    );
  }
  if (publicKey !== existing.public_key) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "public_key cannot change on update.",
      422
    );
  }
  if (handleRaw !== existing.handle) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "handle cannot change on update.",
      422
    );
  }
  if (createdAt !== existing.created_at) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "created_at must match the original card.",
      422
    );
  }
  if (typeof updatedAt !== "string" || updatedAt <= existing.updated_at) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "updated_at must be newer than the stored card.",
      422
    );
  }

  let manifestoLine: string;
  try {
    manifestoLine = validateManifestoLine(manifestoRaw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid manifesto_line.";
    return errorResponse("MALFORMED_REQUEST", msg, 422);
  }

  const cardDocumentJson = JSON.stringify(doc);

  try {
    await applyCardUpdate(db, profileId, manifestoLine, cardDocumentJson, updatedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return errorResponse("RESOLVER_ERROR", msg, 500);
  }

  return jsonResponse(
    {
      profile_id: profileId,
      manifesto_line: manifestoLine,
      updated_at: updatedAt,
      status: "active",
    },
    200
  );
}
