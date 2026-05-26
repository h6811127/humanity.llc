/**
 * Scan pages: tab-key presence + cross-tab notice (same chrome refresh path as shell).
 * @see docs/VOUCH_READY_KEYS_DESIGN.md Phase 4
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 3
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 8
 */
import "./scan-page-dot.mjs?v=5";
import {
  refreshDeviceChrome,
  startDeviceChromeRefresh,
} from "./device-chrome-refresh.mjs?v=38";
import { startCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

startTabKeysPresence();
startCrossTabNotificationState();
startDeviceChromeRefresh();
refreshDeviceChrome({ immediate: true });
