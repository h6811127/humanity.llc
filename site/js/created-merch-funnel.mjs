/**
 * /created/ — optional merch funnel CTA after fresh create (no auto-redirect).
 * See docs/MERCH_FUNNEL_MVP.md · LO-1 / general create always stay on /created/.
 */
import {
  merchCustomizeUrlFromRef,
  persistMerchCreateRef,
  readMerchRefFromUrl,
  shouldShowCreatedMerchCustomizeCard,
} from "./merch-funnel-core.mjs";

/**
 * @param {{ fresh?: boolean }} [opts]
 */
export function initCreatedMerchFunnel(opts = {}) {
  const card = document.getElementById("created-merch-customize-card");
  const link = document.getElementById("created-merch-customize-link");
  if (!card || !link) return;

  const urlRef = readMerchRefFromUrl();
  if (urlRef) persistMerchCreateRef(urlRef);

  /** Only show merch CTA when this create navigation carried hc_ref explicitly. */
  const merchRef = urlRef;
  const fresh = opts.fresh ?? new URLSearchParams(location.search).get("fresh") === "1";

  if (!shouldShowCreatedMerchCustomizeCard({ fresh, merchRef })) {
    card.hidden = true;
    return;
  }

  const customizeUrl = merchCustomizeUrlFromRef(merchRef, location.origin);
  if (!customizeUrl) {
    card.hidden = true;
    return;
  }

  link.href = customizeUrl;
  card.hidden = false;
}
