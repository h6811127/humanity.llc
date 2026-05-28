import type { QrCredentialRow } from "./types";

/** Load full QR credential row by id (Flow 2 F2-4). */
export async function loadQrCredentialById(
  db: D1Database,
  qrId: string
): Promise<QrCredentialRow | null> {
  return db
    .prepare(
      `SELECT qr_id, profile_id, epoch, scope, print_artifact_id, resolver_hint,
              status, payload, issued_at, expires_at, credential_document_json,
              created_at, updated_at
       FROM qr_credentials WHERE qr_id = ?`
    )
    .bind(qrId)
    .first<QrCredentialRow>();
}
