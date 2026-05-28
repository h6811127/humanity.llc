/**
 * Generate + upload per-item QR artwork and resolve Printify line items for submit.
 */

import { renderPrintStickerFromScanUrl } from "../resolver/scan-qr";
import { buildPlannedItemScanUrl } from "./print-scan-url";
import {
  resolvePrintifyArtworkConfig,
  templateRequiresArtworkUpload,
  type PrintifyArtworkConfig,
} from "./printify-artwork-config";
import type { PrintifyEnv } from "./printify-client";
import {
  createPrintifyEphemeralProduct,
  uploadPrintifyArtworkSvg,
} from "./printify-upload";
import { resolvePrintifyLineItem } from "./printify-template-config";

export interface PreparedPrintifyLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
  upload_id?: string;
}

export type PreparePrintifyLineItemsErrorCode =
  | "PRINTIFY_ARTWORK_UNCONFIGURED"
  | "PRINTIFY_ARTWORK_GENERATION_FAILED"
  | "PRINTIFY_UPLOAD_FAILED"
  | "PRINTIFY_PRODUCT_CREATE_FAILED"
  | "PRINTIFY_PLANNED_QRS_REQUIRED";

export interface PreparePrintifyLineItemsError {
  ok: false;
  code: PreparePrintifyLineItemsErrorCode;
  message: string;
  status?: number;
}

export interface PreparePrintifyLineItemsResult {
  ok: true;
  line_items: PreparedPrintifyLineItem[];
}

export async function preparePrintifyLineItems(
  env: PrintifyEnv,
  input: {
    print_order_id: string;
    template_id: string;
    profile_id: string;
    planned_item_qr_ids: string[];
    quantity: number;
    scan_origin?: string;
  },
  shopId: number,
  fetchImpl: typeof fetch = fetch
): Promise<PreparePrintifyLineItemsResult | PreparePrintifyLineItemsError> {
  if (!templateRequiresArtworkUpload(input.template_id)) {
    const lineItem = resolvePrintifyLineItem(env, input.template_id);
    if (!lineItem) {
      return {
        ok: false,
        code: "PRINTIFY_ARTWORK_UNCONFIGURED",
        message: `No Printify product mapping configured for template ${input.template_id}.`,
      };
    }
    return {
      ok: true,
      line_items: [
        {
          product_id: lineItem.product_id,
          variant_id: lineItem.variant_id,
          quantity: input.quantity,
        },
      ],
    };
  }

  const artworkConfig = resolvePrintifyArtworkConfig(env, input.template_id);
  if (!artworkConfig) {
    return {
      ok: false,
      code: "PRINTIFY_ARTWORK_UNCONFIGURED",
      message:
        "Tier 1 Printify submit requires blueprint + print provider env (PERSONALIZE_*_PRINTIFY_BLUEPRINT_ID, PERSONALIZE_*_PRINTIFY_PRINT_PROVIDER_ID).",
    };
  }

  const qrIds = input.planned_item_qr_ids.filter((id) => typeof id === "string" && id.trim());
  if (qrIds.length === 0) {
    return {
      ok: false,
      code: "PRINTIFY_PLANNED_QRS_REQUIRED",
      message: "Tier 1 Printify submit requires at least one planned_item_qr_id.",
    };
  }

  if (input.quantity !== qrIds.length) {
    return {
      ok: false,
      code: "PRINTIFY_PLANNED_QRS_REQUIRED",
      message: `quantity (${input.quantity}) must match planned_item_qr_ids (${qrIds.length}) for personalized fulfillment.`,
    };
  }

  const scanOrigin = input.scan_origin?.trim() || "https://humanity.llc";
  const lineItems: PreparedPrintifyLineItem[] = [];

  for (let index = 0; index < qrIds.length; index++) {
    const qrId = qrIds[index]!.trim();
    let svg: string;
    try {
      const scanUrl = buildPlannedItemScanUrl(input.profile_id, qrId, scanOrigin);
      svg = await renderPrintStickerFromScanUrl(scanUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Artwork generation failed.";
      return {
        ok: false,
        code: "PRINTIFY_ARTWORK_GENERATION_FAILED",
        message: `Failed to render artwork for ${qrId}: ${msg}`,
      };
    }

    const upload = await uploadPrintifyArtworkSvg(
      env,
      {
        file_name: `${input.print_order_id}-${qrId}.svg`,
        svg,
      },
      fetchImpl
    );
    if (!upload.ok) {
      return {
        ok: false,
        code: "PRINTIFY_UPLOAD_FAILED",
        message: upload.message,
        status: upload.status,
      };
    }

    const product = await createPrintifyEphemeralProduct(
      env,
      shopId,
      {
        title: `Humanity ${input.print_order_id} · ${qrId}`,
        artwork: artworkConfig,
        upload_id: upload.upload_id,
      },
      fetchImpl
    );
    if (!product.ok) {
      return {
        ok: false,
        code: "PRINTIFY_PRODUCT_CREATE_FAILED",
        message: product.message,
        status: product.status,
      };
    }

    lineItems.push({
      product_id: product.product_id,
      variant_id: artworkConfig.variant_id,
      quantity: 1,
      upload_id: upload.upload_id,
    });
  }

  return { ok: true, line_items: lineItems };
}

export type { PrintifyArtworkConfig };
