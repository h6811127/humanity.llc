import { describe, expect, it } from "vitest";

import type { PrintifyArtworkConfig } from "../src/print/printify-artwork-config";
import {
  createPrintifyEphemeralProduct,
  uploadPrintifyArtworkSvg,
} from "../src/print/printify-upload";

const ARTWORK: PrintifyArtworkConfig = {
  blueprint_id: 12,
  print_provider_id: 34,
  variant_id: 56,
  placeholder_position: "front",
  image_x: 0.5,
  image_y: 0.5,
  image_scale: 1,
  image_angle: 0,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("uploadPrintifyArtworkSvg", () => {
  it("fails closed when Printify credentials are missing", async () => {
    const result = await uploadPrintifyArtworkSvg(
      { PRINTIFY_API_TOKEN: "   " },
      { file_name: "qr.svg", svg: "<svg/>" },
      async () => {
        throw new Error("fetch should not run");
      }
    );
    expect(result).toEqual({
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: "Printify credentials are not configured.",
    });
  });

  it("maps HTTP errors and truncates the Printify body", async () => {
    const long = "x".repeat(400);
    const result = await uploadPrintifyArtworkSvg(
      { PRINTIFY_API_TOKEN: "token" },
      { file_name: "qr.svg", svg: "<svg/>" },
      async () => new Response(long, { status: 502 })
    );
    expect(result).toMatchObject({
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      status: 502,
    });
    if (result.ok) throw new Error("expected failure");
    expect(result.message).toHaveLength(240);
  });

  it("rejects non-JSON success bodies and missing image ids", async () => {
    const nonJson = await uploadPrintifyArtworkSvg(
      { PRINTIFY_API_TOKEN: "token" },
      { file_name: "qr.svg", svg: "<svg/>" },
      async () => new Response("<html>nope</html>", { status: 200 })
    );
    expect(nonJson).toMatchObject({
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: "Printify upload returned non-JSON response.",
      status: 200,
    });

    const missingId = await uploadPrintifyArtworkSvg(
      { PRINTIFY_API_TOKEN: "token" },
      { file_name: "qr.svg", svg: "<svg/>" },
      async () => jsonResponse(200, { id: "   " })
    );
    expect(missingId).toMatchObject({
      ok: false,
      code: "PRINTIFY_UPLOAD_FAILED",
      message: "Printify upload response missing image id.",
    });
  });

  it("returns the trimmed upload id on success", async () => {
    const result = await uploadPrintifyArtworkSvg(
      { PRINTIFY_API_TOKEN: " token " },
      { file_name: "qr.svg", svg: "<svg/>" },
      async () => jsonResponse(200, { id: "  img_123  " })
    );
    expect(result).toEqual({ ok: true, upload_id: "img_123" });
  });
});

describe("createPrintifyEphemeralProduct", () => {
  it("fails closed when Printify credentials are missing", async () => {
    const result = await createPrintifyEphemeralProduct(
      {},
      99,
      { title: "QR", artwork: ARTWORK, upload_id: "img_1" },
      async () => {
        throw new Error("fetch should not run");
      }
    );
    expect(result).toEqual({
      ok: false,
      code: "PRINTIFY_PRODUCT_CREATE_FAILED",
      message: "Printify credentials are not configured.",
    });
  });

  it("maps create failures, non-JSON, and missing product ids", async () => {
    const httpErr = await createPrintifyEphemeralProduct(
      { PRINTIFY_API_TOKEN: "token" },
      99,
      { title: "QR", artwork: ARTWORK, upload_id: "img_1" },
      async () => new Response("", { status: 422 })
    );
    expect(httpErr).toMatchObject({
      ok: false,
      code: "PRINTIFY_PRODUCT_CREATE_FAILED",
      message: "Printify product create returned 422.",
      status: 422,
    });

    const nonJson = await createPrintifyEphemeralProduct(
      { PRINTIFY_API_TOKEN: "token" },
      99,
      { title: "QR", artwork: ARTWORK, upload_id: "img_1" },
      async () => new Response("not-json", { status: 200 })
    );
    expect(nonJson).toMatchObject({
      ok: false,
      message: "Printify product create returned non-JSON response.",
    });

    const missing = await createPrintifyEphemeralProduct(
      { PRINTIFY_API_TOKEN: "token" },
      99,
      { title: "QR", artwork: ARTWORK, upload_id: "img_1" },
      async () => jsonResponse(200, { id: 12 })
    );
    expect(missing).toMatchObject({
      ok: false,
      message: "Printify product create response missing product id.",
    });
  });

  it("returns the trimmed product id on success", async () => {
    const result = await createPrintifyEphemeralProduct(
      { PRINTIFY_API_TOKEN: "token" },
      99,
      { title: "QR", artwork: ARTWORK, upload_id: "img_1" },
      async () => jsonResponse(200, { id: "  prod_9  " })
    );
    expect(result).toEqual({ ok: true, product_id: "prod_9" });
  });
});
