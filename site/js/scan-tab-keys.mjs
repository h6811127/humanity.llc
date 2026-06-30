/**
 * Scan pages: quiet rehydrate (D10) + tab-key presence + cross-tab notice.
 * @see docs/SAFARI_KEYS_CUSTODY.md P0-1
 * @see docs/QUIET_TAB_REHYDRATE.md
 * @see docs/VOUCH_READY_KEYS_DESIGN.md Phase 4
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 3
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 8
 */
import "./scan-page-dot.mjs?v=9";
import "./scan-live-proof-owner-watch.mjs?v=2";
import {
  refreshDeviceChrome,
  startDeviceChromeRefresh,
} from "./device-chrome-refresh.mjs?v=56";
import { startCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { maybeQuietTabRehydrateForScan } from "./device-quiet-tab-rehydrate.mjs";
import { markResolverHealthBootSettled } from "./device-resolver-health-boot-core.mjs";
import { markDeviceBootReady } from "./device-shell-boot.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

/** Scan vouchee profile — never quiet-rehydrate the card being scanned (multi-wallet vouch). */
function readScanVoucheeProfileId() {
  const header = document.getElementById("scan-safety-header");
  const fromHeader =
    header instanceof HTMLElement ? header.dataset.profileId?.trim() : "";
  if (fromHeader) return fromHeader;
  const vouchRow = document.getElementById("vouch-row");
  const fromVouch =
    vouchRow instanceof HTMLElement ? vouchRow.dataset.voucheeProfileId?.trim() : "";
  return fromVouch || null;
}

startTabKeysPresence();
startCrossTabNotificationState();
await maybeQuietTabRehydrateForScan({ excludeProfileId: readScanVoucheeProfileId() });
// Scan HTML has no data-boot=pending; unlock cross-tab chrome for presence reads (RC-6).
markResolverHealthBootSettled();
markDeviceBootReady();
startDeviceChromeRefresh();
refreshDeviceChrome({ immediate: true });
