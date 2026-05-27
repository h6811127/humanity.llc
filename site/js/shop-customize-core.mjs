/**
 * QR customizer — pure helpers (artifact intent checkout URLs, session detection).
 * See docs/MERCH_FUNNEL_MVP.md.
 */

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
 * Card session from hc_created, else first wallet entry with keys.
 * @returns {{ profile_id: string, qr_id: string, handle: string | null, scan_url: string | null } | null}
 */
export function loadCardSessionForCustomize(storage = globalThis) {
  const sessionStorage = storage.sessionStorage;
  const localStorage = storage.localStorage;
  if (sessionStorage) {
    try {
      const raw = sessionStorage.getItem("hc_created");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (hasSigningKeys(parsed)) {
          const normalized = normalizeCardSession(parsed);
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
          const normalized = normalizeCardSession(entry);
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
  for (const attr of lineAttributes) {
    if (!attr?.key || attr.value == null || attr.value === "") continue;
    url.searchParams.set(`properties[${attr.key}]`, String(attr.value));
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
 * @param {Record<string, unknown>} product
 */
export function personalizeProductDisplay(product) {
  return {
    productId: String(product.product_id),
    title: typeof product.title === "string" ? product.title : "Personalized item",
    preview:
      product.preview === "sticker" || product.preview === "hoodie"
        ? product.preview
        : "hoodie",
    priceDisplay:
      typeof product.price_display === "string" && product.price_display.trim()
        ? product.price_display.trim()
        : null,
    checkoutUrl:
      typeof product.checkout_url === "string" ? product.checkout_url.trim() : "",
    shopifyVariantId:
      typeof product.shopify_variant_id === "string"
        ? product.shopify_variant_id.trim()
        : "",
    printTemplateId:
      typeof product.print_template_id === "string" ? product.print_template_id.trim() : "",
    printVariantId:
      typeof product.print_variant_id === "string" ? product.print_variant_id.trim() : "",
    catalogDescription:
      typeof product.catalog_description === "string" ? product.catalog_description.trim() : "",
  };
}
