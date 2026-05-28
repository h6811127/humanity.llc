import { describe, expect, it, vi } from "vitest";

import { handlePostPrintQuotes } from "../src/print/print-quotes-handler";
import type { Env } from "../src/index";

const ENV = {
  PRINTIFY_API_TOKEN: "test_token",
  PRINTIFY_SHOP_ID: "99",
} as Env;

describe("POST /v1/print/quotes", () => {
  it("returns shipping estimate with expiry", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([{ id: 1, name: "Standard", cost: 499, currency: "USD" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;

    try {
      const res = await handlePostPrintQuotes(
        new Request("https://humanity.llc/v1/print/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: "hoodie_live_object_v1",
            quantity: 1,
            destination: { country: "US", region: "NY", zip: "11221" },
          }),
        }),
        {
          ...ENV,
          PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID: "prod_hoodie",
          PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID: "17887",
          PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD: "1",
        }
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        quote_id: string;
        shipping_cost: number;
        total: number;
        expires_at: string;
        disclaimer: string;
      };
      expect(json.quote_id).toMatch(/^pq_/);
      expect(json.shipping_cost).toBe(499);
      expect(json.total).toBe(499);
      expect(json.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(json.disclaimer).toContain("Shopify checkout");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects unknown template", async () => {
    const res = await handlePostPrintQuotes(
      new Request("https://humanity.llc/v1/print/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: "hc-unknown-template-v9",
          destination: { country: "US" },
        }),
      }),
      ENV
    );
    expect(res.status).toBe(422);
  });

  it("rejects missing destination country", async () => {
    const res = await handlePostPrintQuotes(
      new Request("https://humanity.llc/v1/print/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: "hc-sticker-square-v1",
          destination: { zip: "11221" },
        }),
      }),
      ENV
    );
    expect(res.status).toBe(422);
  });
});
