import { PROFILE_ID_REGEX } from "../crypto";
import { loadScanContext } from "../db/scan";
import { errorResponse, jsonResponse, requestOrigin } from "../http/resolver";
import { buildScanViewModel, QR_ID_REGEX, type ScanPageKind } from "./scan-state";

interface ArtifactIntentRequest {
  profile_id?: unknown;
  source_qr_id?: unknown;
}

interface BlockReason {
  code: string;
  message: string;
}

const BLOCK_REASONS: Partial<Record<ScanPageKind, BlockReason>> = {
  card_revoked: {
    code: "CARD_REVOKED",
    message: "Card is revoked. New artifact intents are blocked.",
  },
  card_suspended: {
    code: "CARD_SUSPENDED",
    message: "Card is suspended. New artifact intents are blocked.",
  },
  card_expired: {
    code: "CARD_EXPIRED",
    message: "Card is expired. New artifact intents are blocked.",
  },
  qr_revoked: {
    code: "QR_REVOKED",
    message: "QR credential is revoked. New artifact intents are blocked.",
  },
  qr_expired: {
    code: "QR_EXPIRED",
    message: "QR credential is expired. New artifact intents are blocked.",
  },
  qr_replaced: {
    code: "QR_REPLACED",
    message: "QR credential is replaced. New artifact intents are blocked.",
  },
};

/**
 * M4.4 pre-commerce guard. The actual proof/preview intent is deferred, but
 * inactive source QR/card states must already block new personalized artifacts.
 */
export async function handlePostArtifactIntent(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: ArtifactIntentRequest;
  try {
    body = (await request.json()) as ArtifactIntentRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const profileId = typeof body.profile_id === "string" ? body.profile_id.trim() : "";
  const sourceQrId =
    typeof body.source_qr_id === "string" ? body.source_qr_id.trim() : "";

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse("INVALID_PROFILE_ID", "Invalid profile_id.", 422);
  }

  if (!QR_ID_REGEX.test(sourceQrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid source_qr_id.", 422);
  }

  const ctx = await loadScanContext(db, profileId, sourceQrId);
  const vm = buildScanViewModel(
    profileId,
    sourceQrId,
    ctx,
    requestOrigin(request)
  );

  if (vm.kind === "unknown_profile" || vm.kind === "unknown_qr") {
    return errorResponse(
      "SOURCE_QR_NOT_FOUND",
      "Source card or QR credential was not found.",
      404
    );
  }

  if (vm.kind === "profile_qr_mismatch" || vm.kind === "malformed") {
    return errorResponse(
      "SOURCE_QR_INVALID",
      "Source QR credential does not match the requested profile.",
      400
    );
  }

  const block = BLOCK_REASONS[vm.kind];
  if (block) {
    return jsonResponse(
      {
        error: block.code,
        message: block.message,
        status: "blocked",
        profile_id: profileId,
        source_qr_id: sourceQrId,
        scan: { kind: vm.kind },
      },
      403
    );
  }

  return errorResponse(
    "ARTIFACT_INTENTS_NOT_IMPLEMENTED",
    "Artifact intent preview/proof generation is not implemented yet.",
    501
  );
}
