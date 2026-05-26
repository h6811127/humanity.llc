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

/** Chip / cache statuses that do not carry resolver card truth (DH-13). */
const UNREACHABLE_CHIP_STATUSES = new Set(["error", "offline", "checking"]);

/**
 * Alert baseline for a poll result — null when the network was not reached.
 * @param {string | null | undefined} scanKind
 * @param {string | null | undefined} [chipOrCardStatus]
 * @returns {string | null}
 */
export function alertStateForNetworkPoll(scanKind, chipOrCardStatus) {
  const chip = String(chipOrCardStatus || "").toLowerCase();
  if (UNREACHABLE_CHIP_STATUSES.has(chip)) return null;
  return alertStateFromScanKind(scanKind, chipOrCardStatus);
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

/**
 * Hub row "card disabled since last visit" banner.
 * @param {string | null | undefined} alertState From fresh resolver fetch (`alertStateMap`), not session cache.
 * @param {string | null | undefined} lastSeenStatus Device baseline (`hc_wallet_last_seen_network`).
 * @param {{ resolverConfirmed?: boolean }} [options]
 */
export function shouldShowCardDisabledSinceVisitAlert(
  alertState,
  lastSeenStatus,
  options = {}
) {
  if (!options.resolverConfirmed) return false;
  const current = String(alertState || "").toLowerCase();
  if (current !== CARD_REVOKED_ALERT_STATE) return false;
  return isRevokedSinceLastVisitFromBaseline(lastSeenStatus, current);
}

/**
 * Hub row visibility: resolver-confirmed card_revoked + baseline transition + scan.kind guard.
 * @param {string | null | undefined} alertState
 * @param {string | null | undefined} lastSeenStatus
 * @param {string | null | undefined} scanKind
 * @param {boolean} resolverConfirmed
 */
export function cardDisabledSinceVisitVisible(
  alertState,
  lastSeenStatus,
  scanKind,
  resolverConfirmed
) {
  const kind = String(scanKind || "").toLowerCase();
  if (kind && kind !== CARD_REVOKED_ALERT_STATE) return false;
  return shouldShowCardDisabledSinceVisitAlert(alertState, lastSeenStatus, {
    resolverConfirmed,
  });
}
