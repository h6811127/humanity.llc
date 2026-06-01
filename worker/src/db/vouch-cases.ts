import type { VouchAuditFlag } from "./vouch-audit";
import { vouchAuditFlagKey } from "./vouch-audit-review";

export const VOUCH_CASE_KINDS = [
  "vouch_graph",
  "steward_burst",
  "false_vouch",
  "statement_abuse",
  "impersonation",
  "harassment",
  "other",
] as const;
export type VouchCaseKind = (typeof VOUCH_CASE_KINDS)[number];

export const VOUCH_CASE_SOURCES = [
  "audit_flag",
  "operator_manual",
  "public_report",
] as const;
export type VouchCaseSource = (typeof VOUCH_CASE_SOURCES)[number];

export const VOUCH_CASE_STATUSES = [
  "open",
  "watching",
  "action_required",
  "dismissed",
  "suspended",
  "appealed",
  "closed",
] as const;
export type VouchCaseStatus = (typeof VOUCH_CASE_STATUSES)[number];

export const VOUCH_CASE_PRIORITIES = ["p0", "p1", "p2"] as const;
export type VouchCasePriority = (typeof VOUCH_CASE_PRIORITIES)[number];

export interface VouchCaseRow {
  case_id: string;
  kind: VouchCaseKind;
  source: VouchCaseSource;
  source_key: string;
  subject_profile_ids_json: string;
  subject_vouch_ids_json: string;
  status: VouchCaseStatus;
  priority: VouchCasePriority;
  threat_ids_json: string;
  summary: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export const VOUCH_SUSPENSION_CAUSE_CATEGORIES = [
  "impersonation",
  "vouch_abuse",
  "harassment",
  "illegal_content",
  "security_compromise",
  "other",
] as const;
export type VouchSuspensionCauseCategory =
  (typeof VOUCH_SUSPENSION_CAUSE_CATEGORIES)[number];

export interface VouchCaseSuspensionRow {
  suspension_id: string;
  case_id: string;
  profile_id: string;
  status: "suspended";
  public_label: string;
  cause_category: VouchSuspensionCauseCategory;
  notice: string;
  appeal_deadline: string;
  signed_document_json: string | null;
  suspended_by: string;
  suspended_at: string;
  created_at: string;
}

export interface CreateVouchCaseParams {
  caseId: string;
  kind: VouchCaseKind;
  source: VouchCaseSource;
  sourceKey: string;
  subjectProfileIds: string[];
  subjectVouchIds?: string[];
  status?: VouchCaseStatus;
  priority: VouchCasePriority;
  threatIds: string[];
  summary: string;
  createdBy: string;
  assignedTo?: string | null;
  now: string;
}

export interface SuspendVouchCaseProfileParams {
  suspensionId: string;
  caseId: string;
  profileId: string;
  causeCategory: VouchSuspensionCauseCategory;
  notice: string;
  appealDeadline: string;
  signedDocumentJson?: string | null;
  suspendedBy: string;
  now: string;
}

const OPEN_CASE_STATUSES: readonly VouchCaseStatus[] = [
  "open",
  "watching",
  "action_required",
  "appealed",
  "suspended",
];

export function isVouchCaseKind(value: unknown): value is VouchCaseKind {
  return (
    typeof value === "string" &&
    (VOUCH_CASE_KINDS as readonly string[]).includes(value)
  );
}

export function isVouchCasePriority(value: unknown): value is VouchCasePriority {
  return (
    typeof value === "string" &&
    (VOUCH_CASE_PRIORITIES as readonly string[]).includes(value)
  );
}

export function isVouchSuspensionCauseCategory(
  value: unknown
): value is VouchSuspensionCauseCategory {
  return (
    typeof value === "string" &&
    (VOUCH_SUSPENSION_CAUSE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function normalizeProfileIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function normalizeVouchIds(ids: string[] = []): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export async function listVouchCases(
  db: D1Database,
  options: { status?: VouchCaseStatus; source?: VouchCaseSource; limit?: number } = {}
): Promise<VouchCaseRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  if (options.status && options.source) {
    const result = await db
      .prepare(
        `SELECT *
         FROM vouch_cases
         WHERE status = ? AND source = ?
         ORDER BY updated_at DESC, case_id DESC
         LIMIT ?`
      )
      .bind(options.status, options.source, limit)
      .all<VouchCaseRow>();
    return result.results ?? [];
  }
  if (options.status) {
    const result = await db
      .prepare(
        `SELECT *
         FROM vouch_cases
         WHERE status = ?
         ORDER BY updated_at DESC, case_id DESC
         LIMIT ?`
      )
      .bind(options.status, limit)
      .all<VouchCaseRow>();
    return result.results ?? [];
  }
  if (options.source) {
    const result = await db
      .prepare(
        `SELECT *
         FROM vouch_cases
         WHERE source = ?
         ORDER BY updated_at DESC, case_id DESC
         LIMIT ?`
      )
      .bind(options.source, limit)
      .all<VouchCaseRow>();
    return result.results ?? [];
  }
  const result = await db
    .prepare(
      `SELECT *
       FROM vouch_cases
       ORDER BY updated_at DESC, case_id DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<VouchCaseRow>();
  return result.results ?? [];
}

export async function getOpenVouchCaseBySource(
  db: D1Database,
  source: VouchCaseSource,
  sourceKey: string
): Promise<VouchCaseRow | null> {
  const placeholders = OPEN_CASE_STATUSES.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT *
       FROM vouch_cases
       WHERE source = ?
         AND source_key = ?
         AND status IN (${placeholders})
       ORDER BY updated_at DESC, case_id DESC
       LIMIT 1`
    )
    .bind(source, sourceKey, ...OPEN_CASE_STATUSES)
    .first<VouchCaseRow>();
}

export async function getVouchCaseById(
  db: D1Database,
  caseId: string
): Promise<VouchCaseRow | null> {
  return db
    .prepare(`SELECT * FROM vouch_cases WHERE case_id = ?`)
    .bind(caseId)
    .first<VouchCaseRow>();
}

export async function getLatestSuspensionForProfile(
  db: D1Database,
  profileId: string
): Promise<VouchCaseSuspensionRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM vouch_case_suspensions
       WHERE profile_id = ?
       ORDER BY suspended_at DESC, suspension_id DESC
       LIMIT 1`
    )
    .bind(profileId)
    .first<VouchCaseSuspensionRow>();
}

export async function updateVouchCaseStatus(
  db: D1Database,
  caseId: string,
  status: VouchCaseStatus,
  updatedAt: string
): Promise<VouchCaseRow | null> {
  const result = await db
    .prepare(
      `UPDATE vouch_cases
       SET status = ?, updated_at = ?
       WHERE case_id = ?`
    )
    .bind(status, updatedAt, caseId)
    .run();
  if (!result.success || (result.meta?.changes ?? 0) === 0) return null;
  return getVouchCaseById(db, caseId);
}

export async function createVouchCase(
  db: D1Database,
  params: CreateVouchCaseParams
): Promise<VouchCaseRow> {
  const subjectProfileIds = normalizeProfileIds(params.subjectProfileIds);
  const subjectVouchIds = normalizeVouchIds(params.subjectVouchIds);
  const result = await db
    .prepare(
      `INSERT INTO vouch_cases (
         case_id, kind, source, source_key, subject_profile_ids_json,
         subject_vouch_ids_json, status, priority, threat_ids_json, summary,
         created_by, assigned_to, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.caseId,
      params.kind,
      params.source,
      params.sourceKey,
      JSON.stringify(subjectProfileIds),
      JSON.stringify(subjectVouchIds),
      params.status ?? "open",
      params.priority,
      JSON.stringify(normalizeVouchIds(params.threatIds)),
      params.summary,
      params.createdBy,
      params.assignedTo ?? null,
      params.now,
      params.now
    )
    .run();
  if (!result.success) {
    throw new Error(result.error ?? "D1 insert vouch case failed");
  }
  const row = await db
    .prepare(`SELECT * FROM vouch_cases WHERE case_id = ?`)
    .bind(params.caseId)
    .first<VouchCaseRow>();
  if (!row) throw new Error("D1 inserted vouch case but could not read it back");
  return row;
}

export async function suspendProfileForVouchCase(
  db: D1Database,
  params: SuspendVouchCaseProfileParams
): Promise<VouchCaseSuspensionRow> {
  const insert = await db
    .prepare(
      `INSERT INTO vouch_case_suspensions (
         suspension_id, case_id, profile_id, status, public_label, cause_category,
         notice, appeal_deadline, signed_document_json, suspended_by, suspended_at,
         created_at
       ) VALUES (?, ?, ?, 'suspended', 'Suspended under public rules', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.suspensionId,
      params.caseId,
      params.profileId,
      params.causeCategory,
      params.notice,
      params.appealDeadline,
      params.signedDocumentJson ?? null,
      params.suspendedBy,
      params.now,
      params.now
    )
    .run();
  if (!insert.success) {
    throw new Error(insert.error ?? "D1 insert vouch suspension failed");
  }

  const cardUpdate = await db
    .prepare(
      `UPDATE cards
       SET status = 'suspended', updated_at = ?
       WHERE profile_id = ?`
    )
    .bind(params.now, params.profileId)
    .run();
  if (!cardUpdate.success || (cardUpdate.meta?.changes ?? 0) === 0) {
    throw new Error("CARD_NOT_FOUND");
  }

  const caseUpdate = await db
    .prepare(
      `UPDATE vouch_cases
       SET status = 'suspended', updated_at = ?
       WHERE case_id = ?`
    )
    .bind(params.now, params.caseId)
    .run();
  if (!caseUpdate.success || (caseUpdate.meta?.changes ?? 0) === 0) {
    throw new Error("CASE_NOT_FOUND");
  }

  const row = await db
    .prepare(`SELECT * FROM vouch_case_suspensions WHERE suspension_id = ?`)
    .bind(params.suspensionId)
    .first<VouchCaseSuspensionRow>();
  if (!row) {
    throw new Error("D1 inserted vouch suspension but could not read it back");
  }
  return row;
}

export function vouchCaseInputFromAuditFlag(flag: VouchAuditFlag): {
  kind: VouchCaseKind;
  source: "audit_flag";
  sourceKey: string;
  subjectProfileIds: string[];
  priority: VouchCasePriority;
  threatIds: string[];
  summary: string;
} {
  switch (flag.kind) {
    case "closed_loop_only":
      return {
        kind: "vouch_graph",
        source: "audit_flag",
        sourceKey: vouchAuditFlagKey(flag),
        subjectProfileIds: [flag.voucher_profile_id, ...flag.related_profile_ids],
        priority: "p1",
        threatIds: ["G-01", "R-02"],
        summary: `Closed-loop vouch review for ${flag.voucher_profile_id}.`,
      };
    case "burst_at_quota_boundary":
      return {
        kind: "vouch_graph",
        source: "audit_flag",
        sourceKey: vouchAuditFlagKey(flag),
        subjectProfileIds: [flag.voucher_profile_id],
        priority: "p0",
        threatIds: ["G-03", "S-02", "V-04", "A-02"],
        summary: `Quota-boundary burst review for ${flag.voucher_profile_id}.`,
      };
    case "steward_issuance_burst":
      return {
        kind: "steward_burst",
        source: "audit_flag",
        sourceKey: vouchAuditFlagKey(flag),
        subjectProfileIds: [flag.voucher_profile_id],
        priority: "p0",
        threatIds: ["S-02", "R-03", "A-02"],
        summary: `Steward issuance burst review for ${flag.voucher_profile_id}.`,
      };
    case "shared_voucher_set":
      return {
        kind: "vouch_graph",
        source: "audit_flag",
        sourceKey: vouchAuditFlagKey(flag),
        subjectProfileIds: [
          ...flag.vouchee_profile_ids,
          ...flag.shared_voucher_profile_ids,
        ],
        priority: "p1",
        threatIds: ["G-04", "G-07"],
        summary: "Shared voucher set review for overlapping vouchees.",
      };
    case "directed_cycle_cluster":
      return {
        kind: "vouch_graph",
        source: "audit_flag",
        sourceKey: vouchAuditFlagKey(flag),
        subjectProfileIds: flag.profile_ids,
        priority: "p0",
        threatIds: ["G-02", "R-02", "G-07"],
        summary: "Directed cycle cluster review.",
      };
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}
