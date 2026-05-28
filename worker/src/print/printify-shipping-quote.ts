import type { PrintifyLineItemConfig } from "./printify-template-config";
import type { PrintifyEnv } from "./printify-client";
import { printifyConfigured } from "./printify-client";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export interface QuoteDestination {
  country: string;
  region: string;
  city: string;
  zip: string;
}

export interface ParsedShippingQuoteOption {
  shipping_method_id: number;
  label: string;
  shipping_cost: number;
  currency: string;
}

export interface PrintifyShippingQuoteSuccess {
  ok: true;
  options: ParsedShippingQuoteOption[];
}

export type PrintifyShippingQuoteErrorCode =
  | "PRINTIFY_UNCONFIGURED"
  | "PRINTIFY_QUOTE_DEFERRED"
  | "PRINTIFY_TEMPLATE_UNCONFIGURED"
  | "PRINTIFY_RATE_LIMITED"
  | "PRINTIFY_INVALID_DESTINATION"
  | "PRINTIFY_API_ERROR";

export interface PrintifyShippingQuoteError {
  ok: false;
  code: PrintifyShippingQuoteErrorCode;
  message: string;
  status?: number;
}

function parseShopId(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readCostCents(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.round(raw);
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw.trim());
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return null;
}

function readMethodId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Parse Printify shipping quote response (array or keyed object). */
export function parsePrintifyShippingQuoteOptions(body: unknown): ParsedShippingQuoteOption[] {
  const options: ParsedShippingQuoteOption[] = [];

  const pushOption = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const o = raw as Record<string, unknown>;
    const shipping_method_id = readMethodId(o.id ?? o.shipping_method ?? o.method_id);
    const shipping_cost = readCostCents(o.cost ?? o.rate ?? o.price ?? o.total);
    if (shipping_method_id === null || shipping_cost === null) return;
    const label =
      (typeof o.name === "string" && o.name.trim()) ||
      (typeof o.title === "string" && o.title.trim()) ||
      `Method ${shipping_method_id}`;
    const currency =
      (typeof o.currency === "string" && o.currency.trim().toUpperCase()) || "USD";
    options.push({ shipping_method_id, label, shipping_cost, currency });
  };

  if (Array.isArray(body)) {
    for (const item of body) pushOption(item);
    return options;
  }

  if (body && typeof body === "object") {
    const root = body as Record<string, unknown>;
    if (Array.isArray(root.data)) {
      for (const item of root.data) pushOption(item);
      return options;
    }
    if (Array.isArray(root.shipping)) {
      for (const item of root.shipping) pushOption(item);
      return options;
    }
    for (const value of Object.values(root)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        pushOption(value);
      }
    }
  }

  return options;
}

export function pickShippingQuoteOption(
  options: ParsedShippingQuoteOption[],
  preferredMethodId: number
): ParsedShippingQuoteOption | null {
  if (options.length === 0) return null;
  return (
    options.find((option) => option.shipping_method_id === preferredMethodId) ?? options[0]!
  );
}

export function formatUsdCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** POST Printify orders/shipping.json — pre-checkout estimate (PM-FR-20). */
export async function fetchPrintifyShippingQuote(
  env: PrintifyEnv,
  input: {
    lineItem: PrintifyLineItemConfig;
    quantity: number;
    destination: QuoteDestination;
  },
  fetchImpl: typeof fetch = fetch
): Promise<PrintifyShippingQuoteSuccess | PrintifyShippingQuoteError> {
  if (!printifyConfigured(env)) {
    return {
      ok: false,
      code: "PRINTIFY_UNCONFIGURED",
      message: "Printify credentials are not configured.",
    };
  }

  const shopId = parseShopId(env.PRINTIFY_SHOP_ID);
  if (!shopId) {
    return {
      ok: false,
      code: "PRINTIFY_UNCONFIGURED",
      message: "PRINTIFY_SHOP_ID must be a positive integer.",
    };
  }

  const payload = {
    line_items: [
      {
        product_id: input.lineItem.product_id,
        variant_id: input.lineItem.variant_id,
        quantity: input.quantity,
      },
    ],
    address_to: {
      first_name: "Estimate",
      last_name: "Estimate",
      email: "estimate@humanity.llc",
      phone: "",
      country: input.destination.country,
      region: input.destination.region,
      city: input.destination.city || "Estimate",
      address1: "Shipping estimate",
      address2: "",
      zip: input.destination.zip,
    },
  };

  const res = await fetchImpl(`${PRINTIFY_API_BASE}/shops/${shopId}/orders/shipping.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PRINTIFY_API_TOKEN!.trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (res.status === 429) {
    return {
      ok: false,
      code: "PRINTIFY_RATE_LIMITED",
      message: "Printify rate limit exceeded. Retry later.",
      status: res.status,
    };
  }
  if (res.status === 422 || res.status === 400) {
    return {
      ok: false,
      code: "PRINTIFY_INVALID_DESTINATION",
      message: "Could not calculate shipping for this destination.",
      status: res.status,
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      code: "PRINTIFY_API_ERROR",
      message: text.slice(0, 240) || `Printify API returned ${res.status}.`,
      status: res.status,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: "PRINTIFY_API_ERROR",
      message: "Printify returned a non-JSON success response.",
      status: res.status,
    };
  }

  const options = parsePrintifyShippingQuoteOptions(parsed);
  if (options.length === 0) {
    return {
      ok: false,
      code: "PRINTIFY_API_ERROR",
      message: "Printify returned no shipping options for this destination.",
      status: res.status,
    };
  }

  return { ok: true, options };
}
