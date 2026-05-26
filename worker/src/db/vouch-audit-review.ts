import type { VouchAuditFlag } from "./vouch-audit";

export interface VouchAuditDismissalRow {
  flag_key: string;
  flag_kind: VouchAuditFlag["kind"];
  note: string;
  dismissed_by: string;
  dismissed_at: string;
  updated_at: string;
}

export function vouchAuditFlagKey(flag: VouchAuditFlag): string {
  switch (flag.kind) {
    case "closed_loop_only":
      return [
        flag.kind,
        flag.voucher_profile_id,
        ...[...flag.related_profile_ids].sort(),
      ].join("|");
    case "burst_at_quota_boundary":
      return [
        flag.kind,
        flag.voucher_profile_id,
        String(flag.issuance_count),
        flag.first_created_at,
        flag.last_created_at,
      ].join("|");
    case "steward_issuance_burst":
      return [
        flag.kind,
        flag.voucher_profile_id,
        String(flag.issuance_count),
        flag.first_created_at,
        flag.last_created_at,
      ].join("|");
    case "shared_voucher_set":
      return [
        flag.kind,
        ...[...flag.vouchee_profile_ids].sort(),
        ...[...flag.shared_voucher_profile_ids].sort(),
      ].join("|");
    case "directed_cycle_cluster":
      return [flag.kind, ...[...flag.profile_ids].sort()].join("|");
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export async function listVouchAuditDismissals(
  db: D1Database,
  keys: string[]
): Promise<VouchAuditDismissalRow[]> {
  if (keys.length === 0) return [];
  const placeholders = keys.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT flag_key, flag_kind, note, dismissed_by, dismissed_at, updated_at
       FROM vouch_audit_dismissals
       WHERE flag_key IN (${placeholders})`
    )
    .bind(...keys)
    .all<VouchAuditDismissalRow>();
  return result.results ?? [];
}

export async function upsertVouchAuditDismissal(
  db: D1Database,
  row: {
    flagKey: string;
    flagKind: VouchAuditFlag["kind"];
    note: string;
    dismissedBy: string;
    dismissedAt: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vouch_audit_dismissals
         (flag_key, flag_kind, note, dismissed_by, dismissed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(flag_key) DO UPDATE SET
         flag_kind = excluded.flag_kind,
         note = excluded.note,
         dismissed_by = excluded.dismissed_by,
         dismissed_at = excluded.dismissed_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      row.flagKey,
      row.flagKind,
      row.note,
      row.dismissedBy,
      row.dismissedAt,
      row.dismissedAt
    )
    .run();
}

export async function deleteVouchAuditDismissal(
  db: D1Database,
  flagKey: string
): Promise<boolean> {
  const res = await db
    .prepare(`DELETE FROM vouch_audit_dismissals WHERE flag_key = ?`)
    .bind(flagKey)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
