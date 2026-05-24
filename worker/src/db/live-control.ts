export type LiveControlStatus = "pending" | "proven" | "expired";

export interface LiveControlChallengeRow {
  challenge_id: string;
  profile_id: string;
  qr_id: string | null;
  nonce: string;
  verifier_session_id: string;
  status: LiveControlStatus;
  issued_at: string;
  expires_at: string;
  proven_at: string | null;
  signer_public_key: string | null;
  response_document_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertLiveControlChallengeParams {
  challengeId: string;
  profileId: string;
  qrId: string | null;
  nonce: string;
  verifierSessionId: string;
  issuedAt: string;
  expiresAt: string;
}

export async function insertLiveControlChallenge(
  db: D1Database,
  params: InsertLiveControlChallengeParams
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO live_control_challenges (
        challenge_id, profile_id, qr_id, nonce, verifier_session_id, status,
        issued_at, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(
      params.challengeId,
      params.profileId,
      params.qrId,
      params.nonce,
      params.verifierSessionId,
      params.issuedAt,
      params.expiresAt,
      params.issuedAt,
      params.issuedAt
    )
    .run();
}

export async function getLiveControlChallenge(
  db: D1Database,
  challengeId: string
): Promise<LiveControlChallengeRow | null> {
  const row = await db
    .prepare(
      `SELECT challenge_id, profile_id, qr_id, nonce, verifier_session_id, status,
              issued_at, expires_at, proven_at, signer_public_key,
              response_document_json, created_at, updated_at
       FROM live_control_challenges WHERE challenge_id = ?`
    )
    .bind(challengeId)
    .first<LiveControlChallengeRow>();
  return row ?? null;
}

export async function markLiveControlExpired(
  db: D1Database,
  challengeId: string,
  now: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE live_control_challenges
       SET status = 'expired', updated_at = ?
       WHERE challenge_id = ? AND status = 'pending'`
    )
    .bind(now, challengeId)
    .run();
}

export async function markLiveControlProven(
  db: D1Database,
  params: {
    challengeId: string;
    signerPublicKey: string;
    responseDocumentJson: string;
    provenAt: string;
  }
): Promise<void> {
  await db
    .prepare(
      `UPDATE live_control_challenges
       SET status = 'proven', proven_at = ?, signer_public_key = ?,
           response_document_json = ?, updated_at = ?
       WHERE challenge_id = ? AND status = 'pending'`
    )
    .bind(
      params.provenAt,
      params.signerPublicKey,
      params.responseDocumentJson,
      params.provenAt,
      params.challengeId
    )
    .run();
}
