/**
 * /shop/ — 2-row story hub (Make it yours + Founding objects).
 */
import {
  isTier0CheckoutOpen,
  isPersonalizeCheckoutOpen,
  loadShopConfig,
  tier0Display,
} from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";
import {
  personalizeProducts,
  isPersonalizeProductCheckoutOpen,
} from "./shop-customize-core.mjs";
import {
  SHOP_CHECKOUT_PENDING_LABEL,
  shopPriceLabelWhenCheckoutClosed,
} from "./shop-copy-core.mjs";

const personalizeStatusEl = document.getElementById("shop-hub-personalize-status");
const foundingStatusEl = document.getElementById("shop-hub-founding-status");
const foundingPriceEl = document.getElementById("shop-hub-founding-price");

function decorateShopCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

/**
 * @param {Record<string, unknown>} config
 */
function syncPersonalizeRow(config) {
  const products = personalizeProducts(config);
  const anyPreview = products.length > 0;
  const checkoutReady =
    isPersonalizeCheckoutOpen(config) &&
    products.some((product) => isPersonalizeProductCheckoutOpen(product));

  if (!personalizeStatusEl) return;
  if (checkoutReady) {
    personalizeStatusEl.textContent = "Preview and checkout live";
    personalizeStatusEl.classList.add("shop-hub-status--live");
    return;
  }
  if (anyPreview) {
    personalizeStatusEl.textContent = "Preview live · checkout opening soon";
    personalizeStatusEl.classList.remove("shop-hub-status--live");
    return;
  }
  personalizeStatusEl.textContent = "Opening soon";
  personalizeStatusEl.classList.remove("shop-hub-status--live");
}

/**
 * @param {Record<string, unknown>} config
 */
function syncFoundingRow(config) {
  const display = tier0Display(config);
  const open = isTier0CheckoutOpen(config);

  if (foundingPriceEl) {
    foundingPriceEl.textContent = open
      ? display.price || "Available now"
      : shopPriceLabelWhenCheckoutClosed(display.price);
    foundingPriceEl.classList.toggle("shop-product-price--live", open);
  }
  if (!foundingStatusEl) return;
  if (open) {
    foundingStatusEl.textContent = "Batch founding sticker · checkout live";
    foundingStatusEl.classList.add("shop-hub-status--live");
    return;
  }
  foundingStatusEl.textContent = display.price
    ? `${display.price} · ${SHOP_CHECKOUT_PENDING_LABEL.toLowerCase()}`
    : SHOP_CHECKOUT_PENDING_LABEL;
  foundingStatusEl.classList.remove("shop-hub-status--live");
}

async function initHub() {
  persistMerchCreateRef("tier0_shop");
  decorateShopCreateLinks();
  try {
    const config = await loadShopConfig();
    syncPersonalizeRow(config);
    syncFoundingRow(config);
  } catch {
    if (personalizeStatusEl) {
      personalizeStatusEl.textContent = "Preview opening soon";
    }
    if (foundingStatusEl) {
      foundingStatusEl.textContent = SHOP_CHECKOUT_PENDING_LABEL;
    }
  }
}

void initHub();
