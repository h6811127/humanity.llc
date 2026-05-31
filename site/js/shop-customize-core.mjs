/**
 * QR customizer — pure helpers (artifact intent checkout URLs, session detection).
 * See docs/MERCH_FUNNEL_MVP.md · sticker mockup uses qrFrameMetrics portrait card on 3×3″ sheet.
 */
import { qrFrameMetrics } from "./qr-branding.mjs";
import {
  isProofConsentComplete,
  proofConsentRequiredIds,
  proofConsentStatusMessage,
} from "./shop-proof-consent-core.mjs";
import {
  loadRootSessionRecordForMerch,
  merchPreCheckoutRecoveryGateState,
} from "./merch-backup-nudge-core.mjs";

const PERSONALIZE_MERCH_CONSENT_IDS = proofConsentRequiredIds("personalized");

/** Printify kiss-cut billing tier (inches). */
export const STICKER_MOCK_SHEET_IN = 3;

/** Portrait card trim width on sheet (inches). */
export const STICKER_MOCK_CARD_WIDTH_IN = 2;

/**
 * @param {unknown} session
 */
function hasSigningKeys(session) {
  return (
    typeof session?.owner_private_key_b58 === "string" ||
    typeof session?.recovery_private_key_b58 === "string"
  );
}

/**
 * @param {Record<string, unknown>} entry
 */
function normalizeCardSession(entry) {
  if (!entry?.profile_id || !entry?.qr_id) return null;
  return {
    profile_id: String(entry.profile_id),
    qr_id: String(entry.qr_id),
    handle: typeof entry.handle === "string" ? entry.handle : null,
    scan_url: typeof entry.scan_url === "string" ? entry.scan_url : null,
  };
}

/**
 * @param {Record<string, unknown>} entry
 */
function normalizeSigningSession(entry) {
  const base = normalizeCardSession(entry);
  if (!base) return null;
  const ownerPrivate =
    typeof entry.owner_private_key_b58 === "string" ? entry.owner_private_key_b58 : null;
  const recoveryPrivate =
    typeof entry.recovery_private_key_b58 === "string" ? entry.recovery_private_key_b58 : null;
  const ownerPublic =
    typeof entry.owner_public_key_b58 === "string" ? entry.owner_public_key_b58 : null;
  const recoveryPublic =
    typeof entry.recovery_public_key_b58 === "string" ? entry.recovery_public_key_b58 : null;
  const privateKeyBase58 = ownerPrivate || recoveryPrivate;
  const publicKeyBase58 = ownerPrivate ? ownerPublic : recoveryPublic;
  if (!privateKeyBase58 || !publicKeyBase58) return null;
  return {
    ...base,
    private_key_b58: privateKeyBase58,
    public_key_b58: publicKeyBase58,
  };
}

/**
 * Card session from hc_created, else first wallet entry with keys.
 * @returns {{ profile_id: string, qr_id: string, handle: string | null, scan_url: string | null } | null}
 */
export function loadCardSessionForCustomize(storage = globalThis) {
  const signing = loadCardSigningSessionForCustomize(storage);
  if (!signing) return null;
  return {
    profile_id: signing.profile_id,
    qr_id: signing.qr_id,
    handle: signing.handle,
    scan_url: signing.scan_url,
  };
}

/**
 * Public manifesto line from hc_created when present (preview vessel teaser).
 * @param {typeof globalThis} [storage]
 * @returns {string | null}
 */
