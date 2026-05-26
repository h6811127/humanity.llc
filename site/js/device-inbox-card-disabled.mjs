/**
 * Resolver-backed card-disabled-since-visit rows for the unified inbox.
 * @see docs/DEVICE_INBOX.md
 */
import { loadWallet } from "./device-wallet.mjs";
import { listCardDisabledSinceVisit } from "./wallet-network-baseline.mjs";
import {
  getLatestResolvedAlertState,
  getLatestResolvedScanKind,
  getNetworkLastSeenBaseline,
  hasLatestResolverNetworkPoll,
} from "./device-wallet-network.mjs";

/** @returns {ReturnType<typeof loadWallet>} */
export function gatherCardDisabledSinceVisitForInbox() {
  if (!hasLatestResolverNetworkPoll()) return [];

  const wallet = loadWallet();
  /** @type {Record<string, string | null>} */
  const alertStateMap = {};
  /** @type {Record<string, string | null>} */
  const scanKindMap = {};
  /** @type {Record<string, string | null>} */
  const lastSeenMap = {};
  /** @type {Record<string, boolean>} */
  const resolverConfirmedMap = {};

  for (const entry of wallet) {
    const pid = entry.profile_id;
    if (!pid) continue;
    const alert = getLatestResolvedAlertState(pid);
    alertStateMap[pid] = alert;
    scanKindMap[pid] = getLatestResolvedScanKind(pid);
    lastSeenMap[pid] = getNetworkLastSeenBaseline(pid);
    resolverConfirmedMap[pid] = alert != null;
  }

  const hits = listCardDisabledSinceVisit(
    wallet,
    alertStateMap,
    scanKindMap,
    lastSeenMap,
    resolverConfirmedMap
  );

  return hits
    .map((hit) => wallet.find((e) => e.profile_id === hit.profile_id))
    .filter((e) => e != null);
}
