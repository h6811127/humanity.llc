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
  readProductIdFromPath,
} from "./shop-product-detail-core.mjs";
import { TIER0_FOUNDING_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";

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
    productId === TIER0_FOUNDING_STORE_PRODUCT_ID ? "tier0_sticker" : "customize_shop";
  persistMerchCreateRef(merchRef);
  decorateShopCreateLinks();

  const origin = resolverApiOrigin();
  try {
    const [config, catalogPayload, productPayload] = await Promise.all([
      loadShopConfig(),
      fetchPrintCatalog(origin).catch(() => ({ products: [] })),
      fetchStoreProduct(origin, productId),
    ]);
    const product = enrichProductDetail(config, catalogPayload, productPayload);
    renderProduct(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product unavailable.";
    showError(message);
  }
}

void initProductDetail();
