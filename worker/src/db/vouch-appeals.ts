export interface VouchAppealRow {
  appeal_id: string;
  reference_code: string | null;
  case_id: string;
  profile_id: string;
  statement: string;
  contact_method: string | null;
  created_at: string;
}

export interface InsertVouchAppealParams {
  appealId: string;
  referenceCode: string | null;
  caseId: string;
  profileId: string;
  statement: string;
  contactMethod: string | null;
  now: string;
}

export async function insertVouchAppeal(
  db: D1Database,
  params: InsertVouchAppealParams
): Promise<VouchAppealRow> {
  const result = await db
    .prepare(
      `INSERT INTO vouch_appeals (
         appeal_id, reference_code, case_id, profile_id, statement, contact_method, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.appealId,
      params.referenceCode,
      params.caseId,
      params.profileId,
      params.statement,
      params.contactMethod,
      params.now
    )
    .run();
  if (!result.success) {
    throw new Error(result.error ?? "D1 insert vouch appeal failed");
  }
  const row = await db
    .prepare(`SELECT * FROM vouch_appeals WHERE appeal_id = ?`)
    .bind(params.appealId)
    .first<VouchAppealRow>();
  if (!row) throw new Error("D1 inserted vouch appeal but could not read it back");
  return row;
}
