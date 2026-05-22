import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "./types";

export interface ScanContext {
  card: CardRow | null;
  qr: QrCredentialRow | null;
  verification: VerificationSummaryRow | null;
}

export async function loadScanContext(
  db: D1Database,
  profileId: string,
  qrId: string
): Promise<ScanContext> {
  const card = await db
    .prepare(
      `SELECT profile_id, public_key, handle, handle_normalized, manifesto_line,
              status, card_document_json, created_at, updated_at
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<CardRow>();

  const qr = await db
    .prepare(
      `SELECT qr_id, profile_id, epoch, scope, print_artifact_id, resolver_hint,
              status, payload, issued_at, expires_at, credential_document_json,
              created_at, updated_at
       FROM qr_credentials WHERE qr_id = ?`
    )
    .bind(qrId)
    .first<QrCredentialRow>();

  let verification: VerificationSummaryRow | null = null;
  if (card) {
    verification = await db
      .prepare(
        `SELECT profile_id, state, level, label, method, vouch_count,
                latest_accepted_vouch_at, credential_ids_json, summary_document_json,
                updated_at
         FROM verification_summaries WHERE profile_id = ?`
      )
      .bind(profileId)
      .first<VerificationSummaryRow>();
  }

  return { card: card ?? null, qr: qr ?? null, verification };
}
