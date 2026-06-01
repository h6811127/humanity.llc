import type { VouchReportKind } from "./vouch-report-intake-core";

export interface VouchReportRow {
  report_id: string;
  reference_code: string | null;
  kind: VouchReportKind;
  target_raw: string;
  target_profile_id: string | null;
  target_vouch_id: string | null;
  target_scan_url: string | null;
  statement: string;
  contact_method: string | null;
  case_id: string;
  created_at: string;
}

export interface InsertVouchReportParams {
  reportId: string;
  referenceCode: string | null;
  kind: VouchReportKind;
  targetRaw: string;
  targetProfileId: string | null;
  targetVouchId: string | null;
  targetScanUrl: string | null;
  statement: string;
  contactMethod: string | null;
  caseId: string;
  now: string;
}

export async function insertVouchReport(
  db: D1Database,
  params: InsertVouchReportParams
): Promise<VouchReportRow> {
  const result = await db
    .prepare(
      `INSERT INTO vouch_reports (
         report_id, reference_code, kind, target_raw, target_profile_id,
         target_vouch_id, target_scan_url, statement, contact_method, case_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.reportId,
      params.referenceCode,
      params.kind,
      params.targetRaw,
      params.targetProfileId,
      params.targetVouchId,
      params.targetScanUrl,
      params.statement,
      params.contactMethod,
      params.caseId,
      params.now
    )
    .run();
  if (!result.success) {
    throw new Error(result.error ?? "D1 insert vouch report failed");
  }
  const row = await db
    .prepare(`SELECT * FROM vouch_reports WHERE report_id = ?`)
    .bind(params.reportId)
    .first<VouchReportRow>();
  if (!row) throw new Error("D1 inserted vouch report but could not read it back");
  return row;
}
