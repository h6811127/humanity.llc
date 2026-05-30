import { errorResponse, jsonResponse } from "../http/resolver";
import {
  getLegacyStoreProductRedirect,
  getPublishedStoreRows,
  getStoreCatalogProductCount,
  getStoreProductById,
  storeProductActionPath,
  toStoreProductDetail,
} from "./store-catalog";

/** GET /v1/store/rows — ordered published story rows (SF-001). */
export async function handleGetStoreRows(): Promise<Response> {
  return jsonResponse({
    version: 1,
    catalog_product_count: getStoreCatalogProductCount(),
    rows: getPublishedStoreRows(),
  });
}

/** GET /v1/store/products/{product_id} — Humanity product + personalization policy. */
export async function handleGetStoreProduct(productId: string): Promise<Response> {
  const legacyTargetId = getLegacyStoreProductRedirect(productId);
  if (legacyTargetId) {
    const target = getStoreProductById(legacyTargetId);
    if (target && target.status === "published") {
      return jsonResponse({
        redirect: true,
        legacy_product_id: productId.trim(),
        ...toStoreProductDetail(target),
        redirect_to: storeProductActionPath(target),
      });
    }
  }

  const product = getStoreProductById(productId);
  if (!product || product.status !== "published") {
    return errorResponse("PRODUCT_NOT_FOUND", "Unknown or unpublished product.", 404);
  }
  return jsonResponse(toStoreProductDetail(product));
}
