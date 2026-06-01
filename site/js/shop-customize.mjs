/**
 * /shop/customize/ — QR customizer → artifact intent → Shopify checkout.
 * See docs/MERCH_FUNNEL_MVP.md.
 */
import { qrScanUrl, resolverApiOrigin } from "./hc-sign.mjs";
import { QR_PREVIEW_RENDER_WIDTH, renderBrandedQrToImage, renderQrToImage } from "./qr-render.mjs";
import { loadShopConfig } from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  merchRefForPersonalizeProductId,
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
  customizeMerchCheckoutStatusMessage,
  personalizeProductDisplay,
  personalizeProducts,
  readCustomizeProductIdFromSearch,
  readManifestoLineForCustomize,
  resolveCustomizePreviewKind,
  resolveInitialCustomizeProductId,
} from "./shop-customize-core.mjs";
import {
  CUSTOMIZE_PREVIEW_FORMING_LABEL,
  customizePreviewManifestoTeaser,
} from "./shop-customize-preview-arrive-core.mjs";
import {
  resetCustomizePreviewArrive,
  runCustomizePreviewArrive,
} from "./shop-customize-preview-arrive.mjs";
import {
  resetCustomizeStrangerPreview,
  syncCustomizeStrangerPreview,
} from "./shop-customize-stranger-preview.mjs";
import {
  canProceedToCheckout,
  proofConsentRequiredIds,
  readProofConsentState,
} from "./shop-proof-consent-core.mjs";
import { syncMerchBackupNudgeNotice } from "./merch-backup-nudge.mjs";
import { loadRootSessionRecordForMerch, merchPreCheckoutRecoveryGateState } from "./merch-backup-nudge-core.mjs";
import { SHOP_CUSTOMIZE_PROOF_PERSISTENCE, SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT, customizeHeroForProduct, customizeHonestyRowsForProduct } from "./shop-merch-copy-core.mjs";
import {
  defaultVariantSelection,
  fetchVariantMatrix,
  findVariantByColorSize,
  isPersonalizeVariantCheckoutReady,
  resolveProductVariants,
  sizesForColor,
  uniqueVariantColors,
  variantHasShopifyCheckout,
} from "./shop-product-variants-core.mjs";
import {
  fetchGlitchHoodieMockups,
  findGlitchHoodieMockupByView,
  glitchHoodieHasPrintifyMockups,
  glitchHoodieMockupIsCached,
  GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW,
  listGlitchHoodieMockupsForColor,
  prefetchGlitchHoodieColorMockups,
  prefetchGlitchHoodieMockupSrc,
  prefetchGlitchHoodieMockupsForView,
  resolveDefaultGlitchHoodieMockup,
  resolveGlitchMockupPhotoSrc,
  warmGlitchHoodieMockupCache,
} from "./shop-glitch-hoodie-mockups-core.mjs";
import {
  fetchFoundingPurseMockups,
  findFoundingPurseMockupByView,
  foundingPurseMockupViewCaption,
  listFoundingPurseMockups,
  resolveDefaultFoundingPurseMockup,
  FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW,
} from "./shop-founding-purse-mockups-core.mjs";
import {
  fetchStickerMockups,
  findStickerMockupByView,
  listStickerMockups,
  resolveDefaultStickerMockup,
  resolveStickerMockupPhotoSrc,
  stickerHasPrintifyMockups,
  stickerMockupViewCaption,
  STICKER_DEFAULT_MOCKUP_VIEW,
} from "./shop-sticker-mockups-core.mjs";
import { STICKER_PERSONALIZED_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";
import {
  artifactIntentSelectionKey,
  GLITCH_PRINT_FRAME_BACKGROUND_OPTIONS,
  GLITCH_PRINT_QR_OVERLAY_WIDTH,
  glitchArtifactIntentPrintFrameBackground,
  glitchHoodieGarmentSwatchHex,
  glitchPrintFramePreviewHint,
  glitchPrintPreviewUsesGarmentSwatchOnly,
  glitchPrintScanReliabilityWarning,
  glitchPrintTransparentOfferedForColor,
  persistGlitchPrintFrameBackground,
  readStoredGlitchPrintFrameBackground,
} from "./shop-customize-printify-qr-core.mjs?v=5";

const PERSONALIZE_PROOF_CONSENT_IDS = proofConsentRequiredIds("personalized");

const cardGate = document.getElementById("shop-customize-card-gate");
const cardReady = document.getElementById("shop-customize-card-ready");
const handleEl = document.getElementById("shop-customize-handle");
const productRow = document.getElementById("shop-customize-products");
const variantSection = document.getElementById("shop-customize-variant-section");
const colorRow = document.getElementById("shop-customize-color-row");
const sizeRow = document.getElementById("shop-customize-size-row");
const variantNoteEl = document.getElementById("shop-customize-variant-note");
const previewImg = document.getElementById("shop-customize-qr-preview");
const previewPlaceholder = document.getElementById("shop-customize-qr-placeholder");
const previewNote = document.getElementById("shop-customize-preview-note");
const mockEl = document.getElementById("shop-customize-mock");
const mockPrintifyEl = document.getElementById("shop-customize-mock-printify");
const mockGarmentEl = document.getElementById("shop-customize-mock-garment");
const mockPhotoEl = document.getElementById("shop-customize-mock-photo");
const plannedQrSectionEl = document.getElementById("shop-customize-planned-qr");
const plannedQrImgEl = document.getElementById("shop-customize-planned-qr-img");
const plannedQrLabelEl = document.querySelector(".shop-customize-planned-qr__label");
const plannedQrHintEl = document.querySelector(".shop-customize-planned-qr__hint");
const mockPhotoWrapEl = document.getElementById("shop-customize-mock-photo-wrap");
const mockViewsEl = document.getElementById("shop-customize-mock-views");
const mockViewCaptionEl = document.getElementById("shop-customize-mock-view-caption");
const printFrameSectionEl = document.getElementById("shop-customize-print-frame-section");
const printFrameRowEl = document.getElementById("shop-customize-print-frame-row");
const printFrameWarningEl = document.getElementById("shop-customize-print-frame-warning");
const printFrameWarningTextEl = document.getElementById("shop-customize-print-frame-warning-text");
const printFrameHintEl = document.getElementById("shop-customize-print-frame-hint");
const previewVessel = document.getElementById("shop-customize-vessel");
const previewHandleEl = document.getElementById("shop-customize-preview-handle");
const previewManifestoEl = document.getElementById("shop-customize-preview-manifesto");
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
const heroEyebrowEl = document.getElementById("shop-customize-hero-eyebrow");
const heroTitleEl = document.getElementById("shop-customize-hero-title");
const heroLeadEl = document.getElementById("shop-customize-hero-lead");
const honestyListEl = document.getElementById("shop-customize-honesty-list");
const printGlitchSectionEl = document.getElementById("shop-customize-print-glitch");
const printGlitchLeadEl = document.getElementById("shop-customize-print-glitch-lead");
const printGlitchCaptionEl = document.getElementById("shop-customize-print-glitch-caption");
const printGlitchImageEl = document.getElementById("shop-customize-print-glitch-image");
const printGlitchExampleSummaryEl = document.getElementById(
  "shop-customize-print-glitch-example-summary"
);

/** @type {Record<string, unknown> | null} */
let shopConfig = null;
/** @type {import("./shop-product-variants-core.mjs").ProductVariant[]} */
let productVariants = [];
/** @type {string} */
let selectedColor = "";
/** @type {string} */
let selectedSize = "";
/** @type {ReturnType<typeof loadCardSigningSessionForCustomize> | null} */
let signingSession = null;
/** @type {string | null} */
let selectedProductId = null;
/** @type {{ artifact_intent_id: string, planned_item_qr_ids: string[], shopify?: { cart_line_attributes: { key: string, value: string }[] } } | null} */
let activeIntent = null;
/** @type {"planned" | "card_fallback" | null} */
let previewMode = null;
/** @type {string | null} */
let currentPreviewScanUrl = null;
/** @type {unknown | null} */
let glitchMockupsPayload = null;
/** @type {Promise<unknown | null> | null} */
let glitchMockupsLoadPromise = null;
/** @type {unknown | null} */
let foundingPurseMockupsPayload = null;
/** @type {Promise<unknown | null> | null} */
let foundingPurseMockupsLoadPromise = null;
/** @type {string} */
let selectedMockupView = GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW;
/** @type {import("./shop-customize-printify-qr-core.mjs").GlitchPrintFrameBackgroundPreview} */
let selectedGlitchPrintFrameBackground = readStoredGlitchPrintFrameBackground();
/** @type {string | null} */
let activeIntentVariantKey = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let variantIntentSyncTimer = null;
/** Scroll preview into view once after deep-link ?product= load. */
let shouldScrollToPreview = false;

const GLITCH_PLANNED_QR_LABEL = "QR for this hoodie (not your card QR)";
const GLITCH_PLANNED_QR_HINT =
  "Separate code under your card. Scans as live only after checkout — not while customizing.";

function scrollCustomizePreviewIntoView() {
  const target =
    document.getElementById("shop-customize-mock") ??
    document.querySelector(".shop-customize-preview-wrap");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function maybeScrollToPreviewAfterDeepLink() {
  if (!shouldScrollToPreview) return;
  shouldScrollToPreview = false;
  requestAnimationFrame(() => scrollCustomizePreviewIntoView());
}

function resetMockupViewForProduct(product) {
  const kind = product ? resolveCustomizePreviewKind(product) : "hoodie";
  selectedMockupView =
    kind === "founding_purse"
      ? FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW
      : GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW;
}

function clearProductMockPhotoWrapChrome() {
  if (!(mockPhotoWrapEl instanceof HTMLElement)) return;
  mockPhotoWrapEl.classList.remove(
    "shop-customize-mock__photo-wrap--garment-swatch",
    "shop-customize-mock__photo-wrap--qr-transparent",
    "shop-customize-mock__photo-wrap--purse-static"
  );
  mockPhotoWrapEl.style.removeProperty("--hc-glitch-garment-swatch");
}

function syncPlannedQrPreviewLabels() {
  if (plannedQrLabelEl instanceof HTMLElement) {
    plannedQrLabelEl.textContent = GLITCH_PLANNED_QR_LABEL;
  }
  if (plannedQrHintEl instanceof HTMLElement) {
    plannedQrHintEl.textContent = GLITCH_PLANNED_QR_HINT;
  }
  plannedQrSectionEl?.classList.remove("shop-customize-planned-qr--purse");
}

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
    previewPlaceholder.textContent = loading ? CUSTOMIZE_PREVIEW_FORMING_LABEL : "";
  }
  if (loading && previewVessel) {
    previewVessel.hidden = true;
  }
}

