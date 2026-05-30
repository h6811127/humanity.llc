/**
 * /shop/customize/ — QR customizer → artifact intent → Shopify checkout.
 * See docs/MERCH_FUNNEL_MVP.md.
 */
import { qrScanUrl, resolverApiOrigin } from "./hc-sign.mjs";
import { QR_PREVIEW_RENDER_WIDTH, renderQrToImage } from "./qr-render.mjs";
import { loadShopConfig } from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCustomizeRef,
  readMerchRefFromUrl,
  markTier1EphemeralOwner,
} from "./merch-funnel-core.mjs";
import {
  postArtifactIntentPreMint,
  signPlannedPrintArtifactCredentials,
} from "./shop-artifact-pre-mint.mjs";
import { goToShopifyCheckout } from "./shop-checkout-handoff.mjs";
import { persistCheckoutIntentId } from "./shop-order-status-core.mjs";
import {
  buildPlannedItemScanUrl,
  buildShopifyCartUrl,
  customizeStickerMockLayout,
  isPersonalizeCheckoutReady,
  loadCardSessionForCustomize,
  loadCardSigningSessionForCustomize,
  personalizeProductDisplay,
  personalizeProducts,
} from "./shop-customize-core.mjs";
import {
  canProceedToCheckout,
  proofConsentRequiredIds,
  proofConsentStatusMessage,
  readProofConsentState,
} from "./shop-proof-consent-core.mjs";
import { syncMerchBackupNudgeNotice } from "./merch-backup-nudge.mjs";
import { loadRootSessionRecordForMerch, merchPreCheckoutRecoveryGateState } from "./merch-backup-nudge-core.mjs";
import { SHOP_CUSTOMIZE_PROOF_PERSISTENCE } from "./shop-merch-copy-core.mjs";

const PERSONALIZE_PROOF_CONSENT_IDS = proofConsentRequiredIds("personalized");

const cardGate = document.getElementById("shop-customize-card-gate");
const cardReady = document.getElementById("shop-customize-card-ready");
const handleEl = document.getElementById("shop-customize-handle");
const productRow = document.getElementById("shop-customize-products");
const previewImg = document.getElementById("shop-customize-qr-preview");
const previewPlaceholder = document.getElementById("shop-customize-qr-placeholder");
const previewNote = document.getElementById("shop-customize-preview-note");
const mockEl = document.getElementById("shop-customize-mock");
const priceEl = document.getElementById("shop-customize-price");
const shippingForm = document.getElementById("shop-customize-shipping-form");
const shippingCountryInput = document.getElementById("shop-customize-shipping-country");
const shippingZipInput = document.getElementById("shop-customize-shipping-zip");
const shippingResultEl = document.getElementById("shop-customize-shipping-result");
const statusEl = document.getElementById("shop-customize-status");
const checkoutBtn = document.getElementById("shop-customize-checkout");
const interestSection = document.getElementById("shop-customize-interest");
const proofConsentEl = document.getElementById("shop-proof-consent");
const createLink = document.getElementById("shop-customize-create-link");

/** @type {Record<string, unknown> | null} */
let shopConfig = null;
/** @type {ReturnType<typeof loadCardSigningSessionForCustomize> | null} */
let signingSession = null;
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
  const ref = peekMerchCustomizeRef() || "customize_shop";
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
      clearShippingEstimate();
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
  if (kind === "sticker") {
    const layout = customizeStickerMockLayout(QR_PREVIEW_RENDER_WIDTH);
    mockEl.style.setProperty("--hc-sticker-card-aspect", String(layout.cardAspect));
    mockEl.style.setProperty("--hc-sticker-card-width", `${layout.cardWidthPct}%`);
  } else {
    mockEl.style.removeProperty("--hc-sticker-card-aspect");
    mockEl.style.removeProperty("--hc-sticker-card-width");
  }
}

function cardFallbackScanUrl() {
  if (!signingSession) return null;
  return signingSession.scan_url || qrScanUrl(signingSession.profile_id, signingSession.qr_id);
}

