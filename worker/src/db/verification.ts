import type {
  CardStatus,
  VerificationSummaryRow,
  VouchMethod,
  VouchRow,
} from "./types";

export const VOUCH_THRESHOLD = 3;
export const VOUCHER_ACTIVE_QUOTA_PER_YEAR = 5;
export const VOUCHER_WAIT_DAYS = 90;

export interface VouchCardOwner {
  profile_id: string;
  public_key: string;
  status: CardStatus;
}

export interface InsertVouchParams {
  vouchId: string;
  voucherProfileId: string;
  voucheeProfileId: string;
  nonce: string;
  statement: string;
  method: VouchMethod;
  signedDocumentJson: string;
  issuerPublicKey: string;
  createdAt: string;
}

export interface RevokeVouchParams {
  vouchId: string;
  revokedAt: string;
  revocationNonce: string;
  revocationDocumentJson: string;
}

export async function getVouchCardOwner(
  db: D1Database,
  profileId: string
): Promise<VouchCardOwner | null> {
  return db
    .prepare(
      `SELECT profile_id, public_key, status
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<VouchCardOwner>();
}

export async function getVerificationSummary(
  db: D1Database,
  profileId: string
): Promise<VerificationSummaryRow | null> {
  return db
    .prepare(
      `SELECT profile_id, state, level, label, method, vouch_count,
              latest_accepted_vouch_at, credential_ids_json, summary_document_json,
              updated_at
       FROM verification_summaries WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<VerificationSummaryRow>();
}

export async function vouchNonceUsed(
  db: D1Database,
  nonce: string
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 FROM vouches WHERE nonce = ? OR revocation_nonce = ?`)
    .bind(nonce, nonce)
    .first();
  return !!row;
}

export async function activeVouchPairExists(
  db: D1Database,
  voucherProfileId: string,
  voucheeProfileId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM vouches
       WHERE voucher_profile_id = ?
         AND vouchee_profile_id = ?
         AND status = 'active'`
    )
    .bind(voucherProfileId, voucheeProfileId)
    .first();
  return !!row;
}

export async function activeVouchCountSince(
  db: D1Database,
  voucherProfileId: string,
  since: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM vouches
       WHERE voucher_profile_id = ?
         AND status = 'active'
         AND created_at >= ?`
    )
    .bind(voucherProfileId, since)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getVouchById(
  db: D1Database,
  vouchId: string
): Promise<VouchRow | null> {
  return db
    .prepare(
      `SELECT vouch_id, voucher_profile_id, vouchee_profile_id, nonce, statement,
              method, status, signed_document_json, revocation_document_json,
              revocation_nonce, issuer_public_key, created_at, revoked_at
       FROM vouches WHERE vouch_id = ?`
    )
    .bind(vouchId)
    .first<VouchRow>();
}

export async function insertVouch(
  db: D1Database,
  params: InsertVouchParams
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO vouches (
        vouch_id, voucher_profile_id, vouchee_profile_id, nonce, statement,
        method, status, signed_document_json, revocation_document_json,
        revocation_nonce, issuer_public_key, created_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NULL, NULL, ?, ?, NULL)`
    )
    .bind(
      params.vouchId,
      params.voucherProfileId,
      params.voucheeProfileId,
      params.nonce,
      params.statement,
      params.method,
      params.signedDocumentJson,
      params.issuerPublicKey,
      params.createdAt
    )
    .run();
  if (!result.success) {
    throw new Error(result.error ?? "D1 insert vouch failed");
  }
}

export async function revokeVouch(
  db: D1Database,
  params: RevokeVouchParams
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE vouches
       SET status = 'revoked', revoked_at = ?, revocation_document_json = ?,
           revocation_nonce = ?
       WHERE vouch_id = ? AND status = 'active'`
    )
    .bind(
      params.revokedAt,
      params.revocationDocumentJson,
      params.revocationNonce,
      params.vouchId
    )
    .run();
  if (!result.success) {
    throw new Error(result.error ?? "D1 revoke vouch failed");
  }
}

export async function recalculateVouchSummary(
  db: D1Database,
  profileId: string,
  updatedAt: string
): Promise<VerificationSummaryRow> {
  const existing = await getVerificationSummary(db, profileId);
  const result = await db
    .prepare(
      `SELECT vouch_id, created_at FROM vouches
       WHERE vouchee_profile_id = ?
         AND status = 'active'
       ORDER BY created_at DESC, vouch_id DESC`
    )
    .bind(profileId)
    .all<Pick<VouchRow, "vouch_id" | "created_at">>();
  const rows = result.results ?? [];
  const vouchCount = rows.length;
  const latestAcceptedVouchAt = rows[0]?.created_at ?? null;
  const credentialIdsJson = JSON.stringify(rows.map((r) => r.vouch_id));

  let state: VerificationSummaryRow["state"] = "registered";
  let level = 1;
  let label = "Registered";
  let method: VerificationSummaryRow["method"] = "registered";

  if (existing?.state === "steward") {
    state = "steward";
    level = Math.max(existing.level, 3);
    label = existing.label || "Steward";
    method = "steward";
  } else if (vouchCount >= VOUCH_THRESHOLD) {
    state = "verified_human";
    level = 2;
    label = "Vouched Human";
    method = "vouch";
  } else if (
    existing?.state === "verified_human" &&
    existing.method !== "vouch"
  ) {
    state = existing.state;
    level = existing.level;
    label = existing.label;
    method = existing.method;
  }

  const resultUpdate = await db
    .prepare(
      `UPDATE verification_summaries
       SET state = ?, level = ?, label = ?, method = ?, vouch_count = ?,
           latest_accepted_vouch_at = ?, credential_ids_json = ?, updated_at = ?
       WHERE profile_id = ?`
    )
    .bind(
      state,
      level,
      label,
      method,
      vouchCount,
      latestAcceptedVouchAt,
      credentialIdsJson,
      updatedAt,
      profileId
    )
    .run();
  if (!resultUpdate.success) {
    throw new Error(resultUpdate.error ?? "D1 update verification summary failed");
  }

  return {
    profile_id: profileId,
    state,
    level,
    label,
    method,
    vouch_count: vouchCount,
    latest_accepted_vouch_at: latestAcceptedVouchAt,
    credential_ids_json: credentialIdsJson,
    summary_document_json: existing?.summary_document_json ?? null,
    updated_at: updatedAt,
  };
}