function hidePreviewArriveItems() {
  const scope = mockEl?.closest(".shop-customize-preview-wrap");
  for (const el of scope?.querySelectorAll(".shop-customize-arrive-item") ?? []) {
    el.hidden = true;
    el.classList.remove("shop-customize-arrive-item--visible");
  }
}

function syncPreviewVesselMeta(session) {
  const handle =
    session?.handle && String(session.handle).trim()
      ? `@${String(session.handle).trim()}`
      : session?.profile_id
        ? session.profile_id.slice(0, 12)
        : null;
  if (previewHandleEl) {
    previewHandleEl.textContent = handle || "";
    previewHandleEl.hidden = !handle;
  }
  const teaser = customizePreviewManifestoTeaser(readManifestoLineForCustomize());
  if (previewManifestoEl) {
    previewManifestoEl.textContent = teaser || "";
    previewManifestoEl.hidden = !teaser;
  }
}

function showPreviewImage(show) {
  if (previewImg) previewImg.hidden = !show;
}

function selectedProduct() {
  if (!shopConfig || !selectedProductId) return null;
  return personalizeProducts(shopConfig).find((p) => p.product_id === selectedProductId) ?? null;
}

function selectedVariant() {
  if (!productVariants.length) return null;
  return findVariantByColorSize(productVariants, selectedColor, selectedSize);
}

