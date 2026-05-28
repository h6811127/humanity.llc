import { errorResponse, jsonResponse } from "../http/resolver";
import {
  getPublishedStoreRows,
  getStoreCatalogProductCount,
  getStoreProductById,
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
  const product = getStoreProductById(productId);
  if (!product || product.status !== "published") {
    return errorResponse("PRODUCT_NOT_FOUND", "Unknown or unpublished product.", 404);
  }
  return jsonResponse(toStoreProductDetail(product));
}
