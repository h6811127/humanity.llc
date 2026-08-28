/**
 * D1 helpers for WS-DOCKET DG-store-v0.
 */

export type DocketEditProposalStoreRow = {
  case_id: string;
  proposals_json: string;
  updated_at: string;
  created_at: string;
};

export async function getDocketEditProposalStore(
  db: D1Database,
  caseId: string
): Promise<DocketEditProposalStoreRow | null> {
  return (
    (await db
      .prepare(
        `SELECT case_id, proposals_json, updated_at, created_at
         FROM docket_edit_proposal_stores
         WHERE case_id = ?`
      )
      .bind(caseId)
      .first<DocketEditProposalStoreRow>()) ?? null
  );
}

export async function upsertDocketEditProposalStore(
  db: D1Database,
  row: DocketEditProposalStoreRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO docket_edit_proposal_stores (
         case_id, proposals_json, updated_at, created_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT(case_id) DO UPDATE SET
         proposals_json = excluded.proposals_json,
         updated_at = excluded.updated_at`
    )
    .bind(row.case_id, row.proposals_json, row.updated_at, row.created_at)
    .run();
}
