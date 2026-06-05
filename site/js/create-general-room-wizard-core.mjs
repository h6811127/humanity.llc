/**
 * General-account create room (`?intent=general`).
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Front door strategy
 */

/**
 * @param {URLSearchParams} searchParams
 */
export function isGeneralCreateIntent(searchParams) {
  return searchParams.get("intent") === "general";
}
