/**
 * When /created/ should run the live-proof challenge poll loop (Safari P3).
 * Live proof panel scroll-into-view rules: docs/CREATED_TASK_DASHBOARD.md
 * @see docs/SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md
 */

/** Minimum visible px before we treat the panel as salient without scrolling. */
export const LIVE_PROOF_PANEL_MIN_VISIBLE_PX = 72;

/** Panel top must sit within this fraction of viewport height (from top). */
export const LIVE_PROOF_PANEL_TOP_VIEWPORT_FRACTION = 0.55;

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

/**
 * View-mode /created/: detect pending live-proof requests without signing keys loaded.
 *
 * @param {{ documentVisible: boolean }} scope
 */
export function createdLiveProofPendingPollShouldRun(scope) {
  return scope.documentVisible === true;
}

/**
 * Whether `#live-control-proof` is already salient without scrolling.
 *
 * @param {{
 *   panelTop: number,
 *   panelBottom: number,
 *   viewportHeight: number,
 *   minVisiblePx?: number,
 *   topViewportFraction?: number,
 * }} rect
 */
export function liveProofPanelMostlyVisible(rect) {
  const { panelTop, panelBottom, viewportHeight } = rect;
  const minVisible = rect.minVisiblePx ?? LIVE_PROOF_PANEL_MIN_VISIBLE_PX;
  const topFraction = rect.topViewportFraction ?? LIVE_PROOF_PANEL_TOP_VIEWPORT_FRACTION;
  if (viewportHeight <= 0) return true;
  const visibleHeight = Math.min(panelBottom, viewportHeight) - Math.max(panelTop, 0);
  if (visibleHeight < minVisible) return false;
  return panelTop >= 0 && panelTop <= viewportHeight * topFraction;
}

/**
 * @param {{
 *   reason: 'poll_discovered' | 'deeplink' | 'visibility_resume',
 *   panelMostlyVisible: boolean,
 * }} input
 */
export function shouldScrollLiveProofPanelIntoView(input) {
  if (input.panelMostlyVisible) return false;
  return (
    input.reason === "poll_discovered" ||
    input.reason === "deeplink" ||
    input.reason === "visibility_resume"
  );
}
