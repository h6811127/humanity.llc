/**
 * /shop/customize/ — QR customizer → artifact intent → Shopify checkout.
 * See docs/MERCH_FUNNEL_MVP.md.
 */
import { qrScanUrl, resolverApiOrigin } from "./hc-sign.mjs";
import { renderQrToImage } from "./qr-render.mjs";
import { loadShopConfig } from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
  readMerchRefFromUrl,
} from "./merch-funnel-core.mjs";
import {
  buildPlannedItemScanUrl,
  buildShopifyCartUrl,
  isPersonalizeCheckoutReady,
  loadCardSessionForCustomize,
  personalizeProductDisplay,
  personalizeProducts,
} from "./shop-customize-core.mjs";

const cardGate = document.getElementById("shop-customize-card-gate");
const cardReady = document.getElementById("shop-customize-card-ready");
const handleEl = document.getElementById("shop-customize-handle");
const productRow = document.getElementById("shop-customize-products");
const previewImg = document.getElementById("shop-customize-qr-preview");
const previewPlaceholder = document.getElementById("shop-customize-qr-placeholder");
const previewNote = document.getElementById("shop-customize-preview-note");
const mockEl = document.getElementById("shop-customize-mock");
const priceEl = document.getElementById("shop-customize-price");
const statusEl = document.getElementById("shop-customize-status");
const checkoutBtn = document.getElementById("shop-customize-checkout");
const interestSection = document.getElementById("shop-customize-interest");
const approveEl = document.getElementById("shop-customize-approve");
const createLink = document.getElementById("shop-customize-create-link");

/** @type {Record<string, unknown> | null} */
let shopConfig = null;
/** @type {ReturnType<typeof loadCardSessionForCustomize> | null} */
let cardSession = null;
/** @type {string | null} */
let selectedProductId = null;
/** @type {{ artifact_intent_id: string, planned_item_qr_ids: string[], shopify?: { cart_line_attributes: { key: string, value: string }[] } } | null} */
let activeIntent = null;
/** @type {"planned" | "card_fallback" | null} */
let previewMode = null;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !message;
  statusEl.textContent = message || "";
  statusEl.className = isError ? "form-status error" : "form-status";
}

function setPreviewLoading(loading) {
  mockEl?.classList.toggle("is-loading", loading);
  if (previewPlaceholder) {
    previewPlaceholder.hidden = !loading;
    previewPlaceholder.textContent = loading ? "Generating preview…" : "";
  }
}

function showPreviewImage(show) {
  if (previewImg) previewImg.hidden = !show;
}

function selectedProduct() {
  if (!shopConfig || !selectedProductId) return null;
  return personalizeProducts(shopConfig).find((p) => p.product_id === selectedProductId) ?? null;
}

function decorateCreateLinks() {
  const ref = peekMerchCreateRef() || "customize_shop";
  if (createLink) {
    createLink.href = appendMerchRefToCreateUrl("/create/", ref);
  }
}

function renderProductPicker() {
  if (!productRow || !shopConfig) return;
  const products = personalizeProducts(shopConfig);
  productRow.replaceChildren();
  if (!products.length) {
    productRow.hidden = true;
    setStatus("No personalized products configured yet.", true);
    return;
  }
  productRow.hidden = false;
  if (!selectedProductId) {
    selectedProductId = String(products[0].product_id);
  }
  for (const product of products) {
    const display = personalizeProductDisplay(product);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "create-template-btn shop-customize-product-btn";
    btn.dataset.productId = display.productId;
    btn.textContent = display.title;
    btn.setAttribute("aria-pressed", display.productId === selectedProductId ? "true" : "false");
    if (display.productId === selectedProductId) {
      btn.classList.add("is-active");
    }
    btn.addEventListener("click", () => {
      selectedProductId = display.productId;
      activeIntent = null;
      previewMode = null;
      if (display.preview === "hoodie") {
        persistMerchCreateRef("customize_hoodie");
      }
      for (const child of productRow.querySelectorAll(".shop-customize-product-btn")) {
        const active = child.dataset.productId === selectedProductId;
        child.classList.toggle("is-active", active);
        child.setAttribute("aria-pressed", active ? "true" : "false");
      }
      void refreshPreview();
    });
    productRow.appendChild(btn);
  }
}

function syncMockPreviewKind() {
  if (!mockEl) return;
  const product = selectedProduct();
  const kind =
    product && personalizeProductDisplay(product).preview === "sticker" ? "sticker" : "hoodie";
  mockEl.dataset.preview = kind;
}

function cardFallbackScanUrl() {
  if (!cardSession) return null;
  return cardSession.scan_url || qrScanUrl(cardSession.profile_id, cardSession.qr_id);
}

