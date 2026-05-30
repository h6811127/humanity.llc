/**
 * /shop/products/{product_id}/ — API-driven product detail (SF-001).
 */
import { loadShopConfig } from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";
import { fetchPrintCatalog } from "./shop-print-catalog-core.mjs";
import { fetchStoreProduct } from "./shop-store-rows-core.mjs";
import { productAvailabilityLabel } from "./shop-store-rows-core.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  enrichProductDetail,
  productDetailActionEnabled,
  productDetailActionLabel,
  productDetailPriceLabel,
  productDetailRowLabel,
  productDetailShowsCardRequirement,
  productDetailShowsPersistenceWarning,
  productDetailUsesTier0InlineCheckout,
  readProductIdFromPath,
} from "./shop-product-detail-core.mjs";
import { isTier0StoreProductId, GLITCH_HOODIE_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";
import { tier0MerchRefForProductId } from "./shop-tier0-core.mjs";
import { merchRefForPersonalizeProductId } from "./merch-funnel-core.mjs";
import { bindTier0ProductCheckout } from "./shop-tier0-product-checkout.mjs";
import { productHonestyBlockForId } from "./shop-merch-copy-core.mjs";

const rowLabelEl = document.getElementById("product-row-label");
const kickerEl = document.getElementById("product-kicker");
const titleEl = document.getElementById("product-title");
const meaningEl = document.getElementById("product-meaning");
const storyEl = document.getElementById("product-story");
const priceEl = document.getElementById("product-price");
const statusEl = document.getElementById("product-status");
const actionBtn = document.getElementById("product-action-btn");
const cardReqEl = document.getElementById("product-card-requirement");
const persistenceEl = document.getElementById("product-persistence-warning");
const errorEl = document.getElementById("product-error");
const mainEl = document.getElementById("product-main");
const proofConsentEl = document.getElementById("product-proof-consent");
const checkoutNoteEl = document.getElementById("product-checkout-note");
const honestySectionEl = document.getElementById("product-honesty");
const honestyTitleEl = document.getElementById("product-honesty-title");
const honestyListEl = document.getElementById("product-honesty-list");

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decorateShopCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

/**
 * @param {Record<string, unknown>} product
 */
function renderProduct(product) {
  if (rowLabelEl) rowLabelEl.textContent = productDetailRowLabel(product);
  if (kickerEl) kickerEl.textContent = String(product.personalization_indicator ?? "Product");
  if (titleEl) titleEl.textContent = String(product.title ?? "Product");
  if (meaningEl) meaningEl.textContent = String(product.meaning_line ?? "");
  if (storyEl) storyEl.textContent = String(product.story ?? "");

  const honesty = productHonestyBlockForId(String(product.product_id ?? ""));
  if (honestySectionEl && honestyListEl) {
    if (honesty) {
      if (honestyTitleEl) honestyTitleEl.textContent = honesty.title;
      honestyListEl.replaceChildren(
        ...honesty.lines.map((line) => {
          const li = document.createElement("li");
          li.className = "list-row";
          const dash = line.indexOf(" — ");
          const title = dash >= 0 ? line.slice(0, dash) : line;
          const sub = dash >= 0 ? line.slice(dash + 3) : "";
          li.innerHTML = `<span class="list-content"><span class="list-title">${escapeHtml(
            title
          )}</span>${
            sub ? `<span class="list-sub">${escapeHtml(sub)}</span>` : ""
          }</span>`;
          return li;
        })
      );
      honestySectionEl.hidden = false;
    } else {
      honestySectionEl.hidden = true;
      honestyListEl.replaceChildren();
    }
  }


  if (priceEl) {
    priceEl.textContent = productDetailPriceLabel(product);
    priceEl.classList.toggle("shop-product-price--live", product.availability === "checkout");
  }
  if (statusEl) {
    statusEl.textContent = productAvailabilityLabel(product);
    statusEl.classList.toggle("shop-hub-status--live", product.availability === "checkout");
  }

  if (cardReqEl) {
    cardReqEl.hidden = !productDetailShowsCardRequirement(product);
  }
  if (persistenceEl) {
    persistenceEl.hidden = !productDetailShowsPersistenceWarning(product);
  }

  if (actionBtn) {
    const enabled = productDetailActionEnabled(product);
    actionBtn.textContent = productDetailActionLabel(product);
    if (enabled && product.action_path) {
      actionBtn.href = String(product.action_path);
      actionBtn.hidden = false;
      actionBtn.removeAttribute("aria-disabled");
    } else {
      actionBtn.removeAttribute("href");
      actionBtn.hidden = true;
      actionBtn.setAttribute("aria-disabled", "true");
    }
  }

  document.title = `${product.title ?? "Product"} · humanity.llc`;
}

function showError(message) {
  if (mainEl) mainEl.hidden = true;
  if (errorEl) {
    errorEl.hidden = false;
    const msgEl = errorEl.querySelector("[data-product-error-message]");
    if (msgEl) msgEl.textContent = message;
  }
}

async function initProductDetail() {
  const productId = readProductIdFromPath();
  if (!productId) {
    showError("Missing product reference.");
    return;
  }

  const merchRef =
    productId === GLITCH_HOODIE_STORE_PRODUCT_ID
      ? merchRefForPersonalizeProductId(GLITCH_HOODIE_STORE_PRODUCT_ID)
      : isTier0StoreProductId(productId)
        ? tier0MerchRefForProductId(productId)
        : "customize_shop";
  persistMerchCreateRef(merchRef);
  decorateShopCreateLinks();

  const origin = resolverApiOrigin();
  try {
    const [config, catalogPayload, productPayload] = await Promise.all([
      loadShopConfig(),
      fetchPrintCatalog(origin).catch(() => ({ products: [] })),
      fetchStoreProduct(origin, productId),
    ]);
    if (productPayload.redirect === true && productPayload.redirect_to) {
      location.replace(String(productPayload.redirect_to));
      return;
    }
    const product = enrichProductDetail(config, catalogPayload, productPayload);
    renderProduct(product);
    if (productDetailUsesTier0InlineCheckout(product)) {
      bindTier0ProductCheckout({
        config,
        productId,
        priceEl,
        statusEl,
        actionBtn,
        proofConsentEl,
        checkoutNoteEl,
        afterPurchaseEl: document.getElementById("product-after-purchase"),
        thanksLinkEl: document.getElementById("product-thanks-link"),
        postPurchaseUrlEl: document.getElementById("product-post-purchase-url"),
        postPurchaseLinkEl: document.getElementById("product-post-purchase-link"),
        postPurchaseCodeEl: document.querySelector("#product-post-purchase-url .shop-post-purchase-url__code"),
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product unavailable.";
    showError(message);
  }
}

void initProductDetail();
