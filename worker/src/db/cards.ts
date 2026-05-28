import { DEFAULT_REGISTERED_SUMMARY } from "./types";

export async function profileIdExists(
  db: D1Database,
  profileId: string
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 FROM cards WHERE profile_id = ?`)
    .bind(profileId)
    .first();
  return !!row;
}

export async function handleExists(
  db: D1Database,
  handleNormalized: string
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 FROM cards WHERE handle_normalized = ?`)
    .bind(handleNormalized)
    .first();
  return !!row;
}

export async function getCardByProfileId(
  db: D1Database,
  profileId: string
): Promise<{ card_document_json: string } | null> {
  return db
    .prepare(
      `SELECT card_document_json FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<{ card_document_json: string }>();
}

export interface InsertCardParams {
  profileId: string;
  publicKey: string;
  recoveryPublicKey?: string | null;
  issuerPublicKey?: string | null;
  handle: string;
  handleNormalized: string;
  manifestoLine: string;
  cardDocumentJson: string;
  createdAt: string;
}

export async function insertCardWithQr(
  db: D1Database,
  card: InsertCardParams,
  qr: {
    qrId: string;
    payload: string;
    issuedAt: string;
    expiresAt: string | null;
    credentialDocumentJson: string;
  }
): Promise<void> {
  const summary = DEFAULT_REGISTERED_SUMMARY;
  const statements = [
    db
      .prepare(
        `INSERT INTO cards (
          profile_id, public_key, recovery_public_key, issuer_public_key, handle, handle_normalized, manifesto_line,
          status, card_document_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
      )
      .bind(
        card.profileId,
        card.publicKey,
        card.recoveryPublicKey ?? null,
        card.issuerPublicKey ?? null,
        card.handle,
        card.handleNormalized,
        card.manifestoLine,
        card.cardDocumentJson,
        card.createdAt,
        card.createdAt
      ),
    db
      .prepare(
        `INSERT INTO verification_summaries (
          profile_id, state, level, label, method, vouch_count,
          latest_accepted_vouch_at, credential_ids_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        card.profileId,
        summary.state,
        summary.level,
        summary.label,
        summary.method,
        summary.vouch_count,
        summary.latest_accepted_vouch_at,
        summary.credential_ids_json,
        card.createdAt
      ),
    db
      .prepare(
        `INSERT INTO qr_credentials (
          qr_id, profile_id, epoch, scope, print_artifact_id, resolver_hint,
          status, payload, issued_at, expires_at, credential_document_json,
          created_at, updated_at
        ) VALUES (?, ?, 1, 'card', NULL, 'https://humanity.llc', 'active', ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        qr.qrId,
        card.profileId,
        qr.payload,
        qr.issuedAt,
        qr.expiresAt,
        qr.credentialDocumentJson,
        qr.issuedAt,
        qr.issuedAt
      ),
  ];

  const results = await db.batch(statements);
  for (const r of results) {
    if (!r.success) {
      throw new Error(r.error ?? "D1 batch insert failed");
    }
  }
}
