/**
 * Tier 0 product checkout on /shop/products/{id}/ (company drops except founding sticker page).
 * @see docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md
 */

import { bindSameTabCheckoutAnchor } from "./shop-checkout-handoff.mjs";
import { merchThanksPageUrl } from "./shop-config.mjs";
import { SHOP_CHECKOUT_READY_LEAD, shopPriceLabelWhenCheckoutClosed } from "./shop-copy-core.mjs";
import {
  canProceedToCheckout,
  proofConsentRequiredIds,
  readProofConsentState,
} from "./shop-proof-consent-core.mjs";
import {
  isTier0ProductCheckoutOpen,
  tier0ProductById,
  tier0MerchRefForProductId,
  tier0ProductDisplay,
} from "./shop-tier0-core.mjs";
import { TIER0_FOUNDING_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";

const TIER0_PROOF_IDS = proofConsentRequiredIds("tier0");

/**
 * @param {string} productId
 */
export function shouldUseTier0ProductCheckout(productId) {
  const id = String(productId ?? "").trim();
  return id.length > 0 && id !== TIER0_FOUNDING_STORE_PRODUCT_ID;
}

/**
 * @param {{
 *   config: Record<string, unknown>;
 *   productId: string;
 *   priceEl: HTMLElement | null;
 *   statusEl: HTMLElement | null;
 *   actionBtn: HTMLAnchorElement | null;
 *   proofConsentEl: HTMLElement | null;
 *   checkoutNoteEl: HTMLElement | null;
 * }} options
 */
export function bindTier0ProductCheckout(options) {
  const {
    config,
    productId,
    priceEl,
    statusEl,
    actionBtn,
    proofConsentEl,
  checkoutNoteEl,
  afterPurchaseEl = null,
  thanksLinkEl = null,
  postPurchaseUrlEl = null,
  postPurchaseLinkEl = null,
  postPurchaseCodeEl = null,
} = options;

  if (!shouldUseTier0ProductCheckout(productId)) return;

  const tier0 = tier0ProductById(config, productId);
  if (!tier0) return;

  const display = tier0ProductDisplay(config, productId);
  const checkoutOpen = isTier0ProductCheckoutOpen(tier0);
  let activeCheckoutUrl = "";

  const canProceed = () =>
    canProceedToCheckout(
      checkoutOpen,
      TIER0_PROOF_IDS,
      readProofConsentState(proofConsentEl, TIER0_PROOF_IDS)
    );

  function syncBuyButton() {
    if (!actionBtn || actionBtn.hidden) return;
    if (canProceed()) {
      actionBtn.removeAttribute("aria-disabled");
    } else {
      actionBtn.setAttribute("aria-disabled", "true");
    }
  }

  function setCheckoutUi(open, checkoutUrl = "") {
    activeCheckoutUrl = open && checkoutUrl ? checkoutUrl : "";
    if (priceEl) {
      priceEl.textContent = open
        ? display.price || "Available now"
        : shopPriceLabelWhenCheckoutClosed(display.price);
      priceEl.classList.toggle("shop-product-price--live", open);
    }
    if (statusEl) {
      statusEl.textContent = open ? "Checkout live" : "Coming soon";
      statusEl.classList.toggle("shop-hub-status--live", open);
    }
    if (proofConsentEl) proofConsentEl.hidden = !open;
    if (checkoutNoteEl) checkoutNoteEl.hidden = !open;

    const thanksUrl = open
      ? merchThanksPageUrl(
          config,
          tier0MerchRefForProductId(productId),
          typeof location !== "undefined" ? location.origin : ""
        )
      : "";
    if (thanksLinkEl instanceof HTMLAnchorElement) {
      thanksLinkEl.href = thanksUrl || "/shop/thanks/";
    }
    if (postPurchaseLinkEl instanceof HTMLAnchorElement) {
      postPurchaseLinkEl.href = thanksUrl || "/shop/thanks/";
    }
    if (postPurchaseCodeEl) postPurchaseCodeEl.textContent = thanksUrl;
    if (afterPurchaseEl) afterPurchaseEl.hidden = !open;
    if (postPurchaseUrlEl) postPurchaseUrlEl.hidden = !open;

    if (actionBtn) {
      if (open && checkoutUrl) {
        actionBtn.textContent = "Continue to secure checkout";
        actionBtn.href = checkoutUrl;
        actionBtn.hidden = false;
        bindSameTabCheckoutAnchor(actionBtn, () => activeCheckoutUrl, canProceed);
      } else {
        actionBtn.removeAttribute("href");
        actionBtn.hidden = false;
        actionBtn.textContent = "Checkout opening soon";
        actionBtn.setAttribute("aria-disabled", "true");
      }
    }
    syncBuyButton();
  }

  proofConsentEl?.addEventListener("change", syncBuyButton);

  if (checkoutOpen) {
    setCheckoutUi(true, display.checkoutUrl);
  } else {
    setCheckoutUi(false);
  }
}
