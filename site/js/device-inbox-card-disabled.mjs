/**
 * Resolver-backed card-disabled-since-visit rows for the unified inbox.
 * @see docs/DEVICE_INBOX.md
 */
import { loadWallet } from "./device-wallet.mjs";
import { listCardDisabledSinceVisit } from "./wallet-network-baseline.mjs";
import {
  buildResolverConfirmedWalletPollMaps,
  getNetworkLastSeenBaseline,
} from "./device-wallet-network.mjs";

/** @returns {ReturnType<typeof loadWallet>} */
export function gatherCardDisabledSinceVisitForInbox() {
  const wallet = loadWallet();
  const maps = buildResolverConfirmedWalletPollMaps(wallet);
  if (!maps) return [];

  /** @type {Record<string, string | null>} */
  const lastSeenMap = {};
  for (const entry of wallet) {
    const pid = entry.profile_id;
    if (!pid || !maps.resolverConfirmedMap[pid]) continue;
    lastSeenMap[pid] = getNetworkLastSeenBaseline(pid);
  }

  const hits = listCardDisabledSinceVisit(
    wallet,
    maps.alertStateMap,
    maps.scanKindMap,
    lastSeenMap,
    maps.resolverConfirmedMap
  );

  return hits
    .map((hit) => wallet.find((e) => e.profile_id === hit.profile_id))
    .filter((e) => e != null);
}
