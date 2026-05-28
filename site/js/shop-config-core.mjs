/**
 * Shop config validation — operator readiness for Tier 1 personalize checkout.
 * @see docs/MERCH_FUNNEL_MVP.md
 */
import { personalizeProducts } from "./shop-customize-core.mjs";

/**
 * @param {Record<string, unknown>} product
 * @param {number} index
 * @returns {string[]}
 */
export function personalizeProductIssues(product, index) {
  const issues = [];
  const label =
    typeof product?.product_id === "string" && product.product_id.trim()
      ? String(product.product_id)
      : `products[${index}]`;

  const checkoutUrl =
    typeof product?.checkout_url === "string" ? product.checkout_url.trim() : "";
  if (!checkoutUrl) {
    issues.push(`${label}: missing checkout_url (Shopify cart permalink)`);
  } else {
    try {
      const parsed = new URL(checkoutUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        issues.push(`${label}: checkout_url must be http(s)`);
      } else if (!/^\/cart\/\d+:\d+$/.test(parsed.pathname)) {
        issues.push(
          `${label}: checkout_url should look like https://STORE.myshopify.com/cart/VARIANT_ID:1`
        );
      }
    } catch {
      issues.push(`${label}: invalid checkout_url`);
    }
  }

  const variantId =
    typeof product?.shopify_variant_id === "string" ? product.shopify_variant_id.trim() : "";
  if (!variantId) {
    issues.push(`${label}: missing shopify_variant_id`);
  }

  return issues;
}

/**
 * @param {Record<string, unknown>} config
 * @returns {{ ready: boolean, issues: string[] }}
 */
export function personalizeCatalogReadiness(config) {
  const issues = [];

  if (config?.personalize?.checkout_open !== true) {
    issues.push("personalize.checkout_open is not true");
  }

  const products = personalizeProducts(config);
  if (products.length === 0) {
    issues.push("personalize.products has no valid product_id entries");
  }

  for (let i = 0; i < products.length; i++) {
    issues.push(...personalizeProductIssues(products[i], i));
  }

  return { ready: issues.length === 0, issues };
}
