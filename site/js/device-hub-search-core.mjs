/**
 * Pure helpers for hub local search (testable without DOM).
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md item 10
 */

/**
 * Row since-visit banners manage their own `hidden` state; search must not toggle it.
 * @param {{ classList?: { contains: (name: string) => boolean } }} el
 */
export function shouldHubSearchApplyVisibility(el) {
  return el.classList?.contains("hub-card-status-alert") !== true;
}
