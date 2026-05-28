import {
  CRYPTO_ERROR,
  PROFILE_ID_REGEX,
} from "../crypto";
import { errorResponse, jsonResponse } from "../http/resolver";
import { CHILD_OBJECT_ID_REGEX } from "./child-objects";
import { mintChildObjectFromSignedCredential } from "./mint-child-object-qr";

function parseIssueBody(body: unknown): { qr_credential: Record<string, unknown> } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (!o.qr_credential || typeof o.qr_credential !== "object") return null;
  return { qr_credential: o.qr_credential as Record<string, unknown> };
}

/**
 * POST /.well-known/hc/v1/cards/{profile_id}/objects/{object_id}/issue-qr
 * Body: { qr_credential } — mint a child_object QR for a registered child object.
 */
export async function handlePostIssueChildObjectQr(
  request: Request,
  db: D1Database,
  pathProfileId: string,
  pathObjectId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  if (!CHILD_OBJECT_ID_REGEX.test(pathObjectId)) {
    return errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const parsed = parseIssueBody(body);
  if (!parsed) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `qr_credential`.",
      400
    );
  }

  const result = await mintChildObjectFromSignedCredential(
    request,
    db,
    pathProfileId,
    pathObjectId,
    parsed.qr_credential
  );

  if (!result.ok) {
    return errorResponse(result.code, result.message, result.httpStatus);
  }

  return jsonResponse(
    {
      profile_id: result.profile_id,
      object_id: result.object_id,
      qr_id: result.qr_id,
      scope: "child_object",
      scan_url: result.scan_url,
      qr_expires_at: result.qr_expires_at,
      status: result.status,
      already_minted: result.already_minted,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
