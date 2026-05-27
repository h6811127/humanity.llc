/**
 * Printify API client (O-002). Live submit when PRINTIFY_SUBMIT_ENABLED=1.
 * Does not call send_to_production — operator approval gate remains on Printify side.
 */

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
  scan_origin?: string;
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
  | "PRINTIFY_ARTWORK_UNCONFIGURED"
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
  PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_PLACEHOLDER?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_X?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_Y?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_SCALE?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_ANGLE?: string;
  PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_PLACEHOLDER?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_X?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_Y?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_SCALE?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_ANGLE?: string;
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

  const lineItem = resolvePrintifyLineItem(env, input.template_id);
  if (!lineItem) {
    return {
      ok: false,
      code: "PRINTIFY_TEMPLATE_UNCONFIGURED",
      message: `No Printify product mapping configured for template ${input.template_id}.`,
    };
  }

  const prepared = await preparePrintifyLineItems(
    env,
    {
      print_order_id: input.print_order_id,
      template_id: input.template_id,
      profile_id: input.profile_id,
      planned_item_qr_ids: input.planned_item_qr_ids,
      quantity: input.quantity,
      scan_origin: input.scan_origin,
    },
    shopId,
    fetchImpl
  );

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
    line_items: prepared.line_items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    })),
    shipping_method: lineItem.shipping_method,
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
