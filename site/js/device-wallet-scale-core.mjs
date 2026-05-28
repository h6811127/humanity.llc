/**
 * Large-wallet rules for poll / network fan-out (request budget Phases 8–8c).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

import { orderEntriesVisibleFirst } from "./device-hub-visible-rows-core.mjs";

export { orderEntriesVisibleFirst } from "./device-hub-visible-rows-core.mjs";

/** Cards at or above this count use narrowed auto-poll and capped network parallelism. */
export const LARGE_WALLET_THRESHOLD = 10;

/** Max hub saved-card DOM rows when wallet is large (S10 shell perf). */
export const LARGE_WALLET_HUB_DOM_CAP = 15;

/** Initial `/wallet/` saved-card DOM rows when wallet is large (S11; expand via Show all). */
export const LARGE_WALLET_PAGE_DOM_CAP = 40;

/** Product guidance: day-to-day comfort zone before large-wallet behavior. */
export const COMFORTABLE_WALLET_MAX = 5;

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
 * @param {number} savedCardCount
 */
export function isComfortableWalletSize(savedCardCount) {
  return savedCardCount <= COMFORTABLE_WALLET_MAX;
}

/**
 * Hint when above comfortable size but below large-wallet threshold.
 * @param {number} savedCardCount
 */
export function comfortableWalletHint(savedCardCount) {
  if (savedCardCount <= COMFORTABLE_WALLET_MAX) return null;
  if (savedCardCount >= LARGE_WALLET_THRESHOLD) return null;
  return `${savedCardCount} saved — comfortable use is about 1–5 cards. Import a backup before adding more, or remove cards you no longer need.`;
}

/**
 * Hub / custody scale guidance (comfort zone, then large-wallet copy).
 * @param {number} savedCardCount
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 */
export function walletScaleHint(savedCardCount, policy) {
  return largeWalletHint(savedCardCount, policy) ?? comfortableWalletHint(savedCardCount);
}

/**
 * Short title for custody / hub scale rows.
 * @param {number} savedCardCount
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 */
export function walletScaleRowTitle(savedCardCount, policy) {
  if (!walletScaleHint(savedCardCount, policy)) return "";
  if (isLargeWallet(savedCardCount, policy)) return "Large wallet on this device";
  return "Many saved cards";
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
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries
 * @param {Iterable<string>} visibleProfileIds
 * @param {number} cap
 * @returns {{ entries: T[], hiddenCount: number }}
 */
function selectCappedSavedRowEntries(entries, visibleProfileIds, cap) {
  const ordered = orderEntriesVisibleFirst(entries, visibleProfileIds);
  if (ordered.length <= cap) {
    return { entries: ordered, hiddenCount: 0 };
  }
  return {
    entries: ordered.slice(0, cap),
    hiddenCount: ordered.length - cap,
  };
}

export function selectHubSavedRowEntries(entries, visibleProfileIds = [], policy) {
  if (!isLargeWallet(entries.length, policy)) {
    return { entries, hiddenCount: 0 };
  }
  const cap = policy?.hubDomCap ?? LARGE_WALLET_HUB_DOM_CAP;
  return selectCappedSavedRowEntries(entries, visibleProfileIds, cap);
}

/**
 * Cap `/wallet/` saved-card DOM for large wallets (S11). User can expand to full list.
 *
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries
 * @param {Iterable<string>} [visibleProfileIds]
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 * @returns {{ entries: T[], hiddenCount: number }}
 */
export function selectWalletPageSavedRowEntries(entries, visibleProfileIds = [], policy) {
  if (!isLargeWallet(entries.length, policy)) {
    return { entries, hiddenCount: 0 };
  }
  const cap = policy?.walletPageDomCap ?? LARGE_WALLET_PAGE_DOM_CAP;
  return selectCappedSavedRowEntries(entries, visibleProfileIds, cap);
}

/**
 * @param {number} cursor
 * @param {number} length
 */
function pickRoundRobinIndex(cursor, length) {
  if (length <= 0) return 0;
  return cursor % length;
}
