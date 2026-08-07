/**
 * Printify API client (O-002). Live submit when PRINTIFY_SUBMIT_ENABLED=1.
 * Does not call send_to_production — operator approval gate remains on Printify side.
 */

import type { BuyerPrintFrameBackground } from "./print-frame-background";
import { resolvePrintifyLineItem } from "./printify-template-config";
import { preparePrintifyLineItems } from "./printify-line-items";
import type { PrintifyShippingAddress } from "./printify-shipping";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export interface PrintifySubmitInput {
  print_order_id: string;
  template_id: string;
  profile_id: string;
  planned_item_qr_ids: string[];
  shipping_address: PrintifyShippingAddress;
  quantity: number;
  print_variant_id?: string | null;
  print_frame_background?: BuyerPrintFrameBackground | null;
}

export interface PrintifySubmitResult {
  ok: true;
  printify_order_id: string;
  printify_shop_id: number;
}

export type PrintifySubmitErrorCode =
  | "PRINTIFY_UNCONFIGURED"
  | "PRINTIFY_SUBMIT_DEFERRED"
  | "PRINTIFY_TEMPLATE_UNCONFIGURED"
  | "PRINTIFY_ARTWORK_GENERATION_FAILED"
  | "PRINTIFY_UPLOAD_FAILED"
  | "PRINTIFY_PRODUCT_CREATE_FAILED"
  | "PRINTIFY_PLANNED_QRS_REQUIRED"
  | "PRINTIFY_API_ERROR"
  | "PRINTIFY_RATE_LIMITED"
  | "PRINTIFY_INVALID_ADDRESS";

export interface PrintifySubmitError {
  ok: false;
  code: PrintifySubmitErrorCode;
  message: string;
  status?: number;
}

export interface PrintifyEnv {
  PRINTIFY_API_TOKEN?: string;
  PRINTIFY_SHOP_ID?: string;
  PRINTIFY_SUBMIT_ENABLED?: string;
  TIER0_PRINTIFY_PRODUCT_ID?: string;
  TIER0_PRINTIFY_VARIANT_ID?: string;
  TIER0_PRINTIFY_SHIPPING_METHOD?: string;
  PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD?: string;
  PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD?: string;
}

export function printifyConfigured(env: PrintifyEnv): boolean {
  return Boolean(env.PRINTIFY_API_TOKEN?.trim() && env.PRINTIFY_SHOP_ID?.trim());
}

export function printifySubmitEnabled(env: PrintifyEnv): boolean {
  const flag = env.PRINTIFY_SUBMIT_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function parseShopId(raw: string): number | null {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapHttpError(status: number, body: string): PrintifySubmitError {
  if (status === 429) {
    return {
      ok: false,
      code: "PRINTIFY_RATE_LIMITED",
      message: "Printify rate limit exceeded. Retry later.",
      status,
    };
  }
  if (status === 422 || status === 400) {
    return {
      ok: false,
      code: "PRINTIFY_INVALID_ADDRESS",
      message: "Printify rejected the order payload (address or line item).",
      status,
    };
  }
  return {
    ok: false,
    code: "PRINTIFY_API_ERROR",
    message: body.slice(0, 240) || `Printify API returned ${status}.`,
    status,
  };
}

export async function submitPrintifyOrder(
  env: PrintifyEnv,
  input: PrintifySubmitInput,
  fetchImpl: typeof fetch = fetch
): Promise<PrintifySubmitResult | PrintifySubmitError> {
  if (!printifyConfigured(env)) {
    return {
      ok: false,
      code: "PRINTIFY_UNCONFIGURED",
      message: "Printify credentials are not configured.",
    };
  }

  if (!printifySubmitEnabled(env)) {
    return {
      ok: false,
      code: "PRINTIFY_SUBMIT_DEFERRED",
      message: "Printify HTTP submit is disabled; set PRINTIFY_SUBMIT_ENABLED=1.",
    };
  }

  const shopId = parseShopId(env.PRINTIFY_SHOP_ID!);
  if (!shopId) {
    return {
      ok: false,
      code: "PRINTIFY_UNCONFIGURED",
      message: "PRINTIFY_SHOP_ID must be a positive integer.",
    };
  }

  const staticLineItem = resolvePrintifyLineItem(env, input.template_id);
  const prepared = await preparePrintifyLineItems(
    env,
    {
      print_order_id: input.print_order_id,
      template_id: input.template_id,
      profile_id: input.profile_id,
      planned_item_qr_ids: input.planned_item_qr_ids,
      quantity: input.quantity,
      print_variant_id: input.print_variant_id,
      print_frame_background: input.print_frame_background,
    },
    shopId,
    fetchImpl
  );
  if (!prepared.ok && prepared.code === "PRINTIFY_ARTWORK_UNCONFIGURED" && !staticLineItem) {
    return {
      ok: false,
      code: "PRINTIFY_TEMPLATE_UNCONFIGURED",
      message: `No Printify product mapping configured for template ${input.template_id}.`,
    };
  }
  if (!prepared.ok) {
    return {
      ok: false,
      code: prepared.code,
      message: prepared.message,
      status: prepared.status,
    };
  }

  const payload = {
    external_id: input.print_order_id,
    line_items: prepared.line_items.map(({ product_id, variant_id, quantity }) => ({
      product_id,
      variant_id,
      quantity,
    })),
    shipping_method: staticLineItem?.shipping_method ?? 1,
    send_shipping_notification: false,
    address_to: input.shipping_address,
  };

  const res = await fetchImpl(`${PRINTIFY_API_BASE}/shops/${shopId}/orders.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PRINTIFY_API_TOKEN!.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    return mapHttpError(res.status, text);
  }

  let parsed: { id?: string };
  try {
    parsed = JSON.parse(text) as { id?: string };
  } catch {
    return {
      ok: false,
      code: "PRINTIFY_API_ERROR",
      message: "Printify returned a non-JSON success response.",
      status: res.status,
    };
  }

  const printifyOrderId = typeof parsed.id === "string" ? parsed.id.trim() : "";
  if (!printifyOrderId) {
    return {
      ok: false,
      code: "PRINTIFY_API_ERROR",
      message: "Printify response missing order id.",
      status: res.status,
    };
  }

  return {
    ok: true,
    printify_order_id: printifyOrderId,
    printify_shop_id: shopId,
  };
}

export interface PrintifyOrderFetchResult {
  ok: true;
  body: Record<string, unknown>;
}

export interface PrintifyOrderFetchError {
  ok: false;
  status?: number;
}

/** GET Printify order — reconciliation poll (PM-FR-33). */
export async function fetchPrintifyOrder(
  env: PrintifyEnv,
  shopId: number,
  printifyOrderId: string,
  fetchImpl: typeof fetch = fetch
): Promise<PrintifyOrderFetchResult | PrintifyOrderFetchError> {
  if (!printifyConfigured(env)) {
    return { ok: false };
  }

  const res = await fetchImpl(
    `${PRINTIFY_API_BASE}/shops/${shopId}/orders/${printifyOrderId}.json`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PRINTIFY_API_TOKEN!.trim()}`,
        Accept: "application/json",
      },
    }
  );

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, body };
  } catch {
    return { ok: false, status: res.status };
  }
}

