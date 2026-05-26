import {
  listVouchAuditFlags,
  type ListVouchAuditFlagsOptions,
  type VouchAuditFlag,
} from "../db/vouch-audit";
import {
  deleteVouchAuditDismissal,
  listVouchAuditDismissals,
  upsertVouchAuditDismissal,
  vouchAuditFlagKey,
} from "../db/vouch-audit-review";
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

type DismissRequest = {
  flag_key?: unknown;
  flag_kind?: unknown;
  note?: unknown;
  dismissed_by?: unknown;
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
    case "directed_cycle_cluster":
      return {
        priority: "high",
        action:
          "Review directed cycle cluster; inspect clique suspicion and batch-vouch edges before dismissing.",
        threat_ids: ["G-02", "R-02", "G-07"],
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
  const keys = flags.map((flag) => vouchAuditFlagKey(flag));
  const dismissals = await listVouchAuditDismissals(db, keys);
  const dismissedByKey = new Map(dismissals.map((row) => [row.flag_key, row]));
  const generatedAt = new Date().toISOString();

  return jsonResponse({
    generated_at: generatedAt,
    flag_count: flags.length,
    max_rows_scanned: maxRows,
    playbook: "docs/VOUCH_STEWARD_REVIEW_RUNBOOK.md",
    flags: flags.map((flag) => ({
      flag_key: vouchAuditFlagKey(flag),
      ...flag,
      triage: triageForFlag(flag),
      dismissal: dismissedByKey.get(vouchAuditFlagKey(flag)) ?? null,
    })),
  });
}

/**
 * POST /.well-known/hc/v1/operator/vouch-audit-flags/dismiss
 * Body: { flag_key, flag_kind, note, dismissed_by? }
 */
export async function handlePostVouchAuditFlagDismiss(
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

  let body: DismissRequest;
  try {
    body = (await request.json()) as DismissRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const flagKey = typeof body.flag_key === "string" ? body.flag_key.trim() : "";
  const flagKind = body.flag_kind;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const dismissedByRaw =
    typeof body.dismissed_by === "string" ? body.dismissed_by.trim() : "";
  const dismissedBy = dismissedByRaw || "operator";

  if (!flagKey) {
    return errorResponse("INVALID_FLAG_KEY", "flag_key is required.", 422);
  }
  if (
    flagKind !== "closed_loop_only" &&
    flagKind !== "burst_at_quota_boundary" &&
    flagKind !== "shared_voucher_set" &&
    flagKind !== "directed_cycle_cluster"
  ) {
    return errorResponse("INVALID_FLAG_KIND", "flag_kind is invalid.", 422);
  }
  if (!note || note.length > 500) {
    return errorResponse(
      "INVALID_NOTE",
      "note is required and must be 1-500 characters.",
      422
    );
  }
  if (!dismissedBy || dismissedBy.length > 120) {
    return errorResponse(
      "INVALID_DISMISSED_BY",
      "dismissed_by must be 1-120 characters when provided.",
      422
    );
  }

  const now = new Date().toISOString();
  await upsertVouchAuditDismissal(db, {
    flagKey,
    flagKind,
    note,
    dismissedBy,
    dismissedAt: now,
  });

  return jsonResponse(
    {
      ok: true,
      dismissal: {
        flag_key: flagKey,
        flag_kind: flagKind,
        note,
        dismissed_by: dismissedBy,
        dismissed_at: now,
        updated_at: now,
      },
    },
    200
  );
}

/**
 * DELETE /.well-known/hc/v1/operator/vouch-audit-flags/dismiss
 * Body: { flag_key }
 */
export async function handleDeleteVouchAuditFlagDismiss(
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

  let body: { flag_key?: unknown };
  try {
    body = (await request.json()) as { flag_key?: unknown };
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }
  const flagKey = typeof body.flag_key === "string" ? body.flag_key.trim() : "";
  if (!flagKey) {
    return errorResponse("INVALID_FLAG_KEY", "flag_key is required.", 422);
  }

  const deleted = await deleteVouchAuditDismissal(db, flagKey);
  return jsonResponse({ ok: true, deleted, flag_key: flagKey }, 200);
}
