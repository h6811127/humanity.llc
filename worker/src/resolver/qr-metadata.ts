/**
 * GET /.well-known/hc/v1/qr/{qr_id} - QR credential metadata (Flow 2 F2-4).
 */
import { loadQrCredentialById } from "../db/qr-metadata";
import type { QrCredentialRow } from "../db/types";
import {
  errorResponse,
  jsonResponse,
  OPERATOR_ID,
  PROTOCOL_VERSION,
} from "../http/resolver";
import { QR_ID_REGEX } from "./scan-state";

export interface QrCredentialPublicBody {
  qr_id: string;
  profile_id: string;
  epoch: number;
  scope: string;
  print_artifact_id: string | null;
  resolver_hint: string;
  issued_at: string;
  expires_at: string | null;
  status: string;
  payload: string;
  signature: Record<string, unknown>;
}

export interface QrMetadataResponseBody {
  version: string;
  resolver: { operator: string; version: string };
  qr: QrCredentialPublicBody;
}

/** @param {QrCredentialRow} row */
export function qrCredentialPublicBodyFromRow(row: QrCredentialRow): QrCredentialPublicBody {
  return {
    qr_id: row.qr_id,
    profile_id: row.profile_id,
    epoch: row.epoch,
    scope: row.scope,
    print_artifact_id: row.print_artifact_id,
    resolver_hint: row.resolver_hint,
    issued_at: row.issued_at,
    expires_at: row.expires_at,
    status: row.status,
    payload: row.payload,
    signature: signatureFromCredentialDocument(row.credential_document_json),
  };
}

/**
 * @param {string | null} credentialDocumentJson
 */
export function signatureFromCredentialDocument(
  credentialDocumentJson: string | null
): Record<string, unknown> {
  if (!credentialDocumentJson) return {};
  try {
    const parsed = JSON.parse(credentialDocumentJson) as {
      signature?: unknown;
    };
    if (parsed?.signature && typeof parsed.signature === "object") {
      return parsed.signature as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function qrMetadataResponseBody(row: QrCredentialRow): QrMetadataResponseBody {
  return {
    version: PROTOCOL_VERSION,
    resolver: {
      operator: OPERATOR_ID,
      version: PROTOCOL_VERSION,
    },
    qr: qrCredentialPublicBodyFromRow(row),
  };
}

/**
 * @param {Request} _request
 * @param {D1Database} db
 * @param {string} qrIdRaw
 */
export async function handleGetQrMetadata(
  _request: Request,
  db: D1Database,
  qrIdRaw: string
): Promise<Response> {
  const qrId = decodeURIComponent(qrIdRaw).trim();
  if (!qrId || !QR_ID_REGEX.test(qrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid qr_id.", 422);
  }

  const row = await loadQrCredentialById(db, qrId);
  if (!row) {
    return errorResponse("NOT_FOUND", "QR credential not found.", 404);
  }

  return jsonResponse(qrMetadataResponseBody(row), 200);
}
