export interface ActiveChildObjectQrRow {
  qr_id: string;
  object_id: string;
}

export async function getActiveChildObjectQr(
  db: D1Database,
  profileId: string,
  objectId: string
): Promise<ActiveChildObjectQrRow | null> {
  return db
    .prepare(
      `SELECT qr_id, object_id FROM qr_credentials
       WHERE profile_id = ? AND object_id = ? AND scope = 'child_object'
         AND status = 'active'
       LIMIT 1`
    )
    .bind(profileId, objectId)
    .first<ActiveChildObjectQrRow>();
}

export interface InsertChildObjectQrParams {
  qrId: string;
  profileId: string;
  epoch: number;
  objectId: string;
  payload: string;
  issuedAt: string;
  credentialDocumentJson: string;
}

export async function insertChildObjectQr(
  db: D1Database,
  params: InsertChildObjectQrParams
): Promise<void> {
  const now = params.issuedAt;
  const result = await db
    .prepare(
      `INSERT INTO qr_credentials (
        qr_id, profile_id, epoch, scope, print_artifact_id, object_id, resolver_hint,
        status, payload, issued_at, expires_at, credential_document_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'child_object', NULL, ?, 'https://humanity.llc', 'active', ?, ?, NULL, ?, ?, ?)`
    )
    .bind(
      params.qrId,
      params.profileId,
      params.epoch,
      params.objectId,
      params.payload,
      params.issuedAt,
      params.credentialDocumentJson,
      now,
      now
    )
    .run();

  if (!result.success) {
    throw new Error(result.error ?? "D1 insert child_object QR failed");
  }
}
