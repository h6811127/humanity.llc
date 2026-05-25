/**
 * Pure helpers for revoked-since-visit detection (testable without resolver imports).
 */

/** Baseline / alert value when the card profile is disabled on the network. */
export const CARD_REVOKED_ALERT_STATE = "card_revoked";

/** Hub row alert (card-level disable only — not QR-only revoke). */
export const CARD_DISABLED_SINCE_VISIT_ALERT_TEXT =
  "Card disabled on the network since your last visit.";

/** Hub search / hubSearchable snippet when the since-visit alert is visible. */
export const CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET = "card disabled since last visit";

/** Hub glance subtitle suffix when the since-visit alert applies. */
export const CARD_DISABLED_SINCE_VISIT_GLANCE_SUFFIX = "Card disabled since last visit";

/**
 * Map resolver scan.kind (+ optional legacy card.status) to alert baseline state.
 * Only card-level disablement triggers the since-visit alert; QR-only revoke does not.
 * @param {string | null | undefined} scanKind
 * @param {string | null | undefined} [cardStatus]
 */
export function alertStateFromScanKind(scanKind, cardStatus) {
  if (scanKind === "card_revoked") return CARD_REVOKED_ALERT_STATE;
  return "active";
}

/**
 * @param {string | null | undefined} value
 */
export function normalizeBaselineState(value) {
  const s = String(value || "").toLowerCase();
  if (s === "revoked" || s === CARD_REVOKED_ALERT_STATE) return CARD_REVOKED_ALERT_STATE;
  return s;
}

/**
 * @param {string | null | undefined} lastSeenStatus
 * @param {string | null | undefined} currentAlertState
 */
export function isRevokedSinceLastVisitFromBaseline(lastSeenStatus, currentAlertState) {
  const current = normalizeBaselineState(currentAlertState);
  if (current !== CARD_REVOKED_ALERT_STATE) return false;
  if (lastSeenStatus == null || lastSeenStatus === "") return false;
  const lastNorm = normalizeBaselineState(lastSeenStatus);
  if (lastNorm === CARD_REVOKED_ALERT_STATE) return false;
  return true;
}
