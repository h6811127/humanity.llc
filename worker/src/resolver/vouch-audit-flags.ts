import {
  listVouchAuditFlags,
  type ListVouchAuditFlagsOptions,
  type VouchAuditFlag,
} from "../db/vouch-audit";
import { errorResponse, jsonResponse } from "../http/resolver";
import { operatorAuditAuthorized } from "../http/operator-auth";

const DEFAULT_MAX_ROWS = 1000;
const MIN_MAX_ROWS = 1;
const MAX_MAX_ROWS = 5000;

function parseMaxRows(raw: string | null): number | null {
  if (raw === null || raw === "") return DEFAULT_MAX_ROWS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < MIN_MAX_ROWS || n > MAX_MAX_ROWS) return null;
  return n;
}

type TriageHint = {
  priority: "high" | "medium" | "low";
  action: string;
  threat_ids: string[];
};

function triageForFlag(flag: VouchAuditFlag): TriageHint {
  switch (flag.kind) {
    case "closed_loop_only":
      return {
        priority: "medium",
        action:
          "Review mutual vouch pair; check for 4-clique VH elevation (R-02). Dismiss if legitimate friends.",
        threat_ids: ["G-01", "R-02"],
      };
    case "burst_at_quota_boundary":
      return {
        priority: "high",
        action:
          "Confirm steward legitimacy or possible stolen keys; inspect all five vouchees before dismiss.",
        threat_ids: ["G-03", "S-02", "V-04", "A-02"],
      };
    case "shared_voucher_set":
      return {
        priority: "medium",
        action:
          "Compare overlapping vouchees; check for Sybil laundry (G-07). May be benign cohort.",
        threat_ids: ["G-04", "G-07"],
      };
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

/**
 * GET /.well-known/hc/v1/operator/vouch-audit-flags
 * Operator-only M6 Step 4 review queue (read-only). See docs/VOUCH_STEWARD_REVIEW_RUNBOOK.md.
 */
export async function handleGetVouchAuditFlags(
  request: Request,
  db: D1Database,
  operatorAuditToken: string | undefined
): Promise<Response> {
  if (!operatorAuditToken) {
    return errorResponse(
      "OPERATOR_AUDIT_UNCONFIGURED",
      "Operator audit token is not configured on this resolver.",
      503
    );
  }

  if (!operatorAuditAuthorized(request, operatorAuditToken)) {
    return errorResponse(
      "UNAUTHORIZED",
      "Valid Bearer OPERATOR_AUDIT_TOKEN required.",
      401
    );
  }

  const url = new URL(request.url);
  const maxRows = parseMaxRows(url.searchParams.get("max_rows"));
  if (maxRows === null) {
    return errorResponse(
      "INVALID_QUERY",
      `max_rows must be an integer from ${MIN_MAX_ROWS} to ${MAX_MAX_ROWS}.`,
      400
    );
  }

  const options: ListVouchAuditFlagsOptions = { maxRows };
  const flags = await listVouchAuditFlags(db, options);
  const generatedAt = new Date().toISOString();

  return jsonResponse({
    generated_at: generatedAt,
    flag_count: flags.length,
    max_rows_scanned: maxRows,
    playbook: "docs/VOUCH_STEWARD_REVIEW_RUNBOOK.md",
    flags: flags.map((flag) => ({
      ...flag,
      triage: triageForFlag(flag),
    })),
  });
}
