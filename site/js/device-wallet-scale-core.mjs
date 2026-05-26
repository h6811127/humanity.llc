/**
 * Large-wallet rules for poll / network fan-out (request budget Phases 8–8c).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

import { orderEntriesVisibleFirst } from "./device-hub-visible-rows-core.mjs";

export { orderEntriesVisibleFirst } from "./device-hub-visible-rows-core.mjs";

/** Cards at or above this count use narrowed auto-poll and capped network parallelism. */
export const LARGE_WALLET_THRESHOLD = 10;

/**
 * @param {number} savedCardCount
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 */
export function isLargeWallet(savedCardCount, policy) {
  const threshold = policy?.walletLargeThreshold ?? LARGE_WALLET_THRESHOLD;
  return savedCardCount >= threshold;
}

/**
 * @param {number} savedCardCount
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 */
export function largeWalletHint(savedCardCount, policy) {
  if (!isLargeWallet(savedCardCount, policy)) return null;
  return `Large wallet (${savedCardCount} saved) - automatic checks focus on your active card and any waiting live proof. Use Check network or Check for live proof for a full refresh.`;
}

/**
 * @param {string} profileId
 * @param {Set<string>} set
 */
function addProfileId(set, profileId) {
  if (typeof profileId === "string" && profileId) set.add(profileId);
}

/**
 * Narrow live-control round-robin to active + known-pending cards when wallet is large.
 *
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries pollable wallet rows
 * @param {{
 *   walletSize: number,
 *   activeProfileId?: string | null,
 *   pendingProfileIds?: Iterable<string>,
 * }} ctx
 * @returns {T[]}
 */
export function selectLiveControlPollEntries(entries, ctx, policy) {
  if (!isLargeWallet(ctx.walletSize, policy) || entries.length === 0) {
    return entries;
  }

  const keep = new Set();
  addProfileId(keep, ctx.activeProfileId ?? null);
  if (ctx.pendingProfileIds) {
    for (const pid of ctx.pendingProfileIds) addProfileId(keep, pid);
  }

  const filtered = entries.filter((e) => keep.has(e.profile_id));
  if (filtered.length > 0) return filtered;

  const active = ctx.activeProfileId;
  if (active) {
    const match = entries.find((e) => e.profile_id === active);
    if (match) return [match];
  }
  return [entries[0]];
}

/**
 * Max parallel status GETs during one refresh (large wallet caps fan-out).
 *
 * @param {number} savedCardCount
 * @param {{ manual?: boolean }} [opts]
 */
export function walletNetworkMaxParallel(savedCardCount, opts = {}, policy) {
  if (!isLargeWallet(savedCardCount, policy)) return Number.POSITIVE_INFINITY;
  if (opts.manual === true) {
    return policy?.pollNetworkManualMaxParallel ?? 1;
  }
  return policy?.pollNetworkMaxParallel ?? 2;
}

/**
 * Large-wallet auto refresh: one stale row per hub debounce (round-robin).
 *
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries
 * @param {{
 *   walletSize: number,
 *   staleEntries: T[],
 *   activeProfileId?: string | null,
 *   visibleProfileIds?: Iterable<string>,
 *   cursor: number,
 * }} ctx
 * @returns {{ entries: T[], nextCursor: number }}
 */
export function selectNetworkRefreshEntries(entries, ctx, policy) {
  if (!isLargeWallet(ctx.walletSize, policy) || ctx.staleEntries.length === 0) {
    return { entries: ctx.staleEntries, nextCursor: 0 };
  }

  const stale = orderEntriesVisibleFirst(
    ctx.staleEntries,
    ctx.visibleProfileIds ?? []
  );
  const active = ctx.activeProfileId;
  if (active) {
    const activeStale = stale.find((e) => e.profile_id === active);
    if (activeStale) {
      return { entries: [activeStale], nextCursor: ctx.cursor };
    }
  }

  const idx = pickRoundRobinIndex(ctx.cursor, stale.length);
  return {
    entries: [stale[idx]],
    nextCursor: stale.length > 0 ? (idx + 1) % stale.length : 0,
  };
}

/**
 * @param {number} cursor
 * @param {number} length
 */
function pickRoundRobinIndex(cursor, length) {
  if (length <= 0) return 0;
  return cursor % length;
}