function productDisplay() {
  const product = selectedProduct();
  if (!product) return null;
  return personalizeProductDisplay(product, selectedVariant());
}

function variantSelectionKey() {
  const variant = selectedVariant();
  if (!variant) return "";
  const base = `${variant.print_variant_id}|${variant.shopify_variant_id ?? ""}`;
  const product = selectedProduct();
  if (!isGlitchHoodieProduct(product)) return base;
  return artifactIntentSelectionKey(
    variant,
    glitchArtifactIntentPrintFrameBackground(selectedColor, selectedGlitchPrintFrameBackground)
  );
}

function glitchArtifactIntentBodyFields() {
  if (!isGlitchHoodieProduct(selectedProduct())) return {};
  return {
    print_frame_background: glitchArtifactIntentPrintFrameBackground(
      selectedColor,
      selectedGlitchPrintFrameBackground
    ),
  };
}

function ensureGlitchPrintFrameAllowedForColor() {
  if (
    selectedGlitchPrintFrameBackground === "transparent" &&
    !glitchPrintTransparentOfferedForColor(selectedColor)
  ) {
    selectedGlitchPrintFrameBackground = "full";
    persistGlitchPrintFrameBackground("full");
  }
}

function onGlitchVariantSelectionChange() {
  ensureGlitchPrintFrameAllowedForColor();
  syncVariantNote();
  syncGlitchPrintifyGallery();
  syncGlitchPrintFrameSection();
  if (usesGlitchPrintifyGallery()) {
    prefetchGlitchHoodieColorMockups(glitchMockupsPayload, selectedColor);
    scheduleVariantIntentSync();
    void refreshGlitchPrintPreviews();
    const product = selectedProduct();
    if (product) syncCheckoutUi(product);
    return;
  }
  activeIntent = null;
  activeIntentVariantKey = null;
  void refreshPreview();
}

function scheduleVariantIntentSync() {
  if (variantIntentSyncTimer) clearTimeout(variantIntentSyncTimer);
  variantIntentSyncTimer = setTimeout(() => {
    variantIntentSyncTimer = null;
    void syncVariantCheckoutIntent();
  }, 120);
}

async function syncVariantCheckoutIntent() {
  const product = selectedProduct();
  if (!product || !signingSession || !usesGlitchPrintifyGallery()) return;

  const key = variantSelectionKey();
  if (activeIntent?.artifact_intent_id && activeIntentVariantKey === key) {
    syncCheckoutUi(product);
    return;
  }

  const origin =
    typeof shopConfig?.site_origin === "string" && shopConfig.site_origin.trim()
      ? shopConfig.site_origin.trim()
      : "https://humanity.llc";

  try {
    activeIntent = null;
    activeIntentVariantKey = null;
    const intent = await ensureArtifactIntent(product);
    const plannedQrId = intent.planned_item_qr_ids?.[0];
    if (plannedQrId) {
      currentPreviewScanUrl = buildPlannedItemScanUrl(signingSession.profile_id, plannedQrId, origin);
      previewMode = "planned";
    }
    syncCustomizeStrangerPreview({ scanUrl: currentPreviewScanUrl });
    void syncGlitchPlannedQrPreview(currentPreviewScanUrl);
  } catch {
    const fallbackUrl = cardFallbackScanUrl();
    if (fallbackUrl) {
      currentPreviewScanUrl = fallbackUrl;
      previewMode = "card_fallback";
      syncCustomizeStrangerPreview({ scanUrl: currentPreviewScanUrl });
      hideGlitchPlannedQrPreview();
    }
  }

  syncCheckoutUi(product);
  setStatus(previewStatusMessage(product));
}

function syncVariantNote() {
  if (!variantNoteEl) return;
  const variant = selectedVariant();
  if (!variant) {
    variantNoteEl.hidden = true;
    return;
  }
  if (variantHasShopifyCheckout(variant)) {
    variantNoteEl.hidden = true;
    return;
  }
  variantNoteEl.hidden = false;
  variantNoteEl.textContent = `${variant.label} — checkout opens when this variant is wired in Shopify (operator paste).`;
}

