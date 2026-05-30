/**
 * Hub-open wallet summary integrity heartbeat (RC-15).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-15
 */

import { refreshDeviceHub } from "./device-hub-ui.mjs";
import { reconcileWalletSummaryIntegrity } from "./device-wallet.mjs";

export function runHubOpenWalletIntegrityHeartbeat() {
  const result = reconcileWalletSummaryIntegrity();
  if (result.repaired) {
    refreshDeviceHub();
  }
  return result;
}
