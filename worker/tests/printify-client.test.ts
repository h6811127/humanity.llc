import { describe, expect, it, vi } from "vitest";

import { parsePrintifyShippingAddress } from "../src/print/printify-shipping";
import { resolvePrintifyLineItem } from "../src/print/printify-template-config";
import {
  printifySubmitEnabled,
  submitPrintifyOrder,
} from "../src/print/printify-client";
import {
  DEFAULT_PRINT_TEMPLATE_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";

const ADDRESS = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  phone: "+15555550123",
  country: "US",
  region: "NY",
  address1: "123 Example St",
  address2: "",
  city: "Brooklyn",
  zip: "11221",
};

describe("printify-shipping", () => {
  it("parses valid address_to", () => {
    expect(parsePrintifyShippingAddress(ADDRESS)).toEqual(ADDRESS);
  });

  it("rejects incomplete address", () => {
    expect(parsePrintifyShippingAddress({ first_name: "Ada" })).toBeNull();
  });
});

describe("printify-template-config", () => {
  it("resolves tier0 mapping from env", () => {
    const cfg = resolvePrintifyLineItem(
      {
        TIER0_PRINTIFY_PRODUCT_ID: "prod_abc",
        TIER0_PRINTIFY_VARIANT_ID: "17887",
        TIER0_PRINTIFY_SHIPPING_METHOD: "2",
      },
      TIER0_BATCH_PRINT_TEMPLATE_ID
    );
    expect(cfg).toEqual({
      product_id: "prod_abc",
      variant_id: 17887,
      shipping_method: 2,
    });
  });

  it("resolves Tier 1 hoodie and sticker mappings from env", () => {
    expect(
      resolvePrintifyLineItem(
        {
          PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID: "hoodie_prod",
          PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID: "42",
        },
        HOODIE_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      product_id: "hoodie_prod",
      variant_id: 42,
      shipping_method: 1,
    });

    expect(
      resolvePrintifyLineItem(
        {
          PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID: "sticker_prod",
          PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID: "99",
          PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD: "3",
        },
        DEFAULT_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      product_id: "sticker_prod",
      variant_id: 99,
      shipping_method: 3,
    });
  });
});

describe("submitPrintifyOrder", () => {
  it("returns deferred when submit flag is off", async () => {
    const result = await submitPrintifyOrder(
      {
        PRINTIFY_API_TOKEN: "token",
        PRINTIFY_SHOP_ID: "99",
        PRINTIFY_SUBMIT_ENABLED: "0",
        TIER0_PRINTIFY_PRODUCT_ID: "prod",
        TIER0_PRINTIFY_VARIANT_ID: "1",
      },
      {
        print_order_id: "po_test123456789012345",
        template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
        profile_id: "nSVXWPqgRFEhGPjxyRzidF6s",
        planned_item_qr_ids: [],
        shipping_address: ADDRESS,
        quantity: 1,
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("PRINTIFY_SUBMIT_DEFERRED");
  });

  it("posts Tier 0 order when enabled (no artwork upload)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "5a96f649b2439217d070f507" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await submitPrintifyOrder(
      {
        PRINTIFY_API_TOKEN: "token",
        PRINTIFY_SHOP_ID: "99",
        PRINTIFY_SUBMIT_ENABLED: "1",
        TIER0_PRINTIFY_PRODUCT_ID: "prod_abc",
        TIER0_PRINTIFY_VARIANT_ID: "17887",
      },
      {
        print_order_id: "po_test123456789012345",
        template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
        profile_id: "nSVXWPqgRFEhGPjxyRzidF6s",
        planned_item_qr_ids: [],
        shipping_address: ADDRESS,
        quantity: 2,
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.printify_order_id).toBe("5a96f649b2439217d070f507");
      expect(result.printify_shop_id).toBe(99);
    }

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.printify.com/v1/shops/99/orders.json");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body.external_id).toBe("po_test123456789012345");
    expect(body.line_items[0].quantity).toBe(2);
    expect(body.address_to.email).toBe("ada@example.com");
  });

  it("uploads artwork and posts Tier 1 order with ephemeral product line item", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/uploads/images.json")) {
        return new Response(JSON.stringify({ id: "upload_xyz" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify({ id: "prod_personalized" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/orders.json")) {
        return new Response(JSON.stringify({ id: "order_personalized" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("unexpected", { status: 500 });
    });

    const result = await submitPrintifyOrder(
      {
        PRINTIFY_API_TOKEN: "token",
        PRINTIFY_SHOP_ID: "99",
        PRINTIFY_SUBMIT_ENABLED: "1",
        PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID: "prod_static",
        PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID: "17887",
        PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID: "384",
        PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID: "1",
      },
      {
        print_order_id: "po_test123456789012345",
        template_id: DEFAULT_PRINT_TEMPLATE_ID,
        profile_id: "nSVXWPqgRFEhGPjxyRzidF6s",
        planned_item_qr_ids: ["qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5"],
        shipping_address: ADDRESS,
        quantity: 1,
      },
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.printify_order_id).toBe("order_personalized");

    const orderCall = fetchMock.mock.calls.find(([u]) =>
      String(u).endsWith("/orders.json")
    );
    expect(orderCall).toBeTruthy();
    const orderBody = JSON.parse(String(orderCall![1]?.body));
    expect(orderBody.line_items[0]).toMatchObject({
      product_id: "prod_personalized",
      variant_id: 17887,
      quantity: 1,
    });
  });

  it("detects submit enabled flag", () => {
    expect(printifySubmitEnabled({ PRINTIFY_SUBMIT_ENABLED: "1" })).toBe(true);
    expect(printifySubmitEnabled({ PRINTIFY_SUBMIT_ENABLED: "0" })).toBe(false);
  });
});