export function readManifestoLineForCustomize(storage = globalThis) {
  const sessionStorage = storage.sessionStorage;
  if (!sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem("hc_created");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const line = parsed?.manifesto_line;
    return typeof line === "string" && line.trim() ? line.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Card session with signing keys for pre-checkout print_artifact mint credentials.
 * @returns {{
 *   profile_id: string;
 *   qr_id: string;
 *   handle: string | null;
 *   scan_url: string | null;
 *   private_key_b58: string;
 *   public_key_b58: string;
 * } | null}
 */
export function loadCardSigningSessionForCustomize(storage = globalThis) {
  const sessionStorage = storage.sessionStorage;
  const localStorage = storage.localStorage;
  if (sessionStorage) {
    try {
      const raw = sessionStorage.getItem("hc_created");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (hasSigningKeys(parsed)) {
          const normalized = normalizeSigningSession(parsed);
          if (normalized) return normalized;
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (localStorage) {
    try {
      const wallet = JSON.parse(localStorage.getItem("hc_wallet") || "[]");
      if (Array.isArray(wallet)) {
        for (const entry of wallet) {
          if (!hasSigningKeys(entry)) continue;
          const normalized = normalizeSigningSession(entry);
          if (normalized) return normalized;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} config
 * @returns {Array<Record<string, unknown>>}
 */
export function personalizeProducts(config) {
  const products = config?.personalize?.products;
  if (!Array.isArray(products)) return [];
  return products.filter((p) => p && typeof p.product_id === "string" && p.product_id.trim());
}

/**
 * @param {Record<string, unknown>} product
 */
export function isPersonalizeProductCheckoutOpen(product) {
  if (!product || product.checkout_open === false) return false;
  const url = typeof product.checkout_url === "string" ? product.checkout_url.trim() : "";
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} product
 */
export function isPersonalizeCheckoutReady(config, product) {
  if (product?.checkout_open === false) return false;
  if (config?.personalize?.checkout_open !== true) return false;

  const launchSku =
    typeof config?.personalize?.checkout_product_id === "string"
      ? config.personalize.checkout_product_id.trim()
      : "";
  if (launchSku && String(product?.product_id ?? "") !== launchSku) {
    return false;
  }

  return isPersonalizeProductCheckoutOpen(product);
}

const SHOPIFY_CART_LINE_PROPERTY_MAX = 25;
const SHOPIFY_CART_LINE_PROPERTY_VALUE_MAX = 255;

/**
 * Shopify cart permalinks require line properties as one Base64 URL-encoded JSON
 * object (?properties=…), not legacy properties[key]=value query pairs.
 *
 * @param {{ key: string, value: string }[]} lineAttributes
 * @returns {string | null}
 */
export function encodeShopifyCartLineProperties(lineAttributes = []) {
  /** @type {Record<string, string>} */
  const properties = {};
  for (const attr of lineAttributes) {
    if (!attr?.key || attr.value == null || attr.value === "") continue;
    const key = String(attr.key).trim();
    if (!key) continue;
    const value = String(attr.value).trim().slice(0, SHOPIFY_CART_LINE_PROPERTY_VALUE_MAX);
    if (!value) continue;
    properties[key] = value;
    if (Object.keys(properties).length >= SHOPIFY_CART_LINE_PROPERTY_MAX) break;
  }
  if (!Object.keys(properties).length) return null;

  const json = JSON.stringify(properties);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * @param {string} encoded
 * @returns {Record<string, string>}
 */
export function decodeShopifyCartLineProperties(encoded) {
  if (!encoded) return {};
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const json = decodeURIComponent(escape(atob(base64)));
  const parsed = JSON.parse(json);
  return parsed && typeof parsed === "object" ? parsed : {};
}

/**
 * @param {string} checkoutUrl
 * @param {number} quantity
 * @param {{ key: string, value: string }[]} lineAttributes
 */
export function buildShopifyCartUrl(checkoutUrl, quantity, lineAttributes = []) {
  const url = new URL(checkoutUrl);
  const cartMatch = url.pathname.match(/^\/cart\/(\d+):(\d+)$/);
  const qty = Math.max(1, Math.min(10, Number.isFinite(quantity) ? quantity : 1));
  if (cartMatch) {
    url.pathname = `/cart/${cartMatch[1]}:${qty}`;
  }
  const encodedProperties = encodeShopifyCartLineProperties(lineAttributes);
  if (encodedProperties) {
    url.searchParams.set("properties", encodedProperties);
  }
  return url.href;
}

/**
 * @param {string} profileId
 * @param {string} plannedQrId
 * @param {string} origin
 */
export function buildPlannedItemScanUrl(profileId, plannedQrId, origin = "https://humanity.llc") {
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(plannedQrId)}`;
}

/**
 * CSS tokens for sticker mockup — portrait card on 3×3″ kiss-cut sheet tier.
 * @param {number} [qrModuleSize] same module size as `renderQrToImage` / QR_PREVIEW_RENDER_WIDTH
 */
export function customizeStickerMockLayout(qrModuleSize = 220) {
  const frame = qrFrameMetrics(qrModuleSize);
  return {
    sheetAspect: 1,
    cardAspect: frame.totalWidth / frame.totalHeight,
    cardWidthPct: (STICKER_MOCK_CARD_WIDTH_IN / STICKER_MOCK_SHEET_IN) * 100,
  };
}

/**
 * @param {string | URLSearchParams | null | undefined} [search]
 * @returns {string | null}
 */
export function readCustomizeProductIdFromSearch(search) {
  const raw =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(typeof search === "string" ? search : "");
  const productId = raw.get("product")?.trim() ?? "";
  return productId || null;
}

/**
 * @param {Record<string, unknown>[]} products
 * @param {string | null | undefined} preferredProductId
 * @returns {string | null}
 */
export function resolveInitialCustomizeProductId(products, preferredProductId) {
  const preferred = preferredProductId?.trim() ?? "";
  if (preferred && products.some((p) => String(p.product_id) === preferred)) {
    return preferred;
  }
  const first = products[0];
  return first?.product_id ? String(first.product_id) : null;
}

/**
 * @param {Record<string, unknown>} product
 * @returns {"sticker" | "hoodie" | "glitch_hoodie" | "founding_purse"}
 */
export function resolveCustomizePreviewKind(product) {
  const preview = typeof product?.preview === "string" ? product.preview.trim() : "";
  if (preview === "sticker" || preview === "glitch_hoodie" || preview === "founding_purse") {
    return preview;
  }
  const productId = String(product?.product_id ?? "").trim();
  if (productId === "glitch_hoodie_v1") return "glitch_hoodie";
  if (productId === "founding_purse_v1") return "founding_purse";
  return "hoodie";
}

/**
 * @param {Record<string, unknown>} product
 * @param {import("./shop-product-variants-core.mjs").ProductVariant | null | undefined} [variant]
 */
export function personalizeProductDisplay(product, variant = null) {
  const checkoutUrl =
    variant?.checkout_url?.trim() ||
    (typeof product.checkout_url === "string" ? product.checkout_url.trim() : "");
  const shopifyVariantId =
    variant?.shopify_variant_id?.trim() ||
    (typeof product.shopify_variant_id === "string" ? product.shopify_variant_id.trim() : "");
  const printVariantId =
    variant?.print_variant_id?.trim() ||
    (typeof product.print_variant_id === "string" ? product.print_variant_id.trim() : "");

  return {
    productId: String(product.product_id),
    title: typeof product.title === "string" ? product.title : "Personalized item",
    preview: resolveCustomizePreviewKind(product),
    priceDisplay:
      typeof product.price_display === "string" && product.price_display.trim()
        ? product.price_display.trim()
        : null,
    checkoutUrl,
    shopifyVariantId,
    printTemplateId:
      typeof product.print_template_id === "string" ? product.print_template_id.trim() : "",
    printVariantId,
    catalogDescription:
      typeof product.catalog_description === "string" ? product.catalog_description.trim() : "",
    variantLabel: variant?.label ?? null,
  };
}

/**
 * Status line under proof consent — includes recovery gate when consent is complete (M13).
 * @param {{
 *   checkoutOpen: boolean;
 *   previewModeCardFallback?: boolean;
 *   consentCheckedIds: Set<string> | Iterable<string>;
 *   storage?: Pick<Window, "sessionStorage" | "localStorage">;
 * }} input
 */
export function customizeMerchCheckoutStatusMessage(input) {
  const { checkoutOpen, previewModeCardFallback = false, consentCheckedIds, storage } =
    input;
  if (previewModeCardFallback) {
    return checkoutOpen
      ? "Showing your card QR while print setup finishes. Confirm limits below to continue."
      : "Showing your card QR. A unique print code is reserved when personalized checkout opens.";
  }
  const consentComplete = isProofConsentComplete(
    PERSONALIZE_MERCH_CONSENT_IDS,
    consentCheckedIds
  );
  const recoveryGate = merchPreCheckoutRecoveryGateState(
    loadRootSessionRecordForMerch(storage ?? globalThis),
    storage ?? globalThis
  );
  if (checkoutOpen && consentComplete && recoveryGate.blocked) {
    return "Proof approved. Save a recovery method below to unlock checkout.";
  }
  return proofConsentStatusMessage("personalized", checkoutOpen, consentCheckedIds);
}
