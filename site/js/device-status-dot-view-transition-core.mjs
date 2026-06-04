/**
 * Status dot View Transitions policy — skip cross-fade when it reads as load flash.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-14
 */
import { dotTransitionKey } from "./device-dot-state-core.mjs?v=90";
import { isDeviceBootReadyState } from "./device-shell-boot-core.mjs?v=90";
import { shouldSkipCrossTabOverlayViewTransition } from "./device-presence-inbox-stability-core.mjs?v=90";

/**
 * @param {{
 *   prefersReducedMotion?: boolean;
 *   hubSheetOpen?: boolean;
 *   viewTransitionsSupported?: boolean;
 *   shellBootState?: string | undefined;
 *   dotBootstrapSettled?: boolean;
 *   previousSnapshot?: { network: string; device: string; overlay: string } | null;
 *   nextSnapshot: { network: string; device: string; overlay: string };
 * }} input
 */
export function shouldSkipDotViewTransition(input) {
  if (input.prefersReducedMotion) return true;
  if (input.hubSheetOpen) return true;
  if (!input.viewTransitionsSupported) return true;
  if (
    shouldSkipCrossTabOverlayViewTransition(input.previousSnapshot ?? null, input.nextSnapshot)
  ) {
    return true;
  }
  if (!isDeviceBootReadyState(input.shellBootState)) return true;
  if (!input.dotBootstrapSettled) return true;
  if (input.previousSnapshot == null) return true;

  const prevKey = dotTransitionKey(
    input.previousSnapshot.network,
    input.previousSnapshot.device,
    input.previousSnapshot.overlay
  );
  const nextKey = dotTransitionKey(
    input.nextSnapshot.network,
    input.nextSnapshot.device,
    input.nextSnapshot.overlay
  );
  return prevKey === nextKey;
}
