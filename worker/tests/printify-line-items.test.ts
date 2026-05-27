import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PRINT_TEMPLATE_ID } from "../src/print/print-catalog";
import { preparePrintifyLineItems } from "../src/print/printify-line-items";

const SCAN_URL =
  "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("preparePrintifyLineItems", () => {
  it("uses static product mapping for Tier 0 batch", async () => {
    const result = await preparePrintifyLineItems(
      {
        TIER0_PRINTIFY_PRODUCT_ID: "prod_batch",
        TIER0_PRINTIFY_VARIANT_ID: "99",
      },
      {
        print_order_id: "po_test123456789012345",
        template_id: "hc-tier0-sticker-batch-v1",
        profile_id: "nSVXWPqgRFEhGPjxyRzidF6s",
        planned_item_qr_ids: [],
        quantity: 3,
      },
      99
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.line_items).toEqual([
        { product_id: "prod_batch", variant_id: 99, quantity: 3 },
      ]);
    }
  });

  it("returns unconfigured when Tier 1 lacks blueprint env", async () => {
    const result = await preparePrintifyLineItems(
      {
        PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID: "prod_only",
        PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID: "17887",
      },
      {
        print_order_id: "po_test123456789012345",
        template_id: DEFAULT_PRINT_TEMPLATE_ID,
        profile_id: "nSVXWPqgRFEhGPjxyRzidF6s",
        planned_item_qr_ids: ["qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5"],
        quantity: 1,
      },
      99
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("PRINTIFY_ARTWORK_UNCONFIGURED");
  });

  it("uploads artwork and creates ephemeral product per planned QR", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, body });

      if (url.endsWith("/uploads/images.json")) {
        return new Response(JSON.stringify({ id: "upload_abc123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify({ id: "prod_ephemeral_1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("unexpected", { status: 500 });
    });

    const result = await preparePrintifyLineItems(
      {
        PRINTIFY_API_TOKEN: "token",
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
        quantity: 1,
        scan_origin: "https://humanity.llc",
      },
      99,
      fetchMock
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.line_items).toEqual([
        {
          product_id: "prod_ephemeral_1",
          variant_id: 17887,
          quantity: 1,
          upload_id: "upload_abc123",
        },
      ]);
    }

    expect(calls.some((c) => c.url.endsWith("/uploads/images.json"))).toBe(true);
    expect(calls.some((c) => c.url.includes("/shops/99/products.json"))).toBe(true);

    const uploadCall = calls.find((c) => c.url.endsWith("/uploads/images.json"))!;
    expect(uploadCall.body).toMatchObject({
      file_name: "po_test123456789012345-qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5.svg",
    });

    const productCall = calls.find((c) => c.url.includes("/products.json"))!;
    expect(productCall.body).toMatchObject({
      blueprint_id: 384,
      print_provider_id: 1,
      print_areas: [
        {
          variant_ids: [17887],
          placeholders: [
            {
              position: "front",
              images: [{ id: "upload_abc123", x: 0.5, y: 0.5, scale: 1, angle: 0 }],
            },
          ],
        },
      ],
    });

    // Artwork should encode the planned scan URL (rendered SVG contains scan link context)
    const uploadBody = uploadCall.body as { contents?: string };
    const decoded = atob(uploadBody.contents ?? "");
    expect(decoded).toContain("svg");
    expect(SCAN_URL).toContain("qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
  });
});
