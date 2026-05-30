/**
 * Pure helpers for hub local search (testable without DOM).
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md item 10
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-14
 */

/** Saved rows exist but active filter matches none (RC-14). */
export const HUB_SEARCH_NO_SAVED_MATCHES =
  "No saved cards match your search.";

/**
 * Clear stale hub search when stranger-empty state flips (RC-14).
 * @param {boolean | null | undefined} wasStranger
 * @param {boolean} isStranger
 */
export function shouldClearHubSearchOnStrangerTransition(wasStranger, isStranger) {
  if (wasStranger == null) return false;
  return wasStranger !== isStranger;
}

/**
 * @param {{
 *   walletCount?: number,
 *   query?: string,
 *   savedGroupHasItems?: boolean,
 *   savedGroupAnyVisible?: boolean,
 * }} input
 */
export function shouldShowSavedSearchEmptyState(input) {
  const {
    walletCount = 0,
    query = "",
    savedGroupHasItems = false,
    savedGroupAnyVisible = false,
  } = input;
  if (walletCount <= 0) return false;
  if (!query.trim()) return false;
  if (!savedGroupHasItems) return false;
  return !savedGroupAnyVisible;
}

/**
 * Row since-visit banners manage their own `hidden` state; search must not toggle it.
 * @param {{ classList?: { contains: (name: string) => boolean } }} el
 */
export function shouldHubSearchApplyVisibility(el) {
  return el.classList?.contains("hub-card-status-alert") !== true;
}
