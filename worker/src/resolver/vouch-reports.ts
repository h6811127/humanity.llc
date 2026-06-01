import { getCardByProfileId } from "../db/cards";
import { checkVouchReportRateLimit, hashIp } from "../db/rate-limit";
import {
  createVouchCase,
  getOpenVouchCaseBySource,
  normalizeProfileIds,
  normalizeVouchIds,
} from "../db/vouch-cases";
import {
  isVouchReportKind,
  parseVouchReportTarget,
  priorityForReportKind,
  publicReportSourceKey,
  summarizePublicReport,
  threatIdsForReportKind,
  vouchCaseKindFromReportKind,
} from "../db/vouch-report-intake-core";
import { insertVouchReport } from "../db/vouch-reports";
import { getVouchById } from "../db/verification";
import { clientIp, errorResponse, jsonResponse } from "../http/resolver";

type VouchReportBody = {
  kind?: unknown;
  target?: unknown;
  statement?: unknown;
  contact_method?: unknown;
};

function generateReportId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `report_${random.slice(0, 32)}`;
}

function generateCaseId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `case_${random.slice(0, 32)}`;
}

function generateReferenceCode(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `vrr_${random.slice(0, 12)}`;
}

/**
 * POST /.well-known/hc/v1/vouch-reports
 * Public trust-and-safety report intake (no auth).
 */
export async function handlePostVouchReport(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: VouchReportBody;
  try {
    body = (await request.json()) as VouchReportBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  if (!isVouchReportKind(body.kind)) {
    return errorResponse("INVALID_REPORT_KIND", "Report kind is invalid.", 422);
  }

  const targetRaw = typeof body.target === "string" ? body.target.trim() : "";
  if (!targetRaw) {
    return errorResponse("INVALID_TARGET", "target is required.", 422);
  }

  const parsed = parseVouchReportTarget(targetRaw);
  if (!parsed) {
    return errorResponse(
      "INVALID_TARGET",
      "target must be a humanity.llc scan URL, profile id, or vouch id.",
      422
    );
  }

  const statement = typeof body.statement === "string" ? body.statement.trim() : "";
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
  const rate = await checkVouchReportRateLimit(db, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many reports from this network. Try again later.",
      429,
      rate.retryAfterSec
        ? { "Retry-After": String(rate.retryAfterSec) }
        : undefined
    );
  }

  let subjectProfileIds = [...parsed.profileIds];
  let subjectVouchIds = [...parsed.vouchIds];

  for (const vouchId of parsed.vouchIds) {
    const vouch = await getVouchById(db, vouchId);
    if (!vouch) {
      return errorResponse("VOUCH_NOT_FOUND", "Vouch id was not found.", 404);
    }
    subjectProfileIds.push(vouch.voucher_profile_id, vouch.vouchee_profile_id);
  }

  subjectProfileIds = normalizeProfileIds(subjectProfileIds);
  subjectVouchIds = normalizeVouchIds(subjectVouchIds);

  if (subjectProfileIds.length === 0) {
    return errorResponse(
      "INVALID_TARGET",
      "Could not resolve a profile from the target.",
      422
    );
  }

  for (const profileId of subjectProfileIds) {
    const card = await getCardByProfileId(db, profileId);
    if (!card) {
      return errorResponse("PROFILE_NOT_FOUND", "Profile target was not found.", 404);
    }
  }

  const primaryProfileId = subjectProfileIds[0];
  const sourceKey = publicReportSourceKey(body.kind, primaryProfileId);
  const now = new Date().toISOString();
  const reportId = generateReportId();
  const referenceCode = contactMethod ? generateReferenceCode() : null;

  let existingCase = await getOpenVouchCaseBySource(db, "public_report", sourceKey);
  let caseRow = existingCase;

  if (!caseRow) {
    caseRow = await createVouchCase(db, {
      caseId: generateCaseId(),
      kind: vouchCaseKindFromReportKind(body.kind),
      source: "public_report",
      sourceKey,
      subjectProfileIds,
      subjectVouchIds,
      priority: priorityForReportKind(body.kind),
      threatIds: threatIdsForReportKind(body.kind),
      summary: summarizePublicReport(body.kind, statement, targetRaw),
      createdBy: "public_report",
      now,
    });
  }

  const reportRow = await insertVouchReport(db, {
    reportId,
    referenceCode,
    kind: body.kind,
    targetRaw,
    targetProfileId: parsed.profileIds[0] ?? subjectProfileIds[0] ?? null,
    targetVouchId: parsed.vouchIds[0] ?? null,
    targetScanUrl: parsed.scanUrl,
    statement,
    contactMethod,
    caseId: caseRow.case_id,
    now,
  });

  return jsonResponse(
    {
      ok: true,
      report_id: reportRow.report_id,
      reference_code: reportRow.reference_code,
    },
    201
  );
}
