import { resolvePrintifyShippingForSubmit } from "../commerce/resolve-printify-shipping";
import type { PrintifyShippingSource } from "../commerce/resolve-printify-shipping";
import { getCommerceOrderById } from "../db/commerce-orders";
import { updatePrintOrderStatus, type PrintOrderRow } from "../db/print-orders";
import type { Env } from "../env";
import {
  findPrintifyOrderByExternalId,
  submitPrintifyOrder,
} from "./printify-client";

export interface SubmitPrintOrderOptions {
  shipping_address?: unknown;
  quantity?: unknown;
}

export type SubmitPrintOrderResult =
  | {
      ok: true;
      printOrder: PrintOrderRow;
      shippingSource?: PrintifyShippingSource;
      skipped?: boolean;
      recovered?: boolean;
    }
  | { ok: false; code: string; message: string; httpStatus: number };

function submitHttpStatus(code: string): number {
  if (code === "PRINTIFY_RATE_LIMITED") return 429;
  if (
    code === "PRINTIFY_INVALID_ADDRESS" ||
    code === "PRINTIFY_TEMPLATE_UNCONFIGURED" ||
    code === "PRINTIFY_ARTWORK_UNCONFIGURED" ||
    code === "PRINTIFY_ARTWORK_GENERATION_FAILED" ||
    code === "PRINTIFY_PLANNED_QRS_REQUIRED" ||
    code === "PRINTIFY_UPLOAD_FAILED" ||
    code === "PRINTIFY_PRODUCT_CREATE_FAILED"
  ) {
    return 422;
  }
  if (code === "PRINTIFY_SUBMIT_DEFERRED" || code === "PRINTIFY_UNCONFIGURED") {
    return 503;
  }
  return 502;
}

function asSubmittedPrintOrder(
  printOrder: PrintOrderRow,
  nowIso: string,
  printifyOrderId: string,
  printifyShopId: number
): PrintOrderRow {
  return {
    ...printOrder,
    status: "submitted",
    printify_order_id: printifyOrderId,
    printify_shop_id: printifyShopId,
    updated_at: nowIso,
  };
}

async function persistSubmittedPrintOrder(
  db: D1Database,
  printOrder: PrintOrderRow,
  nowIso: string,
  printifyOrderId: string,
  printifyShopId: number
): Promise<PrintOrderRow> {
  await updatePrintOrderStatus(
    db,
    printOrder.order_id,
    "submitted",
    nowIso,
    printifyOrderId,
    printifyShopId
  );
  return asSubmittedPrintOrder(printOrder, nowIso, printifyOrderId, printifyShopId);
}

/** Operator-gated Printify HTTP submit for a queued print order. */
export async function submitPrintOrderToPrintify(
  request: Request,
  env: Env,
  db: D1Database,
  printOrder: PrintOrderRow,
  options: SubmitPrintOrderOptions
): Promise<SubmitPrintOrderResult> {
  if (printOrder.status !== "awaiting_production_approval") {
    return { ok: true, printOrder, skipped: true };
  }

  const commerceOrderId = printOrder.commerce_order_id?.trim() ?? "";
  if (!commerceOrderId.startsWith("co_")) {
    return {
      ok: false,
      code: "COMMERCE_ORDER_NOT_FOUND",
      message: "Print order is missing a valid commerce_order_id.",
      httpStatus: 422,
    };
  }

  const commerceOrder = await getCommerceOrderById(db, commerceOrderId);
  if (!commerceOrder) {
    return {
      ok: false,
      code: "COMMERCE_ORDER_NOT_FOUND",
      message: "Commerce order not found.",
      httpStatus: 404,
    };
  }

  const nowIso = new Date().toISOString();

  // Partial persist / operator repair: factory id already linked while still awaiting.
  const existingPrintifyId = printOrder.printify_order_id?.trim() ?? "";
  const existingShopId = printOrder.printify_shop_id;
  if (
    existingPrintifyId &&
    !existingPrintifyId.startsWith("pending:") &&
    typeof existingShopId === "number" &&
    Number.isFinite(existingShopId) &&
    existingShopId > 0
  ) {
    const submitted = await persistSubmittedPrintOrder(
      db,
      printOrder,
      nowIso,
      existingPrintifyId,
      existingShopId
    );
    return { ok: true, printOrder: submitted, recovered: true };
  }

  // PM-FR-25: if a prior POST succeeded but D1 never reached "submitted", adopt that
  // factory order by external_id instead of creating a billable duplicate.
  const recovered = await findPrintifyOrderByExternalId(env, printOrder.order_id);
  if (recovered.ok) {
    const submitted = await persistSubmittedPrintOrder(
      db,
      printOrder,
      nowIso,
      recovered.printify_order_id,
      recovered.printify_shop_id
    );
    return { ok: true, printOrder: submitted, recovered: true };
  }

  const resolvedShipping = await resolvePrintifyShippingForSubmit(
    env,
    db,
    commerceOrderId,
    options.shipping_address
  );
  if (!resolvedShipping) {
    return {
      ok: false,
      code: "PRINTIFY_SHIPPING_REQUIRED",
      message:
        "submit_to_printify requires shipping_address in the request body, or encrypted shipping captured from the Shopify paid webhook (set FULFILLMENT_PII_ENCRYPTION_KEY).",
      httpStatus: 422,
    };
  }

  let quantity = JSON.parse(printOrder.planned_item_qr_ids_json).length;
  if (quantity < 1) quantity = 1;
  if (options.quantity !== undefined && options.quantity !== null) {
    if (
      typeof options.quantity !== "number" ||
      !Number.isInteger(options.quantity) ||
      options.quantity < 1
    ) {
      return {
        ok: false,
        code: "INVALID_QUANTITY",
        message: "quantity must be a positive integer.",
        httpStatus: 422,
      };
    }
    quantity = options.quantity;
  }

  const submit = await submitPrintifyOrder(env, {
    print_order_id: printOrder.order_id,
    template_id: printOrder.template_id,
    profile_id: printOrder.profile_id,
    planned_item_qr_ids: JSON.parse(printOrder.planned_item_qr_ids_json) as string[],
    shipping_address: resolvedShipping.address,
    quantity,
    print_variant_id: printOrder.print_variant_id,
    print_frame_background: printOrder.print_frame_background,
  });

  if (!submit.ok) {
    return {
      ok: false,
      code: submit.code,
      message: submit.message,
      httpStatus: submitHttpStatus(submit.code),
    };
  }

  const submitted = await persistSubmittedPrintOrder(
    db,
    printOrder,
    nowIso,
    submit.printify_order_id,
    submit.printify_shop_id
  );

  return {
    ok: true,
    printOrder: submitted,
    shippingSource: resolvedShipping.source,
  };
}
