import { getCardStatusByProfileId } from "../db/cards";
import { checkVouchAppealRateLimit, hashIp } from "../db/rate-limit";
import { insertVouchAppeal } from "../db/vouch-appeals";
import {
  getLatestSuspensionForProfile,
  getVouchCaseById,
  normalizeProfileIds,
  updateVouchCaseStatus,
  type VouchCaseRow,
} from "../db/vouch-cases";
import { clientIp, errorResponse, jsonResponse } from "../http/resolver";

type VouchAppealBody = {
  case_id?: unknown;
  profile_id?: unknown;
  statement?: unknown;
  contact_method?: unknown;
};

const APPEALABLE_CASE_STATUSES = new Set(["suspended", "appealed"]);

function generateAppealId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `appeal_${random.slice(0, 32)}`;
}

function generateReferenceCode(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `vra_${random.slice(0, 12)}`;
}

function serializeCase(row: VouchCaseRow) {
  return {
    case_id: row.case_id,
    kind: row.kind,
    source: row.source,
    status: row.status,
    priority: row.priority,
    subject_profile_ids: JSON.parse(row.subject_profile_ids_json),
    subject_vouch_ids: JSON.parse(row.subject_vouch_ids_json),
  };
}

function profileIsCaseSubject(row: VouchCaseRow, profileId: string): boolean {
  const subjectProfileIds = normalizeProfileIds(
    JSON.parse(row.subject_profile_ids_json) as string[]
  );
  return subjectProfileIds.includes(profileId);
}

/**
 * POST /.well-known/hc/v1/vouch-appeals
 * Public appeal intake for suspended profiles (no auth).
 */
export async function handlePostVouchAppeal(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: VouchAppealBody;
  try {
    body = (await request.json()) as VouchAppealBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const caseId = typeof body.case_id === "string" ? body.case_id.trim() : "";
  if (!caseId || !caseId.startsWith("case_")) {
    return errorResponse("INVALID_CASE_ID", "case_id is required.", 422);
  }

  const profileId =
    typeof body.profile_id === "string" ? body.profile_id.trim() : "";
  if (!profileId) {
    return errorResponse("INVALID_PROFILE_ID", "profile_id is required.", 422);
  }

  const statement =
    typeof body.statement === "string" ? body.statement.trim() : "";
  if (!statement || statement.length > 1000) {
    return errorResponse(
      "INVALID_STATEMENT",
      "statement is required and must be 1-1000 characters.",
      422
    );
  }

  const contactMethod =
    typeof body.contact_method === "string" && body.contact_method.trim()
      ? body.contact_method.trim().slice(0, 200)
      : null;

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkVouchAppealRateLimit(db, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many appeals from this network. Try again later.",
      429,
      rate.retryAfterSec
        ? { "Retry-After": String(rate.retryAfterSec) }
        : undefined
    );
  }

  const card = await getCardStatusByProfileId(db, profileId);
  if (!card) {
    return errorResponse("PROFILE_NOT_FOUND", "Profile was not found.", 404);
  }
  if (card.status !== "suspended") {
    return errorResponse(
      "PROFILE_NOT_SUSPENDED",
      "Appeals are only accepted for suspended profiles.",
      422
    );
  }

  const caseRow = await getVouchCaseById(db, caseId);
  if (!caseRow) {
    return errorResponse("CASE_NOT_FOUND", "Case was not found.", 404);
  }
  if (!APPEALABLE_CASE_STATUSES.has(caseRow.status)) {
    return errorResponse(
      "CASE_NOT_APPEALABLE",
      "This case is not open for appeals.",
      422
    );
  }
  if (!profileIsCaseSubject(caseRow, profileId)) {
    return errorResponse(
      "PROFILE_NOT_CASE_SUBJECT",
      "profile_id is not a subject on this case.",
      422
    );
  }

  const suspension = await getLatestSuspensionForProfile(db, profileId);
  if (!suspension || suspension.case_id !== caseId) {
    return errorResponse(
      "SUSPENSION_CASE_MISMATCH",
      "No suspension record links this profile to the case.",
      422
    );
  }

  const now = new Date().toISOString();
  const appealId = generateAppealId();
  const referenceCode = contactMethod ? generateReferenceCode() : null;
  const wasSuspended = caseRow.status === "suspended";

  let updatedCase = caseRow;
  if (wasSuspended) {
    const appealed = await updateVouchCaseStatus(db, caseId, "appealed", now);
    if (!appealed) {
      return errorResponse("CASE_UPDATE_FAILED", "Could not update case status.", 500);
    }
    updatedCase = appealed;
  }

  const appealRow = await insertVouchAppeal(db, {
    appealId,
    referenceCode,
    caseId,
    profileId,
    statement,
    contactMethod,
    now,
  });

  return jsonResponse(
    {
      ok: true,
      appeal_id: appealRow.appeal_id,
      reference_code: appealRow.reference_code,
      case: serializeCase(updatedCase),
      case_status_changed: wasSuspended,
    },
    201
  );
}