function renderVariantPickers() {
  const product = selectedProduct();
  if (!product || !colorRow || !sizeRow || !variantSection) return;

  const hasMatrix =
    product.variant_matrix === "glitch_hoodie_v1" || product.product_id === "glitch_hoodie_v1";
  if (!hasMatrix || productVariants.length <= 1) {
    variantSection.hidden = true;
    colorRow.replaceChildren();
    sizeRow.replaceChildren();
    return;
  }

  variantSection.hidden = false;
  const colors = uniqueVariantColors(productVariants);
  if (!selectedColor || !colors.includes(selectedColor)) {
    const defaults = defaultVariantSelection(productVariants);
    selectedColor = defaults.color;
    selectedSize = defaults.size;
  }

  colorRow.replaceChildren();
  for (const color of colors) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "create-template-btn shop-customize-variant-btn";
    btn.textContent = color;
    btn.dataset.color = color;
    btn.setAttribute("aria-pressed", color === selectedColor ? "true" : "false");
    if (color === selectedColor) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      if (selectedColor === color) return;
      selectedColor = color;
      const sizes = sizesForColor(productVariants, color);
      if (!sizes.includes(selectedSize)) {
        selectedSize = sizes.includes("M") ? "M" : sizes[0];
      }
      renderVariantPickers();
      onGlitchVariantSelectionChange();
    });
    colorRow.appendChild(btn);
  }

  sizeRow.replaceChildren();
  for (const size of sizesForColor(productVariants, selectedColor)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "create-template-btn shop-customize-variant-btn";
    btn.textContent = size;
    btn.dataset.size = size;
    btn.setAttribute("aria-pressed", size === selectedSize ? "true" : "false");
    if (size === selectedSize) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      if (selectedSize === size) return;
      selectedSize = size;
      renderVariantPickers();
      onGlitchVariantSelectionChange();
    });
    sizeRow.appendChild(btn);
  }

  syncVariantNote();
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
    selectedProductId = resolveInitialCustomizeProductId(
      products,
      readCustomizeProductIdFromSearch(window.location.search)
    );
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
      resetMockupViewForProduct(product);
      persistMerchCreateRef(merchRefForPersonalizeProductId(display.productId));
      syncProductCopy(product);
      void loadVariantsForProduct(product);
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

function syncProductCopy(product) {
  if (!product) return;
  const display = personalizeProductDisplay(product);
  const hero = customizeHeroForProduct(display.productId);
  if (heroEyebrowEl) heroEyebrowEl.textContent = hero.eyebrow;
  if (heroTitleEl) heroTitleEl.textContent = hero.title;
  if (heroLeadEl) heroLeadEl.textContent = hero.lead;
  if (honestyListEl) {
    honestyListEl.replaceChildren();
    for (const row of customizeHonestyRowsForProduct(display.productId)) {
      const li = document.createElement("li");
      li.className = "list-row";
      const content = document.createElement("span");
      content.className = "list-content";
      const title = document.createElement("span");
      title.className = "list-title";
      title.textContent = row.title;
      const sub = document.createElement("span");
      sub.className = "list-sub";
      sub.textContent = row.sub;
      content.append(title, sub);
      li.append(content);
      honestyListEl.appendChild(li);
    }
  }
  const showPrintGlitch = isGlitchHoodieProduct(product);
  if (printGlitchSectionEl) printGlitchSectionEl.hidden = !showPrintGlitch;
  if (showPrintGlitch) {
    const callout = SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT;
    if (printGlitchLeadEl) printGlitchLeadEl.textContent = callout.lead;
    if (printGlitchExampleSummaryEl) {
      printGlitchExampleSummaryEl.textContent = callout.exampleSummary ?? "See example";
    }
    if (printGlitchCaptionEl) printGlitchCaptionEl.textContent = callout.caption;
    if (printGlitchImageEl) {
      printGlitchImageEl.src = callout.imageSrc;
      printGlitchImageEl.alt = callout.imageAlt;
    }
  }
}

function usesGlitchPrintifyGallery() {
  const product = selectedProduct();
  const kind = product ? resolveCustomizePreviewKind(product) : "hoodie";
  if (kind !== "glitch_hoodie") return false;
  return glitchHoodieHasPrintifyMockups(glitchMockupsPayload, selectedColor);
}

function usesProductMockGallery() {
  const product = selectedProduct();
  if (isFoundingPurseProduct(product)) {
    return listFoundingPurseMockups(foundingPurseMockupsPayload).length > 0;
  }
  return usesGlitchPrintifyGallery();
}

function isFoundingPurseProduct(product) {
  if (!product) return false;
  return (
    product.preview === "founding_purse" || product.product_id === "founding_purse_v1"
  );
}

function isGlitchHoodieProduct(product) {
  if (!product) return false;
  return (
    product.variant_matrix === "glitch_hoodie_v1" || product.product_id === "glitch_hoodie_v1"
  );
}

function glitchPrintFrameRenderOpts() {
  const transparent = selectedGlitchPrintFrameBackground === "transparent";
  return {
    framePadding: "tight",
    frameBackground: selectedGlitchPrintFrameBackground,
    ...(transparent
      ? { transparentQrQuietZone: true, skipFinderLogo: true }
      : {}),
  };
}

function syncGlitchPrintFrameSection() {
  const product = selectedProduct();
  const show = isGlitchHoodieProduct(product);
  if (printFrameSectionEl) printFrameSectionEl.hidden = !show;
  if (!show) return;

  if (printFrameRowEl) {
    printFrameRowEl.replaceChildren();
    for (const option of GLITCH_PRINT_FRAME_BACKGROUND_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "create-template-btn";
      btn.textContent = option.label;
      btn.dataset.frameBackground = option.id;
      btn.title = option.description;
      if (option.id === selectedGlitchPrintFrameBackground) btn.classList.add("is-active");
      if (
        option.id === "transparent" &&
        !glitchPrintTransparentOfferedForColor(selectedColor)
      ) {
        btn.disabled = true;
        btn.title = "White card required for this color (scan reliability).";
      }
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        selectedGlitchPrintFrameBackground = option.id;
        persistGlitchPrintFrameBackground(option.id);
        syncGlitchPrintFrameSection();
        scheduleVariantIntentSync();
        void refreshGlitchPrintPreviews();
      });
      printFrameRowEl.appendChild(btn);
    }
  }

  const warning = glitchPrintScanReliabilityWarning({
    color: selectedColor,
    frameBackground: selectedGlitchPrintFrameBackground,
  });
  if (printFrameWarningEl && printFrameWarningTextEl) {
    if (warning) {
      printFrameWarningTextEl.textContent = warning;
      printFrameWarningEl.hidden = false;
    } else {
      printFrameWarningEl.hidden = true;
      printFrameWarningTextEl.textContent = "";
    }
  }

  syncGlitchPrintPreviewChrome();
}

