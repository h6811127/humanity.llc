/**
 * Delegated child capability — spec types and validation (Order 6).
 * Resolver routes deferred until DELEGATED_CHILD_CAPABILITIES_GATE G1–G5 pass.
 * @see docs/DELEGATED_CHILD_CAPABILITY_SCHEMA.md
 */

export const DELEGATION_SPEC_VERSION = "1.0";

export const DELEGATED_ALLOWED_OPERATIONS = [
  "child_object.update",
  "child_object.issue_qr",
  "child_object.revoke_qr",
  "child_object.revoke",
  "print_artifact.issue_qr",
] as const;

export type DelegatedAllowedOperation = (typeof DELEGATED_ALLOWED_OPERATIONS)[number];

export const DELEGATED_FORBIDDEN_OPERATIONS = [
  "card.update",
  "card.revoke",
  "vouch.create",
  "vouch.accept",
  "capability.grant",
  "scan.analytics",
] as const;

export type DelegatedCapabilityDocument = {
  version: string;
  capability_id: string;
  parent_profile_id: string;
  delegated_public_key: string;
  operations: DelegatedAllowedOperation[];
  scope: {
    object_ids: string[];
    print_artifact_ids?: string[];
  };
  label: string;
  expires_at: string;
  status: "active" | "revoked";
  created_at: string;
};

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isDelegatedAllowedOperation(
  value: string
): value is DelegatedAllowedOperation {
  return (DELEGATED_ALLOWED_OPERATIONS as readonly string[]).includes(value);
}

/** Shape check for capability documents — no signature verification. */
export function validateDelegatedCapabilityShape(doc: unknown): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!doc || typeof doc !== "object") {
    return { ok: false, issues: ["capability document must be an object."] };
  }
  const row = doc as Record<string, unknown>;
  for (const field of [
    "capability_id",
    "parent_profile_id",
    "delegated_public_key",
    "label",
    "expires_at",
    "created_at",
  ]) {
    if (typeof row[field] !== "string" || !String(row[field]).trim()) {
      issues.push(`${field} is required.`);
    }
  }
  if (row.version !== DELEGATION_SPEC_VERSION) {
    issues.push(`version must be "${DELEGATION_SPEC_VERSION}".`);
  }
  if (row.status !== "active" && row.status !== "revoked") {
    issues.push('status must be "active" or "revoked".');
  }
  if (typeof row.expires_at === "string" && !ISO_RE.test(row.expires_at.trim())) {
    issues.push("expires_at must be ISO 8601.");
  }
  if (!Array.isArray(row.operations) || row.operations.length === 0) {
    issues.push("operations must be a non-empty array.");
  } else {
    for (const op of row.operations) {
      if (typeof op !== "string" || !isDelegatedAllowedOperation(op)) {
        issues.push(`forbidden or unknown operation: ${String(op)}`);
      }
    }
  }
  const scope = row.scope;
  if (!scope || typeof scope !== "object") {
    issues.push("scope is required.");
  } else {
    const scopeObj = scope as Record<string, unknown>;
    if (!Array.isArray(scopeObj.object_ids)) {
      issues.push("scope.object_ids must be an array.");
    }
    if (
      scopeObj.print_artifact_ids != null &&
      !Array.isArray(scopeObj.print_artifact_ids)
    ) {
      issues.push("scope.print_artifact_ids must be an array when set.");
    }
  }
  for (const forbidden of DELEGATED_FORBIDDEN_OPERATIONS) {
    if (Array.isArray(row.operations) && row.operations.includes(forbidden)) {
      issues.push(`forbidden operation: ${forbidden}`);
    }
  }
  return { ok: issues.length === 0, issues };
}
