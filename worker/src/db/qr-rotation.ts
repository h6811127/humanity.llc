export interface ActiveCardQrRow {
  qr_id: string;
  epoch: number;
  status: string;
}

export async function getActiveCardScopeQr(
  db: D1Database,
  profileId: string
): Promise<ActiveCardQrRow | null> {
  return db
    .prepare(
      `SELECT qr_id, epoch, status FROM qr_credentials
       WHERE profile_id = ? AND scope = 'card' AND status = 'active'
       LIMIT 1`
    )
    .bind(profileId)
    .first<ActiveCardQrRow>();
}

export async function getMaxCardScopeEpoch(
  db: D1Database,
  profileId: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT MAX(epoch) AS max_epoch FROM qr_credentials
       WHERE profile_id = ? AND scope = 'card'`
    )
    .bind(profileId)
    .first<{ max_epoch: number | null }>();
  return row?.max_epoch ?? 0;
}

export interface ApplyQrRotationParams {
  profileId: string;
  manifestoLine: string;
  cardDocumentJson: string;
  updatedAt: string;
  previousQrId: string | null;
  newQr: {
    qrId: string;
    epoch: number;
    payload: string;
    issuedAt: string;
    expiresAt: string;
    credentialDocumentJson: string;
  };
}

export async function applyQrRotation(
  db: D1Database,
  params: ApplyQrRotationParams
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  if (params.previousQrId) {
    statements.push(
      db
        .prepare(
          `UPDATE qr_credentials SET status = 'replaced', updated_at = ?
           WHERE qr_id = ? AND profile_id = ? AND status = 'active'`
        )
        .bind(params.updatedAt, params.previousQrId, params.profileId)
    );
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO qr_credentials (
          qr_id, profile_id, epoch, scope, print_artifact_id, resolver_hint,
          status, payload, issued_at, expires_at, credential_document_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'card', NULL, 'https://humanity.llc', 'active', ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.newQr.qrId,
        params.profileId,
        params.newQr.epoch,
        params.newQr.payload,
        params.newQr.issuedAt,
        params.newQr.expiresAt,
        params.newQr.credentialDocumentJson,
        params.newQr.issuedAt,
        params.updatedAt
      ),
    db
      .prepare(
        `UPDATE cards SET manifesto_line = ?, card_document_json = ?, updated_at = ?
         WHERE profile_id = ? AND status = 'active'`
      )
      .bind(
        params.manifestoLine,
        params.cardDocumentJson,
        params.updatedAt,
        params.profileId
      )
  );

  const results = await db.batch(statements);
  for (const r of results) {
    if (!r.success) {
      throw new Error(r.error ?? "D1 QR rotation batch failed");
    }
  }
}
