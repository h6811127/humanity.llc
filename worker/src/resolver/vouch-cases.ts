import { listVouchAuditFlags } from "../db/vouch-audit";
import { vouchAuditFlagKey } from "../db/vouch-audit-review";
import {
  createVouchCase,
  getOpenVouchCaseBySource,
  isVouchCaseKind,
  isVouchCasePriority,
  listVouchCases,
  normalizeProfileIds,
  normalizeVouchIds,
  VOUCH_CASE_SOURCES,
  VOUCH_CASE_STATUSES,
  vouchCaseInputFromAuditFlag,
  type VouchCasePriority,
  type VouchCaseRow,
  type VouchCaseSource,
  type VouchCaseStatus,
} from "../db/vouch-cases";
import { errorResponse, jsonResponse } from "../http/resolver";
import { operatorAuditAuthorized } from "../http/operator-auth";

const DEFAULT_CASE_LIMIT = 100;
const MAX_CASE_LIMIT = 500;
const DEFAULT_AUDIT_MAX_ROWS = 1000;
const MAX_AUDIT_MAX_ROWS = 5000;

type CreateCaseBody = {
  source?: unknown;
  flag_key?: unknown;
  max_rows?: unknown;
  kind?: unknown;
  source_key?: unknown;
  subject_profile_ids?: unknown;
  subject_vouch_ids?: unknown;
  priority?: unknown;
  threat_ids?: unknown;
  summary?: unknown;
  created_by?: unknown;
  assigned_to?: unknown;
};

function generateCaseId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `case_${random.slice(0, 32)}`;
}

function parseBoundedInt(
  raw: string | null,
  fallback: number,
  max: number
): number | null {
  if (raw === null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > max) return null;
  return n;
}

function parseBodyBoundedInt(
  raw: unknown,
  fallback: number,
  max: number
): number | null {
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > max) return null;
  return n;
}

function authError(
  request: Request,
  operatorAuditToken: string | undefined
): Response | null {
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
  return null;
}

function isCaseStatus(value: string): value is VouchCaseStatus {
  return (VOUCH_CASE_STATUSES as readonly string[]).includes(value);
}