function glitchActiveMockupEntry() {
  const mockups = listGlitchHoodieMockupsForColor(glitchMockupsPayload, selectedColor);
  return findGlitchHoodieMockupByView(mockups, selectedMockupView);
}

function glitchPrintPreviewContext(mockupEntry = null) {
  const entry = mockupEntry ?? glitchActiveMockupEntry();
  return {
    frameBackground: selectedGlitchPrintFrameBackground,
    viewId: selectedMockupView,
    mockupEntry: entry,
  };
}

function syncGlitchPrintPreviewChrome(mockupEntry = null) {
  const ctx = glitchPrintPreviewContext(mockupEntry);
  const swatchFallback = glitchPrintPreviewUsesGarmentSwatchOnly(ctx);

  if (mockPhotoWrapEl instanceof HTMLElement) {
    mockPhotoWrapEl.classList.toggle(
      "shop-customize-mock__photo-wrap--garment-swatch",
      swatchFallback
    );
    mockPhotoWrapEl.classList.toggle(
      "shop-customize-mock__photo-wrap--qr-transparent",
      selectedGlitchPrintFrameBackground === "transparent" && swatchFallback
    );
    mockPhotoWrapEl.style.setProperty(
      "--hc-glitch-garment-swatch",
      glitchHoodieGarmentSwatchHex(selectedColor)
    );
  }

  if (printFrameHintEl) {
    printFrameHintEl.textContent = glitchPrintFramePreviewHint(ctx);
  }
}

async function refreshGlitchPrintPreviews() {
  const product = selectedProduct();
  if (isFoundingPurseProduct(product)) {
    syncProductMockGallery();
    return;
  }
  if (!isGlitchHoodieProduct(product)) return;
  if (usesGlitchPrintifyGallery()) {
    syncGlitchPrintPreviewChrome();
    syncGlitchPrintifyGallery();
    void syncGlitchPlannedQrPreview(currentPreviewScanUrl);
  } else if (currentPreviewScanUrl) {
    await renderPreviewScanUrl(currentPreviewScanUrl);
  }
}

function syncMockPreviewKind() {
  if (!mockEl) return;
  const product = selectedProduct();
  const kind = product ? resolveCustomizePreviewKind(product) : "hoodie";
  mockEl.dataset.preview = kind;
  if (kind === "sticker") {
    const layout = customizeStickerMockLayout(QR_PREVIEW_RENDER_WIDTH);
    mockEl.style.setProperty("--hc-sticker-card-aspect", String(layout.cardAspect));
    mockEl.style.setProperty("--hc-sticker-card-width", `${layout.cardWidthPct}%`);
  } else {
    mockEl.style.removeProperty("--hc-sticker-card-aspect");
    mockEl.style.removeProperty("--hc-sticker-card-width");
  }
  syncProductMockGallery();
  syncGlitchPrintFrameSection();
}

function clearFoundingPurseGallery() {
  if (mockViewCaptionEl instanceof HTMLElement) {
    mockViewCaptionEl.hidden = true;
    mockViewCaptionEl.textContent = "";
  }
  clearProductMockPhotoWrapChrome();
}

function syncFoundingPurseMockViewCaption(active) {
  if (!(mockViewCaptionEl instanceof HTMLElement)) return;
  const caption = foundingPurseMockupViewCaption(active);
  mockViewCaptionEl.textContent = caption;
  mockViewCaptionEl.hidden = !caption;
}

function renderFoundingPurseMockupViewButtons(mockups, activeViewId) {
  if (!(mockViewsEl instanceof HTMLElement)) return;
  mockViewsEl.replaceChildren();
  for (const entry of mockups) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "create-template-btn shop-customize-mock-view-btn";
    btn.textContent = entry.label;
    btn.dataset.viewId = entry.view_id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", entry.view_id === activeViewId ? "true" : "false");
    if (entry.view_id === activeViewId) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      selectedMockupView = entry.view_id;
      syncFoundingPurseGallery();
    });
    mockViewsEl.appendChild(btn);
  }
}

function syncFoundingPurseGallery() {
  if (!mockEl) return;
  const product = selectedProduct();
  const kind = product ? resolveCustomizePreviewKind(product) : "hoodie";
  if (kind !== "founding_purse") {
    clearFoundingPurseGallery();
    return;
  }

  const mockups = listFoundingPurseMockups(foundingPurseMockupsPayload);
  if (!mockups.length) {
    clearFoundingPurseGallery();
    clearGlitchPrintifyGallery();
    return;
  }

  if (!findFoundingPurseMockupByView(mockups, selectedMockupView)) {
    selectedMockupView =
      resolveDefaultFoundingPurseMockup(mockups)?.view_id ?? FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW;
  }

  const active = findFoundingPurseMockupByView(mockups, selectedMockupView);
  if (!active || !(mockPhotoEl instanceof HTMLImageElement)) {
    clearFoundingPurseGallery();
    return;
  }

  mockEl.classList.add("shop-customize-mock--printify-gallery");
  mockPrintifyEl?.removeAttribute("hidden");
  mockGarmentEl?.setAttribute("hidden", "");
  if (previewVessel) previewVessel.hidden = true;

  clearProductMockPhotoWrapChrome();
  mockPhotoWrapEl?.classList.add("shop-customize-mock__photo-wrap--purse-static");

  renderFoundingPurseMockupViewButtons(mockups, active.view_id);
  syncFoundingPurseMockViewCaption(active);
  mockPhotoEl.src = active.src;
  mockPhotoEl.alt = `Founding LIVE OBJECT purse — ${active.label}`;
  mockPrintifyEl?.classList.remove("is-loading-photo");
}

