import type { RevocationTargetKind } from "./types";

export interface CardOwnerRow {
  public_key: string;
  recovery_public_key: string | null;
  status: string;
}

export async function getCardOwner(
  db: D1Database,
  profileId: string
): Promise<CardOwnerRow | null> {
  return db
    .prepare(
      `SELECT public_key, recovery_public_key, status FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<CardOwnerRow>();
}

export async function revocationNonceUsed(
  db: D1Database,
  revocationId: string
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 FROM revocations WHERE revocation_id = ?`)
    .bind(revocationId)
    .first();
  return !!row;
}

export async function getQrCredential(
  db: D1Database,
  qrId: string
): Promise<{ qr_id: string; profile_id: string; status: string } | null> {
  return db
    .prepare(
      `SELECT qr_id, profile_id, status FROM qr_credentials WHERE qr_id = ?`
    )
    .bind(qrId)
    .first();
}

export interface ApplyRevocationParams {
  profileId: string;
  targetKind: RevocationTargetKind;
  targetQrId: string | null;
  reason: string;
  revokedAt: string;
  revocationId: string;
  signedDocumentJson: string;
  issuerPublicKey: string;
}

export async function applyRevocation(
  db: D1Database,
  params: ApplyRevocationParams
): Promise<void> {
  const createdAt = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO revocations (
          revocation_id, profile_id, target_kind, target_qr_id, reason,
          signed_document_json, revoked_at, issuer_public_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.revocationId,
        params.profileId,
        params.targetKind,
        params.targetQrId,
        params.reason,
        params.signedDocumentJson,
        params.revokedAt,
        params.issuerPublicKey,
        createdAt
      ),
  ];

  if (params.targetKind === "card") {
    statements.push(
      db
        .prepare(
          `UPDATE cards SET status = 'revoked', updated_at = ? WHERE profile_id = ?`
        )
        .bind(params.revokedAt, params.profileId),
      db
        .prepare(
          `UPDATE qr_credentials SET status = 'revoked', updated_at = ?
           WHERE profile_id = ? AND status = 'active'`
        )
        .bind(params.revokedAt, params.profileId)
    );
  } else if (params.targetQrId) {
    statements.push(
      db
        .prepare(
          `UPDATE qr_credentials SET status = 'revoked', updated_at = ?
           WHERE qr_id = ? AND profile_id = ?`
        )
        .bind(params.revokedAt, params.targetQrId, params.profileId)
    );
  }

  const results = await db.batch(statements);
  for (const r of results) {
    if (!r.success) {
      throw new Error(r.error ?? "D1 revocation batch failed");
    }
  }
}