async function createArtifactIntent(product) {
  if (!signingSession) throw new Error("Create a card first.");
  const display = personalizeProductDisplay(product);
  const origin = resolverApiOrigin();
  const res = await fetch(`${origin}/v1/store/artifact-intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      profile_id: signingSession.profile_id,
      source_qr_id: signingSession.qr_id,
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

async function attachArtifactIntent(intentId, product, proofAcknowledged) {
  const display = personalizeProductDisplay(product);
  const origin = resolverApiOrigin();
  const res = await fetch(
    `${origin}/v1/store/artifact-intents/${encodeURIComponent(intentId)}/attach`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        shopify_variant_id: display.shopifyVariantId || undefined,
        proof_acknowledged: proofAcknowledged === true,
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

async function ensureArtifactIntent(product) {
  if (activeIntent?.artifact_intent_id) return activeIntent;
  activeIntent = await createArtifactIntent(product);
  return activeIntent;
}

async function prepareCheckoutIntent(product) {
  const intent = await ensureArtifactIntent(product);
  if (intent.shopify?.cart_line_attributes?.length) return intent;
  const attached = await attachArtifactIntent(intent.artifact_intent_id, product, true);
  activeIntent = attached;
  return attached;
}

async function renderPreviewScanUrl(scanUrl) {
  if (!previewImg || !scanUrl) throw new Error("Preview unavailable.");
  await renderQrToImage(previewImg, scanUrl);
  previewImg.alt = "Branded QR preview for your print item";
  showPreviewImage(true);
}

function personalizeProofConsentComplete(product) {
  return canProceedToCheckout(
    isPersonalizeCheckoutReady(shopConfig, product),
    PERSONALIZE_PROOF_CONSENT_IDS,
    readProofConsentState(proofConsentEl, PERSONALIZE_PROOF_CONSENT_IDS)
  );
}

function syncCheckoutUi(product) {
  const checkoutOpen = isPersonalizeCheckoutReady(shopConfig, product);
  const session = loadRootSessionRecordForMerch();
  const recoveryGate = merchPreCheckoutRecoveryGateState(session);
  const checkoutReady =
    personalizeProofConsentComplete(product) && !recoveryGate.blocked;
  if (checkoutBtn) {
    checkoutBtn.disabled = !checkoutReady;
    checkoutBtn.hidden = !checkoutOpen;
  }
  if (interestSection) {
    interestSection.hidden = checkoutOpen;
  }
  if (shippingForm instanceof HTMLFormElement) {
    shippingForm.hidden = !checkoutOpen;
  }
  syncMerchBackupNudgeNotice({
    noticeId: "shop-customize-backup-nudge",
    phase: "pre_checkout",
    enabled: checkoutOpen,
    blocked: recoveryGate.blocked,
    getSession: () => session,
  });
}

function renderShippingEstimate(payload) {
  if (!shippingResultEl) return;
  shippingResultEl.hidden = false;
  const shipping =
    typeof payload.shipping_display === "string"
      ? payload.shipping_display
      : payload.shipping_cost != null
        ? `$${(Number(payload.shipping_cost) / 100).toFixed(2)}`
        : null;
  shippingResultEl.textContent = shipping
    ? `Estimated shipping: ${shipping} (${payload.shipping_label || "standard"}). ${payload.disclaimer || ""}`
    : payload.disclaimer || "Shipping estimate unavailable.";
}

function clearShippingEstimate() {
  if (!shippingResultEl) return;
  shippingResultEl.hidden = true;
  shippingResultEl.textContent = "";
}

async function fetchShippingEstimate(product) {
  const country =
    shippingCountryInput instanceof HTMLInputElement
      ? shippingCountryInput.value.trim().toUpperCase()
      : "";
  const zip =
    shippingZipInput instanceof HTMLInputElement ? shippingZipInput.value.trim() : "";
  if (!country) throw new Error("Enter a country code (e.g. US).");

  const display = personalizeProductDisplay(product);
  const origin = resolverApiOrigin();
  const res = await fetch(`${origin}/v1/print/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      product_id: display.productId,
      quantity: 1,
      destination: { country, zip },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : "Could not estimate shipping for this destination.";
    throw new Error(msg);
  }
  return data;
}

function previewStatusMessage(product) {
  const checkoutOpen = isPersonalizeCheckoutReady(shopConfig, product);
  if (previewMode === "card_fallback") {
    return checkoutOpen
      ? "Showing your card QR while print setup finishes. Confirm limits below to continue."
      : "Showing your card QR. A unique print code is reserved when personalized checkout opens.";
  }
  return proofConsentStatusMessage(
    "personalized",
    checkoutOpen,
    readProofConsentState(proofConsentEl, PERSONALIZE_PROOF_CONSENT_IDS)
  );
}