function syncProductMockGallery() {
  const product = selectedProduct();
  const kind = product ? resolveCustomizePreviewKind(product) : "hoodie";
  if (kind === "founding_purse") {
    clearGlitchPrintifyGallery();
    syncFoundingPurseGallery();
    return;
  }
  if (kind === "glitch_hoodie") {
    clearFoundingPurseGallery();
    syncGlitchPrintifyGallery();
    return;
  }
  clearGlitchPrintifyGallery();
  clearFoundingPurseGallery();
}

function clearGlitchPrintifyGallery() {
  if (!mockEl) return;
  mockEl.classList.remove("shop-customize-mock--printify-gallery");
  mockPrintifyEl?.setAttribute("hidden", "");
  mockGarmentEl?.removeAttribute("hidden");
  if (mockViewsEl) mockViewsEl.replaceChildren();
  if (mockPhotoEl instanceof HTMLImageElement) {
    mockPhotoEl.removeAttribute("src");
  }
  hideGlitchPlannedQrPreview();
}

function hidePlannedQrPreview() {
  if (plannedQrSectionEl) {
    plannedQrSectionEl.hidden = true;
    plannedQrSectionEl.classList.remove("shop-customize-planned-qr--purse");
  }
  if (plannedQrImgEl instanceof HTMLImageElement) {
    plannedQrImgEl.hidden = true;
    plannedQrImgEl.removeAttribute("src");
    plannedQrImgEl.classList.remove("is-loading");
  }
}

function hideGlitchPlannedQrPreview() {
  hidePlannedQrPreview();
}

async function syncGlitchPlannedQrPreview(scanUrl) {
  if (!usesGlitchPrintifyGallery() || previewMode !== "planned" || !scanUrl?.trim()) {
    hideGlitchPlannedQrPreview();
    return;
  }
  if (!(plannedQrImgEl instanceof HTMLImageElement)) return;
  syncPlannedQrPreviewLabels();
  if (plannedQrSectionEl) plannedQrSectionEl.hidden = false;
  plannedQrImgEl.classList.add("is-loading");
  try {
    await renderBrandedQrToImage(plannedQrImgEl, scanUrl, {
      width: GLITCH_PRINT_QR_OVERLAY_WIDTH,
      ...glitchPrintFrameRenderOpts(),
      alt:
        selectedGlitchPrintFrameBackground === "transparent"
          ? "Your planned live-object QR — transparent print preview"
          : "Your planned live-object QR — white card print preview",
    });
    plannedQrImgEl.hidden = false;
  } catch {
    hideGlitchPlannedQrPreview();
  } finally {
    plannedQrImgEl.classList.remove("is-loading");
  }
}

function renderGlitchMockupViewButtons(mockups, activeViewId) {
  if (!(mockViewsEl instanceof HTMLElement)) return;
  mockViewsEl.replaceChildren();
  for (const entry of mockups) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "create-template-btn shop-customize-mock-view-btn";
    btn.textContent = entry.label;
    btn.dataset.viewId = entry.view_id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", entry.view_id === activeViewId ? "true" : "false");
    if (entry.view_id === activeViewId) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      selectedMockupView = entry.view_id;
      prefetchGlitchHoodieMockupsForView(glitchMockupsPayload, entry.view_id);
      syncGlitchPrintifyGallery();
    });
    mockViewsEl.appendChild(btn);
  }
}

function syncGlitchPrintifyGallery() {
  if (!mockEl) return;
  const product = selectedProduct();
  const kind = product ? resolveCustomizePreviewKind(product) : "hoodie";
  if (kind !== "glitch_hoodie") {
    clearGlitchPrintifyGallery();
    return;
  }

  const mockups = listGlitchHoodieMockupsForColor(glitchMockupsPayload, selectedColor);
  if (!mockups.length) {
    clearGlitchPrintifyGallery();
    return;
  }

  if (!findGlitchHoodieMockupByView(mockups, selectedMockupView)) {
    selectedMockupView =
      resolveDefaultGlitchHoodieMockup(mockups)?.view_id ?? GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW;
  }

  const active = findGlitchHoodieMockupByView(mockups, selectedMockupView);
  if (!active || !(mockPhotoEl instanceof HTMLImageElement)) {
    clearGlitchPrintifyGallery();
    return;
  }

  mockEl.classList.add("shop-customize-mock--printify-gallery");
  mockPrintifyEl?.removeAttribute("hidden");
  mockGarmentEl?.setAttribute("hidden", "");
  if (previewVessel) previewVessel.hidden = true;

  renderGlitchMockupViewButtons(mockups, active.view_id);
  const previewCtx = glitchPrintPreviewContext(active);
  syncGlitchPrintPreviewChrome(active);

  const photoSrc = resolveGlitchMockupPhotoSrc(active, {
    frameBackground: selectedGlitchPrintFrameBackground,
  });
  const swatchFallback = glitchPrintPreviewUsesGarmentSwatchOnly(previewCtx);
  if (photoSrc && !swatchFallback) {
    void setMockPhotoSrc(photoSrc);
    mockPhotoEl.alt =
      selectedGlitchPrintFrameBackground === "transparent"
        ? `${selectedColor} hoodie — transparent Printify mockup`
        : `${selectedColor} hoodie — ${active.label}`;
  } else {
    mockPhotoEl.removeAttribute("src");
    mockPrintifyEl?.classList.remove("is-loading-photo");
    mockPhotoEl.alt = `${selectedColor} hoodie — transparent QR preview`;
  }
  void syncGlitchPlannedQrPreview(currentPreviewScanUrl);
}