export interface PrintifyExternalIdMatch {
  ok: true;
  printify_order_id: string;
  printify_shop_id: number;
  status: string;
}

/** How many list pages to scan when recovering a submit by external_id (PM-FR-25). */
const EXTERNAL_ID_RECOVERY_MAX_PAGES = 5;
const EXTERNAL_ID_RECOVERY_PAGE_LIMIT = 50;

function printifyStatusIsCanceled(status: unknown): boolean {
  if (typeof status !== "string") return false;
  const normalized = status.trim().toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}

function orderMatchesExternalId(order: Record<string, unknown>, externalId: string): boolean {
  if (typeof order.external_id === "string" && order.external_id.trim() === externalId) {
    return true;
  }
  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : null;
  if (!metadata) return false;
  for (const key of ["shop_order_id", "shop_order_label"] as const) {
    const raw = metadata[key];
    if (raw === externalId) return true;
    if (typeof raw === "string" && raw.trim() === externalId) return true;
  }
  return false;
}

/**
 * Find an existing Printify factory order created with external_id === print_order_id.
 * Used to make submit retry-safe after POST-success / D1-persist failure (PM-FR-25).
 * Printify list has no external_id filter — scan recent pages newest-first.
 */
export async function findPrintifyOrderByExternalId(
  env: PrintifyEnv,
  externalId: string,
  fetchImpl: typeof fetch = fetch
): Promise<PrintifyExternalIdMatch | { ok: false }> {
  const id = externalId.trim();
  if (!id || !printifyConfigured(env)) {
    return { ok: false };
  }

  const shopId = parseShopId(env.PRINTIFY_SHOP_ID!);
  if (!shopId) {
    return { ok: false };
  }

  const authHeaders = {
    Authorization: `Bearer ${env.PRINTIFY_API_TOKEN!.trim()}`,
    Accept: "application/json",
  };

  let best: PrintifyExternalIdMatch | null = null;
  let bestCreatedAt = "";

  for (let page = 1; page <= EXTERNAL_ID_RECOVERY_MAX_PAGES; page += 1) {
    const url =
      `${PRINTIFY_API_BASE}/shops/${shopId}/orders.json` +
      `?page=${page}&limit=${EXTERNAL_ID_RECOVERY_PAGE_LIMIT}`;
    const res = await fetchImpl(url, { method: "GET", headers: authHeaders });
    const text = await res.text();
    if (!res.ok) {
      return best ?? { ok: false };
    }

    let parsed: { data?: unknown; last_page?: unknown };
    try {
      parsed = JSON.parse(text) as { data?: unknown; last_page?: unknown };
    } catch {
      return best ?? { ok: false };
    }

    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const order = row as Record<string, unknown>;
      if (!orderMatchesExternalId(order, id)) continue;
      if (printifyStatusIsCanceled(order.status)) continue;
      const printifyOrderId = typeof order.id === "string" ? order.id.trim() : "";
      if (!printifyOrderId) continue;
      const createdAt = typeof order.created_at === "string" ? order.created_at : "";
      // Prefer the oldest match so retries keep the first factory order.
      if (!best || (createdAt && (!bestCreatedAt || createdAt < bestCreatedAt))) {
        best = {
          ok: true,
          printify_order_id: printifyOrderId,
          printify_shop_id: shopId,
          status: typeof order.status === "string" ? order.status : "",
        };
        bestCreatedAt = createdAt;
      }
    }

    const lastPage =
      typeof parsed.last_page === "number" && Number.isFinite(parsed.last_page)
        ? parsed.last_page
        : page;
    if (page >= lastPage || rows.length === 0) {
      break;
    }
  }

  return best ?? { ok: false };
}
