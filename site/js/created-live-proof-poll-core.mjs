/**
 * When /created/ should run the live-proof challenge poll loop (Safari P3).
 * @see docs/SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md
 */

/**
 * @param {{
 *   documentVisible: boolean,
 *   hasSigningKeys: boolean,
 * }} scope
 */
export function createdLiveProofPollShouldRun(scope) {
  if (!scope.documentVisible) return false;
  if (!scope.hasSigningKeys) return false;
  return true;
}