function setMockPhotoSrc(src) {
  if (!(mockPhotoEl instanceof HTMLImageElement)) return;
  const resolved = new URL(src, window.location.origin).href;
  if (mockPhotoEl.src === resolved && mockPhotoEl.complete && mockPhotoEl.naturalWidth > 0) {
    mockPrintifyEl?.classList.remove("is-loading-photo");
    return;
  }

  const apply = () => {
    mockPhotoEl.src = src;
    mockPrintifyEl?.classList.remove("is-loading-photo");
  };

  if (glitchHoodieMockupIsCached(src)) {
    apply();
    return;
  }

  mockPrintifyEl?.classList.add("is-loading-photo");
  void prefetchGlitchHoodieMockupSrc(src).then(apply).catch(apply);
}

async function ensureGlitchMockupsLoaded() {
  if (glitchMockupsPayload !== null) return glitchMockupsPayload;
  if (!glitchMockupsLoadPromise) {
    glitchMockupsLoadPromise = fetchGlitchHoodieMockups()
      .then((payload) => {
        glitchMockupsPayload = payload;
        warmGlitchHoodieMockupCache(payload, selectedColor, selectedMockupView);
        return payload;
      })
      .catch(() => {
        glitchMockupsPayload = { by_color: {} };
        return glitchMockupsPayload;
      });
  }
  return glitchMockupsLoadPromise;
}

async function ensureFoundingPurseMockupsLoaded() {
  if (foundingPurseMockupsPayload !== null) return foundingPurseMockupsPayload;
  if (!foundingPurseMockupsLoadPromise) {
    foundingPurseMockupsLoadPromise = fetchFoundingPurseMockups()
      .then((payload) => {
        foundingPurseMockupsPayload = payload;
        return payload;
      })
      .catch(() => {
        foundingPurseMockupsPayload = { mockups: [] };
        return foundingPurseMockupsPayload;
      });
  }
  return foundingPurseMockupsLoadPromise;
}

function cardFallbackScanUrl() {
  if (!signingSession) return null;
  return signingSession.scan_url || qrScanUrl(signingSession.profile_id, signingSession.qr_id);
}

async function loadVariantsForProduct(product) {
  if (!product) {
    productVariants = [];
    renderVariantPickers();
    return;
  }
  const isGlitch =
    product.variant_matrix === "glitch_hoodie_v1" || product.product_id === "glitch_hoodie_v1";
  const isPurse = isFoundingPurseProduct(product);
  if (isGlitch) {
    await ensureGlitchMockupsLoaded();
  }
  if (isPurse) {
    await ensureFoundingPurseMockupsLoaded();
  }
  try {
    const matrixPayload = await fetchVariantMatrix();
    productVariants = resolveProductVariants(product, matrixPayload);
  } catch {
    productVariants = resolveProductVariants(product, null);
  }
  const defaults = defaultVariantSelection(productVariants);
  selectedColor = defaults.color;
  selectedSize = defaults.size;
  if (isPurse) {
    resetMockupViewForProduct(product);
  }
  ensureGlitchPrintFrameAllowedForColor();
  renderVariantPickers();
  syncProductMockGallery();
  syncGlitchPrintFrameSection();
}

