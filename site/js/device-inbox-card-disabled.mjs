/**
 * Resolver-backed card-disabled-since-visit rows for the unified inbox.
 * @see docs/DEVICE_INBOX.md
 */
import { getWalletEntrySummariesByProfileIds } from "./device-wallet.mjs";
import { listCardDisabledSinceVisit } from "./wallet-network-baseline.mjs";
import {
  buildResolverConfirmedWalletPollMaps,
  getNetworkLastSeenBaseline,
  listWalletNetworkTruthPollProfileIds,
  shouldSuppressCardDisabledSinceVisitForProfile,
} from "./device-wallet-network.mjs?v=94";
import { shouldSuppressCardDisabledSinceVisitAlerts } from "./device-wallet-since-visit-gate.mjs?v=94";

/** @returns {ReturnType<typeof getWalletEntrySummariesByProfileIds>} */
export function gatherCardDisabledSinceVisitForInbox() {
  if (shouldSuppressCardDisabledSinceVisitAlerts()) return [];
  const confirmedProfileIds = listWalletNetworkTruthPollProfileIds();
  if (confirmedProfileIds.length === 0) return [];
  const wallet = getWalletEntrySummariesByProfileIds(confirmedProfileIds);
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
    .filter(
      (e) =>
        e != null &&
        !shouldSuppressCardDisabledSinceVisitForProfile(e.profile_id)
    );
}
