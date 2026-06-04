/**
 * Shell bfcache resume — hide stale personalized UI before refresh settles.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-12
 */
import { invalidateCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { markDotBootPending } from "./device-status-dot-boot.mjs";
import { resetDotBootstrapSettledForResume } from "./device-status-dot-boot-core.mjs";
import { resetResolverHealthBootSettled } from "./device-resolver-health-boot-core.mjs";
import { markDeviceBootPending } from "./device-shell-boot.mjs";
import { resetSinceVisitGateOnShellResume } from "./device-wallet-since-visit-gate.mjs?v=93";
import { resetLiveControlInboxOnShellResume } from "./device-live-control-inbox.mjs";
import {
  shouldHandleShellBfcacheRestore,
  SHELL_BFCACHE_RESTORE_EVENT,
} from "./device-shell-resume-core.mjs";

export { SHELL_BFCACHE_RESTORE_EVENT } from "./device-shell-resume-core.mjs";

let resumeGateBound = false;

/**
 * Synchronous bfcache restore: re-enter boot pending, reset in-memory truth, notify listeners.
 * @param {Document | undefined} doc
 */
export function handleShellBfcacheRestore(doc = document) {
  markDeviceBootPending(doc);
  resetResolverHealthBootSettled();
  markDotBootPending(doc);
  resetDotBootstrapSettledForResume();
  resetSinceVisitGateOnShellResume();
  resetLiveControlInboxOnShellResume();
  invalidateCrossTabNotificationState();
  doc?.defaultView?.dispatchEvent(new Event(SHELL_BFCACHE_RESTORE_EVENT));
}

/**
 * @param {Window | undefined} win
 */
export function initShellBfcacheResumeGate(win = window) {
  if (resumeGateBound || !win?.addEventListener) return;
  resumeGateBound = true;
  win.addEventListener("pageshow", (ev) => {
    if (
      !shouldHandleShellBfcacheRestore({
        persisted: ev.persisted,
        pathname: win.location?.pathname ?? "",
      })
    ) {
      return;
    }
    handleShellBfcacheRestore(win.document);
  });
}