async function createArtifactIntent(product) {
  if (!signingSession) throw new Error("Create a card first.");
  const display = productDisplay() ?? personalizeProductDisplay(product);
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
      print_variant_id: display.printVariantId || undefined,
      ...glitchArtifactIntentBodyFields(),
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
  const display = productDisplay() ?? personalizeProductDisplay(product);
  const origin = resolverApiOrigin();
  const res = await fetch(
    `${origin}/v1/store/artifact-intents/${encodeURIComponent(intentId)}/attach`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        shopify_variant_id: display.shopifyVariantId || undefined,
        print_variant_id: display.printVariantId || undefined,
        ...glitchArtifactIntentBodyFields(),
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
  const key = variantSelectionKey();
  if (activeIntent?.artifact_intent_id && activeIntentVariantKey === key) {
    return activeIntent;
  }
  activeIntent = await createArtifactIntent(product);
  activeIntentVariantKey = key;
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
  const product = selectedProduct();
  if (isGlitchHoodieProduct(product)) {
    await renderBrandedQrToImage(previewImg, scanUrl, {
      width: QR_PREVIEW_RENDER_WIDTH,
      ...glitchPrintFrameRenderOpts(),
      alt: "Branded QR preview for your print item",
    });
  } else {
    await renderQrToImage(previewImg, scanUrl);
  }
  previewImg.alt = "Branded QR preview for your print item";
  showPreviewImage(true);
}

function personalizeProofConsentComplete(product) {
  const variant = selectedVariant();
  const checkoutReady =
    productVariants.length > 1
      ? isPersonalizeVariantCheckoutReady(shopConfig, product, variant)
      : isPersonalizeCheckoutReady(shopConfig, product);
  return canProceedToCheckout(
    checkoutReady,
    PERSONALIZE_PROOF_CONSENT_IDS,
    readProofConsentState(proofConsentEl, PERSONALIZE_PROOF_CONSENT_IDS)
  );
}

function syncCheckoutUi(product) {
  const variant = selectedVariant();
  const checkoutOpen =
    productVariants.length > 1
      ? isPersonalizeVariantCheckoutReady(shopConfig, product, variant)
      : isPersonalizeCheckoutReady(shopConfig, product);
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
  const variant = selectedVariant();
  const checkoutOpen =
    productVariants.length > 1
      ? isPersonalizeVariantCheckoutReady(shopConfig, product, variant)
      : isPersonalizeCheckoutReady(shopConfig, product);
  return customizeMerchCheckoutStatusMessage({
    checkoutOpen,
    previewModeCardFallback: previewMode === "card_fallback",
    consentCheckedIds: readProofConsentState(proofConsentEl, PERSONALIZE_PROOF_CONSENT_IDS),
  });
}

async function refreshPreview() {
  const product = selectedProduct();
  if (!product || !signingSession) return;
  syncMockPreviewKind();
  const printifyGallery = usesProductMockGallery();

  if (!printifyGallery) {
    resetCustomizePreviewArrive(mockEl);
    resetCustomizeStrangerPreview();
    hidePreviewArriveItems();
  } else {
    resetCustomizeStrangerPreview();
    if (previewVessel) previewVessel.hidden = true;
    mockEl?.classList.remove("is-loading");
  }

  const display = productDisplay() ?? personalizeProductDisplay(product);
  if (priceEl) {
    priceEl.textContent = display.priceDisplay || "Price at checkout";
  }

  if (!printifyGallery) {
    syncPreviewVesselMeta(signingSession);
    setPreviewLoading(true);
    showPreviewImage(false);
  }

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
    currentPreviewScanUrl = scanUrl;
    previewMode = "planned";
    if (previewNote) {
      previewNote.hidden = false;
      if (isFoundingPurseProduct(product)) {
        previewNote.textContent =
          "Photo angles only — founding purse mockups. Your unique QR is reserved at checkout and goes live after fulfillment.";
      } else {
        previewNote.textContent = printifyGallery
          ? `${glitchPrintFramePreviewHint(glitchPrintPreviewContext())} Sample art on the garment photo is not your code. The QR below is a separate id reserved for this hoodie (not your wallet card QR). It will not scan as live until after checkout; scanning early may show “unknown QR” for the same @handle.`
          : "This is your item's planned QR — it goes live after payment and fulfillment. Holding the garment still does not prove you own the card.";
      }
    }
    if (!printifyGallery && previewImg) {
      await renderPreviewScanUrl(scanUrl);
    } else if (printifyGallery) {
      syncProductMockGallery();
    }
  } catch {
    const fallbackUrl = cardFallbackScanUrl();
    if (!fallbackUrl) throw new Error("Create a card first.");
    currentPreviewScanUrl = fallbackUrl;
    previewMode = "card_fallback";
    if (previewNote) {
      previewNote.hidden = false;
      previewNote.textContent = printifyGallery
        ? "Could not reserve a planned hoodie QR yet (check that the worker is running and the database is migrated). Your card QR is not shown here — complete setup, then refresh. Each item still gets its own code at fulfillment."
        : "Print preview uses your card QR for now. Each physical item still receives its own unique code at fulfillment.";
    }
    if (!printifyGallery && previewImg) {
      await renderPreviewScanUrl(fallbackUrl);
    }
  }

  if (!printifyGallery) {
    setPreviewLoading(false);
    if (previewVessel) previewVessel.hidden = false;
    syncCustomizeStrangerPreview({ scanUrl: currentPreviewScanUrl });
    await runCustomizePreviewArrive(mockEl);
    hidePlannedQrPreview();
  } else {
    syncCustomizeStrangerPreview({ scanUrl: currentPreviewScanUrl });
    if (isFoundingPurseProduct(product)) {
      syncProductMockGallery();
      hidePlannedQrPreview();
    } else {
      void syncGlitchPlannedQrPreview(currentPreviewScanUrl);
    }
  }

  syncCheckoutUi(product);
  setStatus(previewStatusMessage(product));
  maybeScrollToPreviewAfterDeepLink();
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
    const display = productDisplay() ?? personalizeProductDisplay(product);
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
  if (product) {
    persistMerchCreateRef(
      merchRefForPersonalizeProductId(personalizeProductDisplay(product).productId)
    );
    syncProductCopy(product);
    void loadVariantsForProduct(product).then(() => {
      syncCheckoutUi(product);
      void refreshPreview();
    });
    return;
  }
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
  function resyncCheckoutFromStorage() {
    const product = selectedProduct();
    if (!product) return;
    syncCheckoutUi(product);
    setStatus(previewStatusMessage(product));
  }

  window.addEventListener("hc-key-backup-exported", resyncCheckoutFromStorage);
  window.addEventListener("hc-recovery-acknowledged", resyncCheckoutFromStorage);
  window.addEventListener("hc-device-hub-changed", resyncCheckoutFromStorage);
  window.addEventListener("pageshow", resyncCheckoutFromStorage);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resyncCheckoutFromStorage();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "hc_wallet") resyncCheckoutFromStorage();
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

  const urlProductId = readCustomizeProductIdFromSearch(window.location.search);
  const products = personalizeProducts(shopConfig);
  const resolvedProductId = resolveInitialCustomizeProductId(products, urlProductId);
  if (resolvedProductId) {
    selectedProductId = resolvedProductId;
  }
  if (urlProductId && resolvedProductId === urlProductId) {
    shouldScrollToPreview = true;
    if (resolvedProductId === "founding_purse_v1") {
      selectedMockupView = FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW;
    }
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
