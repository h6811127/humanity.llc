/**
 * Scan pages: quiet rehydrate (D10) + tab-key presence + cross-tab notice.
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0-1
 * @see docs/QUIET_TAB_REHYDRATE.md
 * @see docs/VOUCH_READY_KEYS_DESIGN.md Phase 4
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 3
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 8
 */
import "./scan-page-dot.mjs?v=8";
import {
  refreshDeviceChrome,
  startDeviceChromeRefresh,
} from "./device-chrome-refresh.mjs?v=56";
import { startCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { maybeQuietTabRehydrate } from "./device-quiet-tab-rehydrate.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

await maybeQuietTabRehydrate();

startTabKeysPresence();
startCrossTabNotificationState();
startDeviceChromeRefresh();
refreshDeviceChrome({ immediate: true });
