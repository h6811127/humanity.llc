import { listVouchAuditFlags } from "./vouch-audit";

type CountRow = { key: string; n: number };
type CaseAgeRow = {
  priority: "p0" | "p1" | "p2";
  status: string;
  created_at: string;
  updated_at: string;
};
type CaseSubjectRow = { subject_vouch_ids_json: string };
type VouchIdRow = { vouch_id: string };

function emptyCounts(): Record<string, number> {
  return {};
}

function rowsToCounts(rows: CountRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) out[row.key] = row.n;
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export interface VouchTransparencyCounters {
  generated_at: string;
  current_audit_flags_by_kind: Record<string, number>;
  cases_opened_by_kind: Record<string, number>;
  cases_closed_by_kind: Record<string, number>;
  reports_received_by_kind: Record<string, number>;
  profiles_suspended: number;
  profiles_restored: number;
  appeals_opened: number;
  appeals_resolved: number;
  vouches_revoked_after_review: number;
  median_review_age_hours_by_priority: Record<"p0" | "p1" | "p2", number | null>;
  privacy: {
    raw_graph_exported: false;
    report_statements_exported: false;
    subject_profile_ids_exported: false;
  };
}

export async function buildVouchTransparencyCounters(
  db: D1Database,
  now = new Date()
): Promise<VouchTransparencyCounters> {
  const flags = await listVouchAuditFlags(db);
  const currentAuditFlagsByKind = emptyCounts();
  for (const flag of flags) {
    currentAuditFlagsByKind[flag.kind] = (currentAuditFlagsByKind[flag.kind] ?? 0) + 1;
  }

  const casesOpened = await db
    .prepare(`SELECT kind AS key, COUNT(*) AS n FROM vouch_cases GROUP BY kind`)
    .all<CountRow>();

  const casesClosed = await db
    .prepare(
      `SELECT kind AS key, COUNT(*) AS n
       FROM vouch_cases
       WHERE status IN ('dismissed', 'suspended', 'appealed', 'closed')
       GROUP BY kind`
    )
    .all<CountRow>();

  const reports = await db
    .prepare(`SELECT kind AS key, COUNT(*) AS n FROM vouch_reports GROUP BY kind`)
    .all<CountRow>();

  const suspended = await db
    .prepare(
      `SELECT COUNT(DISTINCT profile_id) AS n FROM vouch_case_suspensions`
    )
    .first<{ n: number }>();

  const appeals = await db
    .prepare(`SELECT COUNT(*) AS n FROM vouch_appeals`)
    .first<{ n: number }>();

  const reviewedCaseRows = await db
    .prepare(
      `SELECT subject_vouch_ids_json
       FROM vouch_cases
       WHERE status IN ('dismissed', 'suspended', 'appealed', 'closed')`
    )
    .all<CaseSubjectRow>();
  const reviewedVouchIds = new Set<string>();
  for (const row of reviewedCaseRows.results ?? []) {
    for (const vouchId of parseJsonStringArray(row.subject_vouch_ids_json)) {
      reviewedVouchIds.add(vouchId);
    }
  }

  const revokedVouches = await db
    .prepare(`SELECT vouch_id FROM vouches WHERE status = 'revoked'`)
    .all<VouchIdRow>();
  let vouchesRevokedAfterReview = 0;
  for (const row of revokedVouches.results ?? []) {
    if (reviewedVouchIds.has(row.vouch_id)) vouchesRevokedAfterReview += 1;
  }

  const ageRows = await db
    .prepare(
      `SELECT priority, status, created_at, updated_at
       FROM vouch_cases
       WHERE status IN ('dismissed', 'suspended', 'appealed', 'closed')`
    )
    .all<CaseAgeRow>();
  const ages: Record<"p0" | "p1" | "p2", number[]> = { p0: [], p1: [], p2: [] };
  for (const row of ageRows.results ?? []) {
    const created = Date.parse(row.created_at);
    const updated = Date.parse(row.updated_at);
    if (!Number.isFinite(created) || !Number.isFinite(updated)) continue;
    ages[row.priority].push(Math.max(0, (updated - created) / 3600_000));
  }

  return {
    generated_at: now.toISOString(),
    current_audit_flags_by_kind: currentAuditFlagsByKind,
    cases_opened_by_kind: rowsToCounts(casesOpened.results ?? []),
    cases_closed_by_kind: rowsToCounts(casesClosed.results ?? []),
    reports_received_by_kind: rowsToCounts(reports.results ?? []),
    profiles_suspended: suspended?.n ?? 0,
    profiles_restored: 0,
    appeals_opened: appeals?.n ?? 0,
    appeals_resolved: 0,
    vouches_revoked_after_review: vouchesRevokedAfterReview,
    median_review_age_hours_by_priority: {
      p0: median(ages.p0),
      p1: median(ages.p1),
      p2: median(ages.p2),
    },
    privacy: {
      raw_graph_exported: false,
      report_statements_exported: false,
      subject_profile_ids_exported: false,
    },
  };
}
