/**
 * /created/ — merch funnel handoff to QR customizer after fresh create.
 * See docs/MERCH_FUNNEL_MVP.md exit checklist step 2.
 */
import {
  hasCreatedCardSession,
  merchCustomizeUrlFromRef,
  peekMerchCustomizeRef,
  persistMerchCreateRef,
  readMerchRefFromUrl,
  shouldRedirectFreshCreateToCustomize,
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

  const merchRef = urlRef || peekMerchCustomizeRef();
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

  if (
    shouldRedirectFreshCreateToCustomize({
      fresh,
      merchRef,
      hasCreatedSession: hasCreatedCardSession(),
    })
  ) {
    location.replace(customizeUrl);
    return;
  }

  link.href = customizeUrl;
  card.hidden = false;
}
