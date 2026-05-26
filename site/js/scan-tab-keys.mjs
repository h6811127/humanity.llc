/**
 * Scan pages: tab-key presence + cross-tab notice (same chrome refresh path as shell).
 * @see docs/VOUCH_READY_KEYS_DESIGN.md Phase 4
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 3
 */
import {
  refreshDeviceChrome,
  startDeviceChromeRefresh,
} from "./device-chrome-refresh.mjs?v=37";
import { startCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

startTabKeysPresence();
startCrossTabNotificationState();
startDeviceChromeRefresh();
refreshDeviceChrome({ immediate: true });