function isCaseSource(value: string): value is VouchCaseSource {
  return (VOUCH_CASE_SOURCES as readonly string[]).includes(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length === value.length ? strings : null;
}

function optionalText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function serializeCase(row: VouchCaseRow): Record<string, unknown> {
  return {
    case_id: row.case_id,
    kind: row.kind,
    source: row.source,
    source_key: row.source_key,
    subject_profile_ids: JSON.parse(row.subject_profile_ids_json),
    subject_vouch_ids: JSON.parse(row.subject_vouch_ids_json),
    status: row.status,
    priority: row.priority,
    threat_ids: JSON.parse(row.threat_ids_json),
    summary: row.summary,
    created_by: row.created_by,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /.well-known/hc/v1/operator/vouch-cases
 * Operator-only vouch trust-and-safety case list.
 */
export async function handleGetVouchCases(
  request: Request,
  db: D1Database,
  operatorAuditToken: string | undefined
): Promise<Response> {
  const unauthorized = authError(request, operatorAuditToken);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const limit = parseBoundedInt(
    url.searchParams.get("limit"),
    DEFAULT_CASE_LIMIT,
    MAX_CASE_LIMIT
  );
  if (limit === null) {
    return errorResponse(
      "INVALID_QUERY",
      `limit must be an integer from 1 to ${MAX_CASE_LIMIT}.`,
      400
    );
  }

  const statusRaw = url.searchParams.get("status");
  const sourceRaw = url.searchParams.get("source");
  const status = statusRaw && isCaseStatus(statusRaw) ? statusRaw : undefined;
  const source = sourceRaw && isCaseSource(sourceRaw) ? sourceRaw : undefined;
  if (statusRaw && !status) {
    return errorResponse("INVALID_QUERY", "status is invalid.", 400);
  }
  if (sourceRaw && !source) {
    return errorResponse("INVALID_QUERY", "source is invalid.", 400);
  }

  const rows = await listVouchCases(db, { status, source, limit });
  return jsonResponse(
    {
      case_count: rows.length,
      cases: rows.map(serializeCase),
    },
    200
  );
}

/**
 * POST /.well-known/hc/v1/operator/vouch-cases
 * Body: { source: "audit_flag", flag_key } or manual case fields.
 */
export async function handlePostVouchCase(
  request: Request,
  db: D1Database,
  operatorAuditToken: string | undefined
): Promise<Response> {
  const unauthorized = authError(request, operatorAuditToken);
  if (unauthorized) return unauthorized;

  let body: CreateCaseBody;
  try {
    body = (await request.json()) as CreateCaseBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const source = typeof body.source === "string" ? body.source : "";
  if (source === "audit_flag") {
    return handlePostAuditFlagCase(body, db);
  }
  if (source === "operator_manual") {
    return handlePostManualCase(body, db);
  }
  return errorResponse(
    "INVALID_CASE_SOURCE",
    "source must be audit_flag or operator_manual.",
    422
  );
}

async function handlePostAuditFlagCase(
  body: CreateCaseBody,
  db: D1Database
): Promise<Response> {
  const flagKey = typeof body.flag_key === "string" ? body.flag_key.trim() : "";
  if (!flagKey) {
    return errorResponse("INVALID_FLAG_KEY", "flag_key is required.", 422);
  }
  const maxRows = parseBodyBoundedInt(
    body.max_rows,
    DEFAULT_AUDIT_MAX_ROWS,
    MAX_AUDIT_MAX_ROWS
  );
  if (maxRows === null) {
    return errorResponse(
      "INVALID_MAX_ROWS",
      `max_rows must be an integer from 1 to ${MAX_AUDIT_MAX_ROWS}.`,
      422
    );
  }

  const flags = await listVouchAuditFlags(db, { maxRows });
  const flag = flags.find((candidate) => vouchAuditFlagKey(candidate) === flagKey);
  if (!flag) {
    return errorResponse(
      "AUDIT_FLAG_NOT_FOUND",
      "No current vouch audit flag matched flag_key.",
      404
    );
  }

  const input = vouchCaseInputFromAuditFlag(flag);
  const existing = await getOpenVouchCaseBySource(db, "audit_flag", input.sourceKey);
  if (existing) {
    return jsonResponse({ created: false, case: serializeCase(existing) }, 200);
  }

  const now = new Date().toISOString();
  const row = await createVouchCase(db, {
    caseId: generateCaseId(),
    ...input,
    createdBy: optionalText(body.created_by, "operator"),
    assignedTo:
      typeof body.assigned_to === "string" && body.assigned_to.trim()
        ? body.assigned_to.trim()
        : null,
    now,
  });
  return jsonResponse({ created: true, case: serializeCase(row) }, 201);
}

async function handlePostManualCase(
  body: CreateCaseBody,
  db: D1Database
): Promise<Response> {
  if (!isVouchCaseKind(body.kind)) {
    return errorResponse("INVALID_CASE_KIND", "kind is invalid.", 422);
  }
  const subjectProfileIds = stringArray(body.subject_profile_ids);
  if (!subjectProfileIds || normalizeProfileIds(subjectProfileIds).length === 0) {
    return errorResponse(
      "INVALID_SUBJECT_PROFILES",
      "subject_profile_ids must include at least one profile id.",
      422
    );
  }
  const subjectVouchIds = body.subject_vouch_ids
    ? stringArray(body.subject_vouch_ids)
    : [];
  if (!subjectVouchIds) {
    return errorResponse(
      "INVALID_SUBJECT_VOUCHES",
      "subject_vouch_ids must be an array of strings when provided.",
      422
    );
  }
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!summary || summary.length > 500) {
    return errorResponse(
      "INVALID_SUMMARY",
      "summary is required and must be 1-500 characters.",
      422
    );
  }
  const priority: VouchCasePriority = isVouchCasePriority(body.priority)
    ? body.priority
    : "p1";
  const threatIdsRaw = body.threat_ids ? stringArray(body.threat_ids) : [];
  if (!threatIdsRaw) {
    return errorResponse(
      "INVALID_THREAT_IDS",
      "threat_ids must be an array of strings when provided.",
      422
    );
  }

  const now = new Date().toISOString();
  const caseId = generateCaseId();
  const sourceKey =
    typeof body.source_key === "string" && body.source_key.trim()
      ? body.source_key.trim()
      : caseId;
  const existing = await getOpenVouchCaseBySource(db, "operator_manual", sourceKey);
  if (existing) {
    return jsonResponse({ created: false, case: serializeCase(existing) }, 200);
  }

  const row = await createVouchCase(db, {
    caseId,
    kind: body.kind,
    source: "operator_manual",
    sourceKey,
    subjectProfileIds,
    subjectVouchIds,
    priority,
    threatIds: threatIdsRaw,
    summary,
    createdBy: optionalText(body.created_by, "operator"),
    assignedTo:
      typeof body.assigned_to === "string" && body.assigned_to.trim()
        ? body.assigned_to.trim()
        : null,
    now,
  });
  return jsonResponse({ created: true, case: serializeCase(row) }, 201);
}
