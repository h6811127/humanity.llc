import { buildVouchTransparencyCounters } from "../db/vouch-transparency";
import { errorResponse, jsonResponse } from "../http/resolver";
import { operatorAuditAuthorized } from "../http/operator-auth";

/**
 * GET /.well-known/hc/v1/operator/vouch-transparency
 * Operator-only aggregate transparency counters. No raw graph/report exports.
 */
export async function handleGetVouchTransparency(
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

  const counters = await buildVouchTransparencyCounters(db);
  return jsonResponse(counters, 200);
}
