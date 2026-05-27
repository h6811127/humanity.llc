/**
 * Tier 0 post-purchase thanks page — merch funnel + create link attribution.
 */
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";

function decorateThanksCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

persistMerchCreateRef("tier0_shop");
decorateThanksCreateLinks();
