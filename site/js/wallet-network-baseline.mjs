/**
 * Pure helpers for revoked-since-visit detection (testable without resolver imports).
 */

/** Baseline / alert value when the card profile is disabled on the network. */
export const CARD_REVOKED_ALERT_STATE = "card_revoked";

/**
 * Map resolver scan.kind (+ optional legacy card.status) to alert baseline state.
 * Only card-level disablement triggers “revoked since last visit”; QR-only revoke does not.
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
