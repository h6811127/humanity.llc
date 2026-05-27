import {
  CRYPTO_ERROR,
  PROFILE_ID_REGEX,
} from "../crypto";
import { errorResponse, jsonResponse } from "../http/resolver";
import { mintPrintArtifactFromSignedCredential } from "./mint-print-artifact-qr";

function parseIssueBody(body: unknown): { qr_credential: Record<string, unknown> } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (!o.qr_credential || typeof o.qr_credential !== "object") return null;
  return { qr_credential: o.qr_credential as Record<string, unknown> };
}

/**
 * POST /.well-known/hc/v1/cards/{profile_id}/print-artifact-qrs
 * Body: { qr_credential } — mint a sibling print_artifact QR (merch / fulfillment).
 * Policy: docs/MERCH_QR_LIFECYCLE_POLICY.md
 */
export async function handlePostIssuePrintArtifactQr(
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

  const parsed = parseIssueBody(body);
  if (!parsed) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `qr_credential`.",
      400
    );
  }

  const result = await mintPrintArtifactFromSignedCredential(
    request,
    db,
    pathProfileId,
    parsed.qr_credential
  );

  if (!result.ok) {
    return errorResponse(result.code, result.message, result.httpStatus);
  }

  return jsonResponse(
    {
      profile_id: result.profile_id,
      qr_id: result.qr_id,
      print_artifact_id: result.print_artifact_id,
      scope: "print_artifact",
      scan_url: result.scan_url,
      qr_expires_at: result.qr_expires_at,
      status: result.status,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
