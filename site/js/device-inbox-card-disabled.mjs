/**
 * Resolver-backed card-disabled-since-visit rows for the unified inbox.
 * @see docs/DEVICE_INBOX.md
 */
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { listCardDisabledSinceVisit } from "./wallet-network-baseline.mjs";
import {
  buildResolverConfirmedWalletPollMaps,
  getNetworkLastSeenBaseline,
  shouldSuppressCardDisabledSinceVisitForProfile,
} from "./device-wallet-network.mjs";
import { shouldSuppressCardDisabledSinceVisitAlerts } from "./device-wallet-since-visit-gate.mjs";

/** @returns {Array<{ profile_id: string, label?: string, handle?: string }>} */
export function gatherCardDisabledSinceVisitForInbox() {
  if (shouldSuppressCardDisabledSinceVisitAlerts()) return [];
  const maps = buildResolverConfirmedWalletPollMaps();
  if (!maps) return [];

  const profileIds = Object.keys(maps.resolverConfirmedMap);
  /** @type {Record<string, string | null>} */
  const lastSeenMap = {};
  for (const pid of profileIds) {
    lastSeenMap[pid] = getNetworkLastSeenBaseline(pid);
  }

  const hits = listCardDisabledSinceVisit(
    profileIds.map((profile_id) => ({ profile_id })),
    maps.alertStateMap,
    maps.scanKindMap,
    lastSeenMap,
    maps.resolverConfirmedMap
  );

  return hits
    .map((hit) => {
      const stored = findWalletEntryByProfileId(hit.profile_id);
      if (!stored) return hit;
      return {
        profile_id: hit.profile_id,
        label: stored.label,
        handle: stored.handle,
      };
    })
    .filter(
      (e) =>
        e != null &&
        !shouldSuppressCardDisabledSinceVisitForProfile(e.profile_id)
    );
}
