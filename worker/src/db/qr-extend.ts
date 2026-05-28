export interface ActiveQrCredentialRow {
  qr_id: string;
  profile_id: string;
  epoch: number;
  scope: string;
  payload: string;
  issued_at: string;
  expires_at: string | null;
  status: string;
}

export async function getActiveQrCredential(
  db: D1Database,
  profileId: string,
  qrId: string
): Promise<ActiveQrCredentialRow | null> {
  return db
    .prepare(
      `SELECT qr_id, profile_id, epoch, scope, payload, issued_at, expires_at, status
       FROM qr_credentials
       WHERE profile_id = ? AND qr_id = ? AND scope = 'card' AND status = 'active'
       LIMIT 1`
    )
    .bind(profileId, qrId)
    .first<ActiveQrCredentialRow>();
}

export async function applyQrExtend(
  db: D1Database,
  profileId: string,
  qrId: string,
  expiresAt: string,
  credentialDocumentJson: string,
  updatedAt: string
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE qr_credentials SET expires_at = ?, credential_document_json = ?, updated_at = ?
       WHERE profile_id = ? AND qr_id = ? AND scope = 'card' AND status = 'active'`
    )
    .bind(expiresAt, credentialDocumentJson, updatedAt, profileId, qrId)
    .run();
  if (!result.success || (result.meta.changes ?? 0) < 1) {
    throw new Error("Active QR credential not found or not updated.");
  }
}
