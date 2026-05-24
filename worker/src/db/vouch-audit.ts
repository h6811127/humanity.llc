import { VOUCHER_ACTIVE_QUOTA_PER_YEAR } from "./verification";

type VouchAuditRow = {
  voucher_profile_id: string;
  vouchee_profile_id: string;
  status: "active" | "revoked";
  created_at: string;
};

type ClosedLoopFlag = {
  kind: "closed_loop_only";
  voucher_profile_id: string;
  related_profile_ids: string[];
  active_outgoing_count: number;
};

type QuotaBurstFlag = {
  kind: "burst_at_quota_boundary";
  voucher_profile_id: string;
  issuance_count: number;
  window_hours: number;
  first_created_at: string;
  last_created_at: string;
};

type SharedVoucherSetFlag = {
  kind: "shared_voucher_set";
  vouchee_profile_ids: [string, string];
  shared_voucher_profile_ids: string[];
  similarity: number;
};

export type VouchAuditFlag =
  | ClosedLoopFlag
  | QuotaBurstFlag
  | SharedVoucherSetFlag;

export interface ListVouchAuditFlagsOptions {
  maxRows?: number;
  quotaWindowDays?: number;
  burstWindowHours?: number;
  sharedSetMinOverlap?: number;
  sharedSetSimilarityThreshold?: number;
  now?: string;
}

const DEFAULT_MAX_ROWS = 1000;
const DEFAULT_QUOTA_WINDOW_DAYS = 365;
const DEFAULT_BURST_WINDOW_HOURS = 24;
const DEFAULT_SHARED_SET_MIN_OVERLAP = 3;
const DEFAULT_SHARED_SET_SIMILARITY_THRESHOLD = 0.75;

/**
 * Operator-only M6 abuse hooks. These aggregate public vouch rows for manual
 * steward review; they are intentionally not routed to public resolver APIs.
 */
export async function listVouchAuditFlags(
  db: D1Database,
  options: ListVouchAuditFlagsOptions = {}
): Promise<VouchAuditFlag[]> {
  const rows = await listRecentVouches(db, options.maxRows ?? DEFAULT_MAX_ROWS);
  const now = Date.parse(options.now ?? new Date().toISOString());
  const quotaWindowMs =
    (options.quotaWindowDays ?? DEFAULT_QUOTA_WINDOW_DAYS) * 24 * 60 * 60 * 1000;
  const quotaRows = rows.filter((row) => {
    const t = Date.parse(row.created_at);
    return Number.isFinite(t) && Number.isFinite(now) && now - t <= quotaWindowMs;
  });

  return [
    ...flagClosedLoops(rows),
    ...flagQuotaBursts(quotaRows, {
      burstWindowHours: options.burstWindowHours ?? DEFAULT_BURST_WINDOW_HOURS,
    }),
    ...flagSharedVoucherSets(rows, {
      minOverlap: options.sharedSetMinOverlap ?? DEFAULT_SHARED_SET_MIN_OVERLAP,
      similarityThreshold:
        options.sharedSetSimilarityThreshold ?? DEFAULT_SHARED_SET_SIMILARITY_THRESHOLD,
    }),
  ];
}

async function listRecentVouches(
  db: D1Database,
  maxRows: number
): Promise<VouchAuditRow[]> {
  const result = await db
    .prepare(
      `SELECT voucher_profile_id, vouchee_profile_id, status, created_at
       FROM vouches
       ORDER BY created_at DESC, vouch_id DESC
       LIMIT ?`
    )
    .bind(maxRows)
    .all<VouchAuditRow>();
  return result.results ?? [];
}

function flagClosedLoops(rows: VouchAuditRow[]): ClosedLoopFlag[] {
  const outgoing = new Map<string, Set<string>>();
  const activeRows = rows.filter((row) => row.status === "active");
  for (const row of activeRows) {
    const targets = outgoing.get(row.voucher_profile_id) ?? new Set<string>();
    targets.add(row.vouchee_profile_id);
    outgoing.set(row.voucher_profile_id, targets);
  }

  const flags: ClosedLoopFlag[] = [];
  for (const [voucher, targets] of outgoing.entries()) {
    const related = [...targets].sort();
    if (
      related.length > 0 &&
      related.every((target) => outgoing.get(target)?.has(voucher))
    ) {
      flags.push({
        kind: "closed_loop_only",
        voucher_profile_id: voucher,
        related_profile_ids: related,
        active_outgoing_count: related.length,
      });
    }
  }
  return flags.sort((a, b) => a.voucher_profile_id.localeCompare(b.voucher_profile_id));
}

function flagQuotaBursts(
  rows: VouchAuditRow[],
  options: { burstWindowHours: number }
): QuotaBurstFlag[] {
  const byVoucher = new Map<string, VouchAuditRow[]>();
  for (const row of rows) {
    const group = byVoucher.get(row.voucher_profile_id) ?? [];
    group.push(row);
    byVoucher.set(row.voucher_profile_id, group);
  }

  const burstWindowMs = options.burstWindowHours * 60 * 60 * 1000;
  const flags: QuotaBurstFlag[] = [];
  for (const [voucher, group] of byVoucher.entries()) {
    if (group.length < VOUCHER_ACTIVE_QUOTA_PER_YEAR) continue;
    const sorted = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const firstMs = Date.parse(first.created_at);
    const lastMs = Date.parse(last.created_at);
    if (
      Number.isFinite(firstMs) &&
      Number.isFinite(lastMs) &&
      lastMs - firstMs <= burstWindowMs
    ) {
      flags.push({
        kind: "burst_at_quota_boundary",
        voucher_profile_id: voucher,
        issuance_count: group.length,
        window_hours: options.burstWindowHours,
        first_created_at: first.created_at,
        last_created_at: last.created_at,
      });
    }
  }
  return flags.sort((a, b) => a.voucher_profile_id.localeCompare(b.voucher_profile_id));
}

function flagSharedVoucherSets(
  rows: VouchAuditRow[],
  options: { minOverlap: number; similarityThreshold: number }
): SharedVoucherSetFlag[] {
  const byVouchee = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.status !== "active") continue;
    const vouchers = byVouchee.get(row.vouchee_profile_id) ?? new Set<string>();
    vouchers.add(row.voucher_profile_id);
    byVouchee.set(row.vouchee_profile_id, vouchers);
  }

  const vouchees = [...byVouchee.keys()].sort();
  const flags: SharedVoucherSetFlag[] = [];
  for (let i = 0; i < vouchees.length; i++) {
    for (let j = i + 1; j < vouchees.length; j++) {
      const a = vouchees[i]!;
      const b = vouchees[j]!;
      const aSet = byVouchee.get(a)!;
      const bSet = byVouchee.get(b)!;
      const shared = [...aSet].filter((voucher) => bSet.has(voucher)).sort();
      if (shared.length < options.minOverlap) continue;
      const unionSize = new Set([...aSet, ...bSet]).size;
      const similarity = shared.length / unionSize;
      if (similarity >= options.similarityThreshold) {
        flags.push({
          kind: "shared_voucher_set",
          vouchee_profile_ids: [a, b],
          shared_voucher_profile_ids: shared,
          similarity,
        });
      }
    }
  }
  return flags.sort((a, b) =>
    a.vouchee_profile_ids.join(":").localeCompare(b.vouchee_profile_ids.join(":"))
  );
}