async function refreshPreview() {
  const product = selectedProduct();
  if (!product || !previewImg || !signingSession) return;
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
    const intent = await ensureArtifactIntent(product);
    const plannedQrId = intent.planned_item_qr_ids?.[0];
    if (!plannedQrId) throw new Error("Missing planned QR for preview.");
    const scanUrl = buildPlannedItemScanUrl(signingSession.profile_id, plannedQrId, origin);
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
  if (!product || !personalizeProofConsentComplete(product) || !signingSession) return;
  const recoveryGate = merchPreCheckoutRecoveryGateState(loadRootSessionRecordForMerch());
  if (recoveryGate.blocked) {
    setStatus(
      "Add a recovery method or export encrypted backup on Manage before checkout.",
      true
    );
    syncCheckoutUi(product);
    return;
  }
  if (previewMode === "card_fallback") {
    setStatus("Print setup is still finishing. Try again in a moment.", true);
    activeIntent = null;
    void refreshPreview();
    return;
  }
  setStatus("Preparing checkout…");
  if (checkoutBtn) checkoutBtn.disabled = true;
  try {
    const intent = await prepareCheckoutIntent(product);
    persistCheckoutIntentId(intent.artifact_intent_id);
    const plannedQrIds = intent.planned_item_qr_ids ?? [];
    const plannedPrintArtifactIds = intent.planned_print_artifact_ids ?? [];
    if (!plannedQrIds.length || plannedQrIds.length !== plannedPrintArtifactIds.length) {
      throw new Error("Print setup is incomplete. Refresh and try again.");
    }
    const siteOrigin =
      typeof shopConfig?.site_origin === "string" && shopConfig.site_origin.trim()
        ? shopConfig.site_origin.trim()
        : undefined;
    if (shopConfig?.e2e_skip_pre_mint_sign !== true) {
      const credentials = await signPlannedPrintArtifactCredentials({
        profileId: signingSession.profile_id,
        plannedItemQrIds: plannedQrIds,
        plannedPrintArtifactIds,
        privateKeyBase58: signingSession.private_key_b58,
        publicKeyBase58: signingSession.public_key_b58,
        siteOrigin,
      });
      await postArtifactIntentPreMint(intent.artifact_intent_id, credentials);
    }
    const attrs = intent.shopify?.cart_line_attributes ?? [];
    const display = personalizeProductDisplay(product);
    const url = buildShopifyCartUrl(display.checkoutUrl, 1, attrs);
    markTier1EphemeralOwner(signingSession.profile_id);
    goToShopifyCheckout(url);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Checkout failed.", true);
    if (checkoutBtn) checkoutBtn.disabled = false;
  }
}

function showCardGate() {
  cardGate?.removeAttribute("hidden");
  cardReady?.setAttribute("hidden", "");
  if (checkoutBtn) checkoutBtn.hidden = true;
}

function showCardReady(session) {
  signingSession = session;
  cardGate?.setAttribute("hidden", "");
  cardReady?.removeAttribute("hidden");
  if (handleEl) {
    handleEl.textContent = session.handle ? `@${session.handle}` : session.profile_id.slice(0, 12);
  }
  renderProductPicker();
  const product = selectedProduct();
  if (product) syncCheckoutUi(product);
  void refreshPreview();
}

function applyMerchCustomizeProofCopy() {
  const persistenceEl = document.getElementById("shop-customize-proof-persistence");
  if (persistenceEl) persistenceEl.textContent = SHOP_CUSTOMIZE_PROOF_PERSISTENCE;
}

async function init() {
  applyMerchCustomizeProofCopy();
  const urlRef = readMerchRefFromUrl();
  if (urlRef) {
    persistMerchCreateRef(urlRef);
  } else {
    const handoffRef = peekMerchCustomizeRef();
    persistMerchCreateRef(handoffRef || "customize_shop");
  }
  decorateCreateLinks();

  proofConsentEl?.addEventListener("change", () => {
    const product = selectedProduct();
    if (product) syncCheckoutUi(product);
    setStatus(product ? previewStatusMessage(product) : "");
  });
  checkoutBtn?.addEventListener("click", () => {
    void onCheckoutClick();
  });
  window.addEventListener("hc-key-backup-exported", () => {
    const product = selectedProduct();
    if (product) syncCheckoutUi(product);
  });
  window.addEventListener("hc-recovery-acknowledged", () => {
    const product = selectedProduct();
    if (product) syncCheckoutUi(product);
  });
  shippingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const product = selectedProduct();
    if (!product) return;
    if (shippingResultEl) shippingResultEl.hidden = true;
    void fetchShippingEstimate(product)
      .then(renderShippingEstimate)
      .catch((err) => {
        if (shippingResultEl) {
          shippingResultEl.hidden = false;
          shippingResultEl.textContent =
            err instanceof Error ? err.message : "Could not estimate shipping.";
        }
      });
  });

  try {
    shopConfig = await loadShopConfig();
  } catch {
    shopConfig = {};
  }

  const session = loadCardSigningSessionForCustomize();
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
