import { generatePrintQuoteId } from "../id";
import type { Env } from "../index";
import { errorResponse, jsonResponse } from "../http/resolver";
import {
  getPrintCatalogProduct,
  resolvePrintTemplateIdForProduct,
} from "./print-catalog";
import {
  fetchPrintifyShippingQuote,
  formatUsdCents,
  pickShippingQuoteOption,
  type QuoteDestination,
} from "./printify-shipping-quote";
import { resolvePrintifyLineItem } from "./printify-template-config";

const QUOTE_TTL_MS = 15 * 60 * 1000;

interface PrintQuoteRequest {
  template_id?: unknown;
  product_id?: unknown;
  artifact_id?: unknown;
  quantity?: unknown;
  shipping_method?: unknown;
  destination?: unknown;
}

function readString(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function parseDestination(raw: unknown): QuoteDestination | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const country = readString(o.country, 2);
  if (!country) return null;
  return {
    country: country.toUpperCase(),
    region: readString(o.region, 80) ?? "",
    city: readString(o.city, 120) ?? "",
    zip: readString(o.zip, 32) ?? "",
  };
}

function resolveTemplateId(body: PrintQuoteRequest): string | null {
  const templateId = readString(body.template_id, 80);
  if (templateId) {
    return getPrintCatalogProduct(templateId) ? templateId : null;
  }
  const productId = readString(body.product_id, 80);
  if (productId) {
    const template = resolvePrintTemplateIdForProduct(productId);
    return getPrintCatalogProduct(template) ? template : null;
  }
  return null;
}

function parseQuantity(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 1;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > 99) return null;
  return raw;
}

/** POST /v1/print/quotes — pre-checkout fulfillment estimate (PM-FR-20). */
export async function handlePostPrintQuotes(
  request: Request,
  env: Env
): Promise<Response> {
  let body: PrintQuoteRequest;
  try {
    body = (await request.json()) as PrintQuoteRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const templateId = resolveTemplateId(body);
  if (!templateId) {
    return errorResponse(
      "UNKNOWN_TEMPLATE",
      "template_id or product_id must reference an approved print template.",
      422
    );
  }

  const quantity = parseQuantity(body.quantity);
  if (quantity === null) {
    return errorResponse("INVALID_QUANTITY", "quantity must be an integer from 1 to 99.", 422);
  }

  const destination = parseDestination(body.destination);
  if (!destination) {
    return errorResponse(
      "INVALID_DESTINATION",
      "destination.country is required (ISO country code).",
      422
    );
  }

  const lineItem = resolvePrintifyLineItem(env, templateId);
  if (!lineItem) {
    return errorResponse(
      "PRINTIFY_TEMPLATE_UNCONFIGURED",
      `No Printify product mapping configured for template ${templateId}.`,
      422
    );
  }

  const quote = await fetchPrintifyShippingQuote(env, { lineItem, quantity, destination });
  if (!quote.ok) {
    const status =
      quote.code === "PRINTIFY_RATE_LIMITED"
        ? 429
        : quote.code === "PRINTIFY_INVALID_DESTINATION" ||
            quote.code === "PRINTIFY_TEMPLATE_UNCONFIGURED"
          ? 422
          : quote.code === "PRINTIFY_UNCONFIGURED"
            ? 503
            : 502;
    return errorResponse(quote.code, quote.message, status);
  }

  const selected = pickShippingQuoteOption(quote.options, lineItem.shipping_method);
  if (!selected) {
    return errorResponse(
      "PRINTIFY_QUOTE_EMPTY",
      "Printify returned no shipping options for this destination.",
      502
    );
  }

  const now = Date.now();
  const expiresAt = new Date(now + QUOTE_TTL_MS).toISOString();
  const artifactId = readString(body.artifact_id, 80);

  return jsonResponse({
    quote_id: generatePrintQuoteId(),
    template_id: templateId,
    artifact_id: artifactId,
    quantity,
    currency: selected.currency,
    fulfillment_cost: null,
    shipping_cost: selected.shipping_cost,
    platform_fee: 0,
    estimated_tax: null,
    total: selected.shipping_cost,
    shipping_method: readString(body.shipping_method, 40) ?? "standard",
    shipping_method_id: selected.shipping_method_id,
    shipping_label: selected.label,
    shipping_display: formatUsdCents(selected.shipping_cost),
    expires_at: expiresAt,
    disclaimer:
      "Product price is set at Shopify checkout. This estimate covers Printify shipping only.",
  });
}
