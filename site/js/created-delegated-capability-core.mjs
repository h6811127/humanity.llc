/** Pure helpers for delegated capability steward UI (step 17). */

export const DELEGATION_SPEC_VERSION = "1.0";
export const PAYLOAD_TYPE_DELEGATED_CAPABILITY = "delegated_capability";

/** Pilot templates — volunteer + shop shift (step 17). */
export const DELEGATED_CAPABILITY_OPERATION_OPTIONS = [
  { id: "child_object.update", label: "Update object copy (status / relay message)" },
  { id: "child_object.issue_qr", label: "Issue scan link for scoped object" },
  { id: "child_object.revoke_qr", label: "Revoke scan link for scoped object or print" },
];

/**
 * @param {() => string} [randomSuffix]
 */
export function generateCapabilityId(randomSuffix = defaultRandomSuffix) {
  return `cap_${randomSuffix()}`;
}

function defaultRandomSuffix() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @param {Date} [now]
 */
export function defaultDelegatedExpiresAt(now = new Date()) {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/**
 * @param {string} iso
 */
export function formatDelegatedExpiresLabel(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * @param {string} iso
 */
export function delegatedExpiresAtToDatetimeLocalValue(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * @param {string} value datetime-local
 */
export function datetimeLocalValueToIsoUtc(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * @param {string[]} selectedOperationIds
 */
export function normalizeDelegatedOperations(selectedOperationIds) {
  const allowed = new Set(DELEGATED_CAPABILITY_OPERATION_OPTIONS.map((o) => o.id));
  const ops = [...new Set(selectedOperationIds.filter((id) => allowed.has(id)))];
  ops.sort();
  return ops;
}

/**
 * @param {{
 *   parentProfileId: string;
 *   delegatedPublicKey: string;
 *   objectId: string;
 *   operations: string[];
 *   label: string;
 *   expiresAt: string;
 *   capabilityId?: string;
 *   createdAt?: string;
 * }} input
 */
export function buildDelegatedCapabilityIssueUnsigned(input) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: input.capabilityId ?? generateCapabilityId(),
    parent_profile_id: input.parentProfileId,
    delegated_public_key: input.delegatedPublicKey,
    operations: normalizeDelegatedOperations(input.operations),
    scope: {
      object_ids: [input.objectId],
      print_artifact_ids: [],
    },
    label: input.label.trim(),
    expires_at: input.expiresAt,
    status: "active",
    created_at: createdAt,
  };
}

/**
 * @param {Record<string, unknown>} activeRow from resolver list
 */
export function buildDelegatedCapabilityRevokeUnsigned(activeRow) {
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: String(activeRow.capability_id),
    parent_profile_id: String(activeRow.parent_profile_id ?? activeRow.profile_id ?? ""),
    delegated_public_key: String(activeRow.delegated_public_key),
    operations: Array.isArray(activeRow.operations) ? activeRow.operations : [],
    scope:
      activeRow.scope && typeof activeRow.scope === "object"
        ? activeRow.scope
        : { object_ids: [], print_artifact_ids: [] },
    label: String(activeRow.label),
    expires_at: String(activeRow.expires_at),
    status: "revoked",
    created_at: String(activeRow.created_at),
  };
}

/**
 * @param {{ status: string; expires_at: string }} row
 * @param {number} [nowMs]
 */
export function delegatedCapabilityRowSummary(row, nowMs = Date.now()) {
  if (row.status === "revoked") {
    return "Revoked";
  }
  const expiresMs = Date.parse(row.expires_at);
  if (Number.isFinite(expiresMs) && nowMs >= expiresMs) {
    return `Expired · ${formatDelegatedExpiresLabel(row.expires_at)}`;
  }
  return `Limited signer · expires ${formatDelegatedExpiresLabel(row.expires_at)}`;
}
