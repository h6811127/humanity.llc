import { describe, expect, it } from "vitest";

import type { PrintifyArtworkConfig } from "../src/print/printify-artwork-config";
import { createPrintifyEphemeralProduct } from "../src/print/printify-upload";

const ARTWORK: PrintifyArtworkConfig = {
  blueprint_id: 384,
  print_provider_id: 1,
  variant_id: 17887,
  placeholder_position: "back",
  image_x: 0.25,
  image_y: 0.75,
  image_scale: 1.5,
  image_angle: 90,
};

describe("createPrintifyEphemeralProduct payload", () => {
  it("POSTs shop-scoped print_areas that bind the upload to the artwork placement", async () => {
    let captured: { url: string; headers: HeadersInit | undefined; body: unknown } | null = null;

    const result = await createPrintifyEphemeralProduct(
      { PRINTIFY_API_TOKEN: "  shop-token  " },
      99,
      {
        title: "Humanity QR po_testPreMintAuto919",
        artwork: ARTWORK,
        upload_id: "img_qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      },
      async (url, init) => {
        captured = {
          url: String(url),
          headers: init?.headers,
          body: init?.body ? JSON.parse(String(init.body)) : null,
        };
        return new Response(JSON.stringify({ id: "prod_ephemeral_1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    );

    expect(result).toEqual({ ok: true, product_id: "prod_ephemeral_1" });
    expect(captured?.url).toBe("https://api.printify.com/v1/shops/99/products.json");
    expect(captured?.headers).toMatchObject({
      Authorization: "Bearer shop-token",
      "Content-Type": "application/json",
    });
    expect(captured?.body).toEqual({
      title: "Humanity QR po_testPreMintAuto919",
      description: "Ephemeral Humanity fulfillment product — not for public sale.",
      blueprint_id: 384,
      print_provider_id: 1,
      variants: [{ id: 17887, price: 100, is_enabled: true }],
      print_areas: [
        {
          variant_ids: [17887],
          placeholders: [
            {
              position: "back",
              images: [
                {
                  id: "img_qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
                  x: 0.25,
                  y: 0.75,
                  scale: 1.5,
                  angle: 90,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