async function createArtifactIntent(product) {
  if (!cardSession) throw new Error("Create a card first.");
  const display = personalizeProductDisplay(product);
  const origin = resolverApiOrigin();
  const res = await fetch(`${origin}/v1/store/artifact-intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      profile_id: cardSession.profile_id,
      source_qr_id: cardSession.qr_id,
      product_id: display.productId,
      quantity: 1,
      shopify_variant_id: display.shopifyVariantId || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Could not prepare your print QR.";
    throw new Error(msg);
  }
  return data;
}

async function attachArtifactIntent(intentId, product) {
  const display = personalizeProductDisplay(product);
  const origin = resolverApiOrigin();
  const res = await fetch(
    `${origin}/v1/store/artifact-intents/${encodeURIComponent(intentId)}/attach`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        shopify_variant_id: display.shopifyVariantId || undefined,
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string" ? data.message : "Could not attach order metadata.";
    throw new Error(msg);
  }
  return data;
}

async function ensureIntent(product) {
  if (activeIntent?.artifact_intent_id) return activeIntent;
  const created = await createArtifactIntent(product);
  const attached = await attachArtifactIntent(created.artifact_intent_id, product);
  activeIntent = attached;
  return attached;
}

async function renderPreviewScanUrl(scanUrl) {
  if (!previewImg || !scanUrl) throw new Error("Preview unavailable.");
  await renderQrToImage(previewImg, scanUrl);
  previewImg.alt = "Branded QR preview for your print item";
  showPreviewImage(true);
}

function syncCheckoutUi(product) {
  const checkoutReady =
    isPersonalizeCheckoutReady(shopConfig, product) && approveEl?.checked;
  if (checkoutBtn) {
    checkoutBtn.disabled = !checkoutReady;
    checkoutBtn.hidden = !isPersonalizeCheckoutReady(shopConfig, product);
  }
  if (interestSection) {
    interestSection.hidden = isPersonalizeCheckoutReady(shopConfig, product);
  }
}

function previewStatusMessage(product) {
  const checkoutOpen = isPersonalizeCheckoutReady(shopConfig, product);
  if (previewMode === "card_fallback") {
    return checkoutOpen
      ? "Showing your card QR while print setup finishes. Confirm limits below to continue."
      : "Showing your card QR. A unique print code is reserved when personalized checkout opens.";
  }
  if (checkoutOpen && approveEl?.checked) {
    return "Preview ready. Continue to checkout when you are ready.";
  }
  if (checkoutOpen) {
    return "Preview ready. Confirm the limits below to continue.";
  }
  return "Preview ready. Personalized checkout opens soon.";
}

async function refreshPreview() {
  const product = selectedProduct();
  if (!product || !previewImg || !cardSession) return;
  syncMockPreviewKind();
  const display = personalizeProductDisplay(product);
  if (priceEl) {
    priceEl.textContent = display.priceDisplay || "Price at checkout";
  }
  setPreviewLoading(true);
  showPreviewImage(false);
  setStatus("");
  if (checkoutBtn) checkoutBtn.disabled = true;

  const origin =
    typeof shopConfig?.site_origin === "string" && shopConfig.site_origin.trim()
      ? shopConfig.site_origin.trim()
      : "https://humanity.llc";

  try {
    const intent = await ensureIntent(product);
    const plannedQrId = intent.planned_item_qr_ids?.[0];
    if (!plannedQrId) throw new Error("Missing planned QR for preview.");
    const scanUrl = buildPlannedItemScanUrl(cardSession.profile_id, plannedQrId, origin);
    await renderPreviewScanUrl(scanUrl);
    previewMode = "planned";
    if (previewNote) {
      previewNote.textContent =
        "This is your item's planned QR — it goes live after payment and fulfillment. Holding the garment still does not prove you own the card.";
    }
  } catch {
    const fallbackUrl = cardFallbackScanUrl();
    if (!fallbackUrl) throw new Error("Create a card first.");
    await renderPreviewScanUrl(fallbackUrl);
    previewMode = "card_fallback";
    if (previewNote) {
      previewNote.textContent =
        "Print preview uses your card QR for now. Each physical item still receives its own unique code at fulfillment.";
    }
  }

  syncCheckoutUi(product);
  setStatus(previewStatusMessage(product));
  setPreviewLoading(false);
}

async function onCheckoutClick() {
  const product = selectedProduct();
  if (!product || !approveEl?.checked) return;
  if (previewMode === "card_fallback") {
    setStatus("Print setup is still finishing. Try again in a moment.", true);
    activeIntent = null;
    void refreshPreview();
    return;
  }
  setStatus("Opening checkout…");
  if (checkoutBtn) checkoutBtn.disabled = true;
  try {
    const intent = await ensureIntent(product);
    const attrs = intent.shopify?.cart_line_attributes ?? [];
    const display = personalizeProductDisplay(product);
    const url = buildShopifyCartUrl(display.checkoutUrl, 1, attrs);
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("Checkout opened in a new tab. Complete payment on Shopify.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Checkout failed.", true);
  } finally {
    if (checkoutBtn) checkoutBtn.disabled = false;
  }
}

function showCardGate() {
  cardGate?.removeAttribute("hidden");
  cardReady?.setAttribute("hidden", "");
  if (checkoutBtn) checkoutBtn.hidden = true;
}

function showCardReady(session) {
  cardSession = session;
  cardGate?.setAttribute("hidden", "");
  cardReady?.removeAttribute("hidden");
  if (handleEl) {
    handleEl.textContent = session.handle ? `@${session.handle}` : session.profile_id.slice(0, 12);
  }
  renderProductPicker();
  void refreshPreview();
}

async function init() {
  const urlRef = readMerchRefFromUrl();
  if (urlRef) persistMerchCreateRef(urlRef);
  persistMerchCreateRef("customize_shop");
  decorateCreateLinks();

  approveEl?.addEventListener("change", () => {
    const product = selectedProduct();
    if (product) syncCheckoutUi(product);
    setStatus(product ? previewStatusMessage(product) : "");
  });
  checkoutBtn?.addEventListener("click", () => {
    void onCheckoutClick();
  });

  try {
    shopConfig = await loadShopConfig();
  } catch {
    shopConfig = {};
  }

  const session = loadCardSessionForCustomize();
  if (!session) {
    showCardGate();
    return;
  }

  if (!session.scan_url) {
    session.scan_url = qrScanUrl(session.profile_id, session.qr_id);
  }
  showCardReady(session);
}

void init();
