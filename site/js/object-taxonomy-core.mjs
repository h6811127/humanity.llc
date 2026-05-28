/** Shared root-card / child-object taxonomy for scan and device surfaces. */

export const QR_SCOPE_CARD = "card";
export const QR_SCOPE_PRINT_ARTIFACT = "print_artifact";
export const QR_SCOPE_CHILD_OBJECT = "child_object";

/**
 * @param {unknown} scope
 * @returns {"card" | "print_artifact" | "child_object" | null}
 */
export function normalizeQrScope(scope) {
  const value = typeof scope === "string" ? scope.trim().toLowerCase() : "";
  if (value === QR_SCOPE_CARD) return QR_SCOPE_CARD;
  if (value === QR_SCOPE_PRINT_ARTIFACT) return QR_SCOPE_PRINT_ARTIFACT;
  if (value === QR_SCOPE_CHILD_OBJECT) return QR_SCOPE_CHILD_OBJECT;
  return null;
}

/**
 * @param {unknown} scope
 */
export function isChildObjectScope(scope) {
  const normalized = normalizeQrScope(scope);
  return normalized === QR_SCOPE_PRINT_ARTIFACT || normalized === QR_SCOPE_CHILD_OBJECT;
}

/**
 * @param {{ scope?: unknown, handle?: string | null }} input
 */
export function qrScopeRelationshipCopy({ scope, handle } = {}) {
  const cleanHandle = typeof handle === "string" ? handle.trim() : "";
  if (!cleanHandle) return null;
  if (isChildObjectScope(scope)) return `Controlled by @${cleanHandle}`;
  return `Controlled by @${cleanHandle}`;
}

/**
 * @param {unknown} scope
 */
export function qrTrustGroupScopeSubtitle(scope) {
  if (normalizeQrScope(scope) === QR_SCOPE_CHILD_OBJECT) {
    return "Child object — revoke this scan link without disabling the root card";
  }
  if (isChildObjectScope(scope)) {
    return "Printed item — revoke one artifact without killing the card";
  }
  return "Root card-scoped credential";
}

/**
 * @param {unknown} scope
 */
export function qrNoCalendarExpirySubtitle(scope) {
  if (isChildObjectScope(scope)) {
    return "This object QR stays valid until the owner revokes or replaces it";
  }
  return null;
}

/**
 * @param {{ pilotTemplate?: unknown, qrScope?: unknown }} input
 */
export function objectTypeLabelFromContext({ pilotTemplate, qrScope } = {}) {
  const pilot = typeof pilotTemplate === "string" ? pilotTemplate.trim().toLowerCase() : "";
  if (pilot === "status_plate") return { label: "Status plate", tone: "status-plate" };
  if (pilot === "lost_item_relay") return { label: "Lost item", tone: "lost-item" };
  if (normalizeQrScope(qrScope) === QR_SCOPE_CHILD_OBJECT) {
    return { label: "Status plate", tone: "status-plate" };
  }
  if (isChildObjectScope(qrScope)) return { label: "Printed item", tone: "wearable" };
  return { label: "Root card", tone: "general" };
}

