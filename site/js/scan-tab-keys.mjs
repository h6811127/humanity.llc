/**
 * Scan pages: tab-key presence heartbeat + cross-tab vouch notice.
 * @see docs/VOUCH_READY_KEYS_DESIGN.md Phase 4
 */
import { renderCrossTabKeysBanner } from "./device-cross-tab-banner.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

startTabKeysPresence();
renderCrossTabKeysBanner();
